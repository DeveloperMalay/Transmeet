import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware, requireZoomAuth } from '../middleware/auth.middleware.js';
import { ZoomService } from '../services/zoom.service.js';
import { OpenAIService } from '../services/openai.service.js';
import { ExportService, ExportFormat } from '../services/export.service.js';
import { NotificationService } from '../services/notification.service.js';
import prisma from '../utils/prisma.js';

const meetingRoutes = new Hono();

/**
 * GET /meetings
 * Get user's meetings with pagination and filtering
 */
meetingRoutes.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const search = c.req.query('search') || '';
    const fromDate = c.req.query('from');
    const toDate = c.req.query('to');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { userId };

    if (search) {
      where.OR = [
        { topic: { contains: search, mode: 'insensitive' } },
        { transcriptText: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (fromDate) {
      where.startTime = { ...where.startTime, gte: new Date(fromDate) };
    }

    if (toDate) {
      where.startTime = { ...where.startTime, lte: new Date(toDate) };
    }

    // Get meetings with pagination
    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        select: {
          id: true,
          zoomMeetingId: true,
          topic: true,
          startTime: true,
          endTime: true,
          duration: true,
          recordingUrl: true,
          summary: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              tasks: true,
              exports: true,
            },
          },
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
      prisma.meeting.count({ where }),
    ]);

    return c.json({
      success: true,
      meetings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error: any) {
    console.error('Get meetings error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch meetings' });
  }
});

/**
 * GET /meetings/:id
 * Get meeting details by ID
 */
meetingRoutes.get('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        exports: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    // Parse JSON fields
    const parsedMeeting = {
      ...meeting,
      transcript: meeting.transcript ? JSON.parse(meeting.transcript as string) : null,
      speakers: meeting.speakers ? JSON.parse(meeting.speakers as string) : null,
      bulletPoints: meeting.bulletPoints ? JSON.parse(meeting.bulletPoints as string) : null,
    };

    return c.json({
      success: true,
      meeting: parsedMeeting,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Get meeting error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch meeting' });
  }
});

/**
 * POST /meetings/sync
 * Sync meetings from Zoom
 */
meetingRoutes.post('/sync', authMiddleware, requireZoomAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { from, to } = await c.req.json().catch(() => ({}));

    const zoomService = ZoomService.getInstance();
    const result = await zoomService.syncMeetings(userId, from, to);

    return c.json({
      success: true,
      message: `Synced ${result.synced} meetings`,
      synced: result.synced,
      errors: result.errors,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Sync meetings error:', error);
    throw new HTTPException(500, { message: 'Failed to sync meetings' });
  }
});

/**
 * POST /meetings/:id/analyze
 * Analyze meeting transcript with OpenAI
 */
meetingRoutes.post('/:id/analyze', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.transcriptText) {
      throw new HTTPException(400, { message: 'No transcript available for analysis' });
    }

    // Analyze transcript with OpenAI
    const openaiService = OpenAIService.getInstance();
    const analysis = await openaiService.analyzeTranscript(
      meeting.transcriptText,
      meeting.topic,
      meeting.speakers ? JSON.parse(meeting.speakers as string) : undefined,
      meeting.duration || undefined
    );

    // Update meeting with AI analysis
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        summary: analysis.summary.summary,
        bulletPoints: JSON.stringify(analysis.summary.keyPoints),
        aiNotes: JSON.stringify({
          sentiment: analysis.summary.sentiment,
          topics: analysis.summary.topics,
          effectiveness: analysis.meetingEffectiveness,
          recommendations: analysis.recommendations,
          speakerInsights: analysis.speakerInsights,
        }),
      },
    });

    // Create action items as tasks
    if (analysis.summary.actionItems && analysis.summary.actionItems.length > 0) {
      const tasks = analysis.summary.actionItems.map(item => ({
        description: item.task,
        owner: item.owner || null,
        deadline: item.deadline ? new Date(item.deadline) : null,
        priority: item.priority.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        meetingId,
        status: 'PENDING' as const,
      }));

      await prisma.task.createMany({
        data: tasks,
      });
    }

    return c.json({
      success: true,
      message: 'Meeting analyzed successfully',
      analysis: {
        summary: analysis.summary,
        speakerInsights: analysis.speakerInsights,
        effectiveness: analysis.meetingEffectiveness,
        recommendations: analysis.recommendations,
      },
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Analyze meeting error:', error);
    throw new HTTPException(500, { message: 'Failed to analyze meeting' });
  }
});

/**
 * POST /meetings/:id/export
 * Export meeting in specified format
 */
meetingRoutes.post('/:id/export', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');
    const { format, includeSummary, includeTranscript, includeActionItems, includeSpeakerInsights } = await c.req.json();

    // Verify meeting belongs to user
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: { id: true },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    // Validate format
    const validFormats: ExportFormat[] = ['PDF', 'MARKDOWN', 'WORD', 'JSON'];
    if (!validFormats.includes(format)) {
      throw new HTTPException(400, { message: 'Invalid export format' });
    }

    const exportService = ExportService.getInstance();
    const fileName = await exportService.exportMeeting(meetingId, {
      format,
      includeSummary: includeSummary ?? true,
      includeTranscript: includeTranscript ?? false,
      includeActionItems: includeActionItems ?? true,
      includeSpeakerInsights: includeSpeakerInsights ?? false,
    });

    return c.json({
      success: true,
      message: 'Export created successfully',
      fileName,
      downloadUrl: `/api/meetings/${meetingId}/exports/${fileName}`,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Export meeting error:', error);
    throw new HTTPException(500, { message: 'Failed to export meeting' });
  }
});

