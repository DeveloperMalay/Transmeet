import { WebClient } from '@slack/web-api';
import nodemailer from 'nodemailer';
import config from '../config/index.js';
import prisma from '../utils/prisma.js';
import { HTTPException } from 'hono/http-exception';

export interface SlackNotification {
  channel: string;
  text: string;
  blocks?: any[];
  thread_ts?: string;
}

export interface EmailNotification {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
}

export interface MeetingSummaryNotification {
  meetingId: string;
  recipients: string[];
  includeActionItems?: boolean;
  slackChannel?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private slackClient: WebClient;
  private emailTransporter: nodemailer.Transporter;

  private constructor() {
    // Initialize Slack client
    this.slackClient = new WebClient(config.slack.botToken);

    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(notification: SlackNotification): Promise<string | null> {
    try {
      const result = await this.slackClient.chat.postMessage({
        channel: notification.channel,
        text: notification.text,
        blocks: notification.blocks,
        thread_ts: notification.thread_ts,
      });

      return result.ts as string;
    } catch (error: any) {
      console.error('Slack notification error:', error);
      throw new HTTPException(500, { message: `Failed to send Slack notification: ${error.message}` });
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification: EmailNotification): Promise<void> {
    try {
      const mailOptions = {
        from: config.email.from,
        to: Array.isArray(notification.to) ? notification.to.join(', ') : notification.to,
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
        attachments: notification.attachments,
      };

      await this.emailTransporter.sendMail(mailOptions);
    } catch (error: any) {
      console.error('Email notification error:', error);
      throw new HTTPException(500, { message: `Failed to send email notification: ${error.message}` });
    }
  }

  /**
   * Send meeting summary notification
   */
  async sendMeetingSummaryNotification(params: MeetingSummaryNotification): Promise<void> {
    try {
      // Get meeting data
      const meeting = await prisma.meeting.findUnique({
        where: { id: params.meetingId },
        include: {
          tasks: params.includeActionItems ? {
            select: {
              description: true,
              owner: true,
              deadline: true,
              priority: true,
              status: true,
            },
          } : false,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!meeting) {
        throw new HTTPException(404, { message: 'Meeting not found' });
      }

      const meetingDate = meeting.startTime.toLocaleDateString();
      const meetingTime = meeting.startTime.toLocaleTimeString();

      // Prepare email content
      let emailHtml = `
        <h2>Meeting Summary: ${meeting.topic}</h2>
        <p><strong>Date:</strong> ${meetingDate}<br>
        <strong>Time:</strong> ${meetingTime}<br>
        <strong>Duration:</strong> ${meeting.duration || 'Unknown'} minutes</p>
      `;

      let slackText = `📝 *Meeting Summary*: ${meeting.topic}\n*Date:* ${meetingDate}\n*Duration:* ${meeting.duration || 'Unknown'} minutes`;

      // Add summary if available
      if (meeting.summary) {
        emailHtml += `<h3>Summary</h3><p>${meeting.summary.replace(/\n/g, '<br>')}</p>`;
        slackText += `\n\n*Summary:*\n${meeting.summary}`;
      }

      // Add action items if requested and available
      if (params.includeActionItems && meeting.tasks && meeting.tasks.length > 0) {
        emailHtml += '<h3>Action Items</h3><ul>';
        slackText += '\n\n*Action Items:*';
        
        meeting.tasks.forEach((task, index) => {
          const priorityEmoji = this.getPriorityEmoji(task.priority);
          const statusEmoji = this.getStatusEmoji(task.status);
          
          emailHtml += `
            <li>
              <strong>${task.description}</strong><br>
              Owner: ${task.owner || 'Unassigned'}<br>
              Priority: ${task.priority}<br>
              Status: ${task.status}<br>
              ${task.deadline ? `Deadline: ${task.deadline.toLocaleDateString()}` : ''}
            </li>
          `;
          
          slackText += `\n${index + 1}. ${statusEmoji} ${priorityEmoji} ${task.description}`;
          slackText += `\n   Owner: ${task.owner || 'Unassigned'} | Priority: ${task.priority}`;
          if (task.deadline) {
            slackText += ` | Deadline: ${task.deadline.toLocaleDateString()}`;
          }
        });
        
        emailHtml += '</ul>';
      }

      emailHtml += `
        <br>
        <p><small>Generated by Transmeet - Meeting Intelligence Platform</small></p>
      `;

      // Send email notifications
      if (params.recipients.length > 0) {
        await this.sendEmailNotification({
          to: params.recipients,
          subject: `Meeting Summary: ${meeting.topic} - ${meetingDate}`,
          html: emailHtml,
          text: this.htmlToText(emailHtml),
        });
      }

      // Send Slack notification if channel specified
      if (params.slackChannel) {
        const slackBlocks = this.createMeetingSummarySlackBlocks(meeting, meeting.tasks);
        
        await this.sendSlackNotification({
          channel: params.slackChannel,
          text: slackText,
          blocks: slackBlocks,
        });
      }

    } catch (error: any) {
      console.error('Meeting summary notification error:', error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: `Failed to send meeting summary: ${error.message}` });
    }
  }

  /**
   * Send action item reminders
   */
  async sendActionItemReminders(taskIds: string[]): Promise<void> {
    try {
      const tasks = await prisma.task.findMany({
        where: {
          id: { in: taskIds },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: {
          meeting: {
            select: {
              topic: true,
              startTime: true,
            },
          },
          assignedTo: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      for (const task of tasks) {
        // Send email reminder
        if (task.assignedTo?.email) {
          const daysUntilDeadline = task.deadline 
            ? Math.ceil((task.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

          const urgencyText = daysUntilDeadline !== null 
            ? daysUntilDeadline <= 0 
              ? '🚨 OVERDUE' 
              : daysUntilDeadline <= 2 
                ? '⚠️ DUE SOON' 
                : ''
            : '';

          const emailHtml = `
            <h2>Action Item Reminder ${urgencyText}</h2>
            <p>Hi ${task.assignedTo.name || 'there'},</p>
            <p>This is a reminder about your action item from the meeting:</p>
            
            <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
              <h3>${task.meeting.topic}</h3>
              <p><strong>Meeting Date:</strong> ${task.meeting.startTime.toLocaleDateString()}</p>
              <p><strong>Action Item:</strong> ${task.description}</p>
              <p><strong>Priority:</strong> ${task.priority}</p>
              <p><strong>Status:</strong> ${task.status}</p>
              ${task.deadline ? `<p><strong>Deadline:</strong> ${task.deadline.toLocaleDateString()}</p>` : ''}
              ${daysUntilDeadline !== null ? `<p><strong>Days until deadline:</strong> ${daysUntilDeadline}</p>` : ''}
            </div>
            
            <p>Please update the status of this task or reach out if you need assistance.</p>
            <p><small>Generated by Transmeet - Meeting Intelligence Platform</small></p>
          `;

          await this.sendEmailNotification({
            to: task.assignedTo.email,
            subject: `Action Item Reminder: ${task.description.substring(0, 50)}...`,
            html: emailHtml,
            text: this.htmlToText(emailHtml),
          });

          // Update task to mark reminder sent
          await prisma.task.update({
            where: { id: task.id },
            data: { emailSent: true },
          });
        }
      }
    } catch (error: any) {
      console.error('Action item reminder error:', error);
      throw new HTTPException(500, { message: `Failed to send action item reminders: ${error.message}` });
    }
  }

  /**
   * Send new meeting notification
   */
  async sendNewMeetingNotification(meetingId: string, slackChannel?: string): Promise<void> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!meeting) {
        throw new HTTPException(404, { message: 'Meeting not found' });
      }

      const slackText = `🎥 *New Meeting Processed*: ${meeting.topic}\n*Date:* ${meeting.startTime.toLocaleDateString()}\n*Host:* ${meeting.user.name || meeting.user.email}`;

      if (slackChannel) {
        await this.sendSlackNotification({
          channel: slackChannel,
          text: slackText,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: slackText,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'View Summary',
                  },
                  url: `${config.frontend.url}/meetings/${meetingId}`,
                },
              ],
            },
          ],
        });
      }
    } catch (error: any) {
      console.error('New meeting notification error:', error);
      throw new HTTPException(500, { message: `Failed to send new meeting notification: ${error.message}` });
    }
  }

  /**
   * Create Slack blocks for meeting summary
   */
  private createMeetingSummarySlackBlocks(meeting: any, tasks?: any[]): any[] {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📝 ${meeting.topic}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Date:* ${meeting.startTime.toLocaleDateString()}\n*Duration:* ${meeting.duration || 'Unknown'} minutes`,
        },
      },
    ];

    if (meeting.summary) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary:*\n${meeting.summary.substring(0, 1000)}${meeting.summary.length > 1000 ? '...' : ''}`,
        },
      });
    }

    if (tasks && tasks.length > 0) {
      const actionItemsText = tasks.slice(0, 5).map((task, index) => {
        const statusEmoji = this.getStatusEmoji(task.status);
        const priorityEmoji = this.getPriorityEmoji(task.priority);
        return `${index + 1}. ${statusEmoji} ${priorityEmoji} ${task.description}`;
      }).join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Action Items:*\n${actionItemsText}${tasks.length > 5 ? `\n... and ${tasks.length - 5} more` : ''}`,
        },
      });
    }

    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Full Summary',
          },
          url: `${config.frontend.url}/meetings/${meeting.id}`,
          style: 'primary',
        },
      ],
    });

    return blocks;
  }

  /**
   * Get priority emoji
   */
  private getPriorityEmoji(priority: string): string {
    switch (priority) {
      case 'URGENT': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'COMPLETED': return '✅';
      case 'IN_PROGRESS': return '🔄';
      case 'PENDING': return '⏳';
      case 'CANCELLED': return '❌';
      default: return '❓';
    }
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.emailTransporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }

  /**
   * Test Slack configuration
   */
  async testSlackConfiguration(): Promise<boolean> {
    try {
      await this.slackClient.auth.test();
      return true;
    } catch (error) {
      console.error('Slack configuration test failed:', error);
      return false;
    }
  }
}