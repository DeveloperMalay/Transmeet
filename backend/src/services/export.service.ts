import PDFDocument from 'pdfkit';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import fs from 'fs/promises';
import path from 'path';
import { HTTPException } from 'hono/http-exception';
import prisma from '../utils/prisma.js';

export type ExportFormat = 'PDF' | 'MARKDOWN' | 'WORD' | 'JSON';

export interface ExportOptions {
  includeSummary?: boolean;
  includeTranscript?: boolean;
  includeActionItems?: boolean;
  includeSpeakerInsights?: boolean;
  format: ExportFormat;
}

export interface MeetingExportData {
  meeting: {
    id: string;
    topic: string;
    startTime: Date;
    endTime: Date | null;
    duration: number | null;
  };
  summary?: string;
  transcript?: string;
  actionItems?: Array<{
    task: string;
    owner?: string;
    deadline?: string;
    priority: string;
  }>;
  speakerInsights?: Array<{
    name: string;
    talkTime: number;
    keyContributions: string[];
  }>;
}

export class ExportService {
  private static instance: ExportService;
  private static readonly EXPORTS_DIR = path.join(process.cwd(), 'exports');

  private constructor() {
    this.ensureExportsDirectory();
  }

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  private async ensureExportsDirectory(): Promise<void> {
    try {
      await fs.mkdir(ExportService.EXPORTS_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create exports directory:', error);
    }
  }

  /**
   * Get meeting data for export
   */
  private async getMeetingExportData(meetingId: string): Promise<MeetingExportData> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        tasks: {
          select: {
            description: true,
            owner: true,
            deadline: true,
            priority: true,
          },
        },
      },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    const data: MeetingExportData = {
      meeting: {
        id: meeting.id,
        topic: meeting.topic,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        duration: meeting.duration,
      },
    };

    if (meeting.summary) {
      data.summary = meeting.summary;
    }

    if (meeting.transcriptText) {
      data.transcript = meeting.transcriptText;
    }

    if (meeting.tasks && meeting.tasks.length > 0) {
      data.actionItems = meeting.tasks.map(task => ({
        task: task.description,
        owner: task.owner || undefined,
        deadline: task.deadline?.toISOString().split('T')[0],
        priority: task.priority,
      }));
    }

    if (meeting.speakers) {
      try {
        const speakers = JSON.parse(meeting.speakers as string);
        data.speakerInsights = speakers;
      } catch (error) {
        console.error('Failed to parse speaker data:', error);
      }
    }

    return data;
  }

  /**
   * Export meeting as PDF
   */
  async exportAsPDF(meetingId: string, options: ExportOptions): Promise<string> {
    const data = await this.getMeetingExportData(meetingId);
    const fileName = `meeting-${data.meeting.id}-${Date.now()}.pdf`;
    const filePath = path.join(ExportService.EXPORTS_DIR, fileName);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // Title
      doc.fontSize(20).font('Helvetica-Bold').text(data.meeting.topic, { align: 'center' });
      doc.moveDown();

      // Meeting Info
      doc.fontSize(14).font('Helvetica-Bold').text('Meeting Information');
      doc.fontSize(12).font('Helvetica')
        .text(`Date: ${data.meeting.startTime.toLocaleDateString()}`)
        .text(`Time: ${data.meeting.startTime.toLocaleTimeString()}`)
        .text(`Duration: ${data.meeting.duration || 'Unknown'} minutes`);
      doc.moveDown();

      // Summary
      if (options.includeSummary && data.summary) {
        doc.fontSize(14).font('Helvetica-Bold').text('Summary');
        doc.fontSize(12).font('Helvetica').text(data.summary, { align: 'justify' });
        doc.moveDown();
      }

      // Action Items
      if (options.includeActionItems && data.actionItems) {
        doc.fontSize(14).font('Helvetica-Bold').text('Action Items');
        data.actionItems.forEach((item, index) => {
          doc.fontSize(12).font('Helvetica')
            .text(`${index + 1}. ${item.task}`)
            .text(`   Owner: ${item.owner || 'Unassigned'}`)
            .text(`   Priority: ${item.priority}`)
            .text(`   Deadline: ${item.deadline || 'No deadline'}`);
          doc.moveDown(0.5);
        });
        doc.moveDown();
      }

      // Speaker Insights
      if (options.includeSpeakerInsights && data.speakerInsights) {
        doc.fontSize(14).font('Helvetica-Bold').text('Speaker Insights');
        data.speakerInsights.forEach(speaker => {
          doc.fontSize(12).font('Helvetica-Bold').text(`${speaker.name} (${speaker.talkTime.toFixed(1)}% talk time)`);
          if (speaker.keyContributions && speaker.keyContributions.length > 0) {
            doc.fontSize(11).font('Helvetica').text('Key Contributions:');
            speaker.keyContributions.forEach(contribution => {
              doc.text(`• ${contribution}`);
            });
          }
          doc.moveDown(0.5);
        });
        doc.moveDown();
      }

      // Transcript
      if (options.includeTranscript && data.transcript) {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('Full Transcript');
        doc.fontSize(10).font('Helvetica').text(data.transcript, { align: 'justify' });
      }

      doc.end();

      stream.on('finish', () => {
        resolve(fileName);
      });

      stream.on('error', (error) => {
        reject(new HTTPException(500, { message: `PDF generation failed: ${error.message}` }));
      });
    });
  }

  /**
   * Export meeting as Word document
   */
  async exportAsWord(meetingId: string, options: ExportOptions): Promise<string> {
    const data = await this.getMeetingExportData(meetingId);
    const fileName = `meeting-${data.meeting.id}-${Date.now()}.docx`;
    const filePath = path.join(ExportService.EXPORTS_DIR, fileName);

    const doc = new Document({
      sections: [
        {
          children: [
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: data.meeting.topic,
                  bold: true,
                  size: 32,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            // Meeting Info
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Meeting Information',
                  bold: true,
                  size: 24,
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun(`Date: ${data.meeting.startTime.toLocaleDateString()}`),
              ],
            }),

            new Paragraph({
              children: [
                new TextRun(`Time: ${data.meeting.startTime.toLocaleTimeString()}`),
              ],
            }),

            new Paragraph({
              children: [
                new TextRun(`Duration: ${data.meeting.duration || 'Unknown'} minutes`),
              ],
              spacing: { after: 200 },
            }),
          ],
        },
      ],
    });

    // Add summary if requested
    if (options.includeSummary && data.summary) {
      doc.addSection({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Summary',
                bold: true,
                size: 24,
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun(data.summary)],
            spacing: { after: 200 },
          }),
        ],
      });
    }

    // Add action items if requested
    if (options.includeActionItems && data.actionItems) {
      const actionItemsParagraphs = [
        new Paragraph({
          children: [
            new TextRun({
              text: 'Action Items',
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 200 },
        }),
      ];

      data.actionItems.forEach((item, index) => {
        actionItemsParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. ${item.task}`,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun(`Owner: ${item.owner || 'Unassigned'}`)],
          }),
          new Paragraph({
            children: [new TextRun(`Priority: ${item.priority}`)],
          }),
          new Paragraph({
            children: [new TextRun(`Deadline: ${item.deadline || 'No deadline'}`)],
            spacing: { after: 200 },
          })
        );
      });

      doc.addSection({ children: actionItemsParagraphs });
    }

    // Add transcript if requested
    if (options.includeTranscript && data.transcript) {
      doc.addSection({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Full Transcript',
                bold: true,
                size: 24,
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun(data.transcript)],
          }),
        ],
      });
    }

    // Save document
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(filePath, buffer);

    return fileName;
  }

  /**
   * Export meeting as Markdown
   */
  async exportAsMarkdown(meetingId: string, options: ExportOptions): Promise<string> {
    const data = await this.getMeetingExportData(meetingId);
    const fileName = `meeting-${data.meeting.id}-${Date.now()}.md`;
    const filePath = path.join(ExportService.EXPORTS_DIR, fileName);

    let markdown = '';

    // Title
    markdown += `# ${data.meeting.topic}\n\n`;

    // Meeting Info
    markdown += '## Meeting Information\n\n';
    markdown += `- **Date:** ${data.meeting.startTime.toLocaleDateString()}\n`;
    markdown += `- **Time:** ${data.meeting.startTime.toLocaleTimeString()}\n`;
    markdown += `- **Duration:** ${data.meeting.duration || 'Unknown'} minutes\n\n`;

    // Summary
    if (options.includeSummary && data.summary) {
      markdown += '## Summary\n\n';
      markdown += `${data.summary}\n\n`;
    }

    // Action Items
    if (options.includeActionItems && data.actionItems) {
      markdown += '## Action Items\n\n';
      data.actionItems.forEach((item, index) => {
        markdown += `### ${index + 1}. ${item.task}\n\n`;
        markdown += `- **Owner:** ${item.owner || 'Unassigned'}\n`;
        markdown += `- **Priority:** ${item.priority}\n`;
        markdown += `- **Deadline:** ${item.deadline || 'No deadline'}\n\n`;
      });
    }

    // Speaker Insights
    if (options.includeSpeakerInsights && data.speakerInsights) {
      markdown += '## Speaker Insights\n\n';
      data.speakerInsights.forEach(speaker => {
        markdown += `### ${speaker.name} (${speaker.talkTime.toFixed(1)}% talk time)\n\n`;
        if (speaker.keyContributions && speaker.keyContributions.length > 0) {
          markdown += '**Key Contributions:**\n';
          speaker.keyContributions.forEach(contribution => {
            markdown += `- ${contribution}\n`;
          });
          markdown += '\n';
        }
      });
    }

    // Transcript
    if (options.includeTranscript && data.transcript) {
      markdown += '## Full Transcript\n\n';
      markdown += '```\n';
      markdown += data.transcript;
      markdown += '\n```\n';
    }

    await fs.writeFile(filePath, markdown, 'utf-8');
    return fileName;
  }

  /**
   * Export meeting as JSON
   */
  async exportAsJSON(meetingId: string, options: ExportOptions): Promise<string> {
    const data = await this.getMeetingExportData(meetingId);
    const fileName = `meeting-${data.meeting.id}-${Date.now()}.json`;
    const filePath = path.join(ExportService.EXPORTS_DIR, fileName);

    // Filter data based on options
    const exportData: any = {
      meeting: data.meeting,
    };

    if (options.includeSummary && data.summary) {
      exportData.summary = data.summary;
    }

    if (options.includeActionItems && data.actionItems) {
      exportData.actionItems = data.actionItems;
    }

    if (options.includeSpeakerInsights && data.speakerInsights) {
      exportData.speakerInsights = data.speakerInsights;
    }

    if (options.includeTranscript && data.transcript) {
      exportData.transcript = data.transcript;
    }

    exportData.exportedAt = new Date().toISOString();

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    return fileName;
  }

  /**
   * Main export function
   */
  async exportMeeting(meetingId: string, options: ExportOptions): Promise<string> {
    try {
      let fileName: string;

      switch (options.format) {
        case 'PDF':
          fileName = await this.exportAsPDF(meetingId, options);
          break;
        case 'WORD':
          fileName = await this.exportAsWord(meetingId, options);
          break;
        case 'MARKDOWN':
          fileName = await this.exportAsMarkdown(meetingId, options);
          break;
        case 'JSON':
          fileName = await this.exportAsJSON(meetingId, options);
          break;
        default:
          throw new HTTPException(400, { message: 'Unsupported export format' });
      }

      // Save export record to database
      await prisma.export.create({
        data: {
          format: options.format,
          fileName,
          fileUrl: `/exports/${fileName}`,
          meetingId,
        },
      });

      return fileName;
    } catch (error: any) {
      console.error('Export error:', error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: `Export failed: ${error.message}` });
    }
  }

  /**
   * Get export file path
   */
  getExportFilePath(fileName: string): string {
    return path.join(ExportService.EXPORTS_DIR, fileName);
  }

  /**
   * Delete export file
   */
  async deleteExport(exportId: string): Promise<void> {
    const exportRecord = await prisma.export.findUnique({
      where: { id: exportId },
    });

    if (!exportRecord) {
      throw new HTTPException(404, { message: 'Export not found' });
    }

    const filePath = this.getExportFilePath(exportRecord.fileName);
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete export file:', error);
    }

    await prisma.export.delete({
      where: { id: exportId },
    });
  }
}