/**
 * GET /meetings/:id/exports/:fileName
 * Download exported file
 */
meetingRoutes.get('/:id/exports/:fileName', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');
    const fileName = c.req.param('fileName');

    // Verify export belongs to user's meeting
    const exportRecord = await prisma.export.findFirst({
      where: {
        fileName,
        meeting: {
          id: meetingId,
          userId,
        },
      },
    });

    if (!exportRecord) {
      throw new HTTPException(404, { message: 'Export not found' });
    }

    const exportService = ExportService.getInstance();
    const filePath = exportService.getExportFilePath(fileName);

    // Check if file exists
    try {
      await Bun.file(filePath).exists();
    } catch {
      throw new HTTPException(404, { message: 'Export file not found' });
    }

    // Set appropriate headers
    const extension = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'md':
        contentType = 'text/markdown';
        break;
      case 'json':
        contentType = 'application/json';
        break;
    }

    c.header('Content-Type', contentType);
    c.header('Content-Disposition', `attachment; filename="${fileName}"`);

    return c.body(await Bun.file(filePath).arrayBuffer());
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Download export error:', error);
    throw new HTTPException(500, { message: 'Failed to download export' });
  }
});

/**
 * GET /meetings/:id/tasks
 * Get meeting action items/tasks
 */
meetingRoutes.get('/:id/tasks', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');

    // Verify meeting belongs to user
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: { id: true },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    const tasks = await prisma.task.findMany({
      where: { meetingId },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({
      success: true,
      tasks,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Get meeting tasks error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch meeting tasks' });
  }
});

/**
 * POST /meetings/:id/tasks
 * Create new task for meeting
 */
meetingRoutes.post('/:id/tasks', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');
    const { description, owner, deadline, priority } = await c.req.json();

    if (!description) {
      throw new HTTPException(400, { message: 'Task description is required' });
    }

    // Verify meeting belongs to user
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: { id: true },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    const task = await prisma.task.create({
      data: {
        description,
        owner: owner || null,
        deadline: deadline ? new Date(deadline) : null,
        priority: priority || 'MEDIUM',
        meetingId,
        status: 'PENDING',
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return c.json({
      success: true,
      message: 'Task created successfully',
      task,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Create task error:', error);
    throw new HTTPException(500, { message: 'Failed to create task' });
  }
});

/**
 * PUT /meetings/:id/tasks/:taskId
 * Update task
 */
meetingRoutes.put('/:id/tasks/:taskId', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');
    const taskId = c.req.param('taskId');
    const updates = await c.req.json();

    // Verify task belongs to user's meeting
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        meeting: {
          id: meetingId,
          userId,
        },
      },
    });

    if (!task) {
      throw new HTTPException(404, { message: 'Task not found' });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        description: updates.description,
        owner: updates.owner,
        deadline: updates.deadline ? new Date(updates.deadline) : null,
        priority: updates.priority,
        status: updates.status,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return c.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Update task error:', error);
    throw new HTTPException(500, { message: 'Failed to update task' });
  }
});

/**
 * DELETE /meetings/:id/tasks/:taskId
 * Delete task
 */
meetingRoutes.delete('/:id/tasks/:taskId', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');
    const taskId = c.req.param('taskId');

    // Verify task belongs to user's meeting
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        meeting: {
          id: meetingId,
          userId,
        },
      },
    });

    if (!task) {
      throw new HTTPException(404, { message: 'Task not found' });
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return c.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Delete task error:', error);
    throw new HTTPException(500, { message: 'Failed to delete task' });
  }
});

/**
 * POST /meetings/:id/share
 * Share meeting summary via email/Slack
 */
meetingRoutes.post('/:id/share', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');
    const { emails, slackChannel, includeActionItems } = await c.req.json();

    // Verify meeting belongs to user
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: { id: true, summary: true },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.summary) {
      throw new HTTPException(400, { message: 'Meeting summary not available. Please analyze the meeting first.' });
    }

    const notificationService = NotificationService.getInstance();
    await notificationService.sendMeetingSummaryNotification({
      meetingId,
      recipients: emails || [],
      includeActionItems: includeActionItems ?? true,
      slackChannel,
    });

    return c.json({
      success: true,
      message: 'Meeting summary shared successfully',
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Share meeting error:', error);
    throw new HTTPException(500, { message: 'Failed to share meeting' });
  }
});

/**
 * DELETE /meetings/:id
 * Delete meeting
 */
meetingRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');

    // Verify meeting belongs to user
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: { id: true },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    // Delete meeting (cascading deletes will handle tasks and exports)
    await prisma.meeting.delete({
      where: { id: meetingId },
    });

    return c.json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Delete meeting error:', error);
    throw new HTTPException(500, { message: 'Failed to delete meeting' });
  }
});

export default meetingRoutes;