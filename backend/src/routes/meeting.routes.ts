import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware, requireZoomAuth } from '../middleware/auth.middleware.js';
import { ZoomService } from '../services/zoom.service.js';
import { OpenAIService } from '../services/openai.service.js';
import { ExportService, ExportFormat } from '../services/export.service.js';
import { NotificationService } from '../services/notification.service.js';
import { StorageService } from '../services/storage.service.js';
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
 * GET /meetings/:id/recording
 * Fetch meeting recording from Zoom
 */
meetingRoutes.get('/:id/recording', authMiddleware, requireZoomAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');

    // Get meeting from database
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.zoomMeetingId) {
      throw new HTTPException(400, { message: 'No Zoom meeting ID available' });
    }

    // Fetch recording from Zoom
    const zoomService = ZoomService.getInstance();
    const recording = await zoomService.getMeetingRecordings(userId, meeting.zoomMeetingId);

    // Update meeting with recording URL if available
    if (recording.recording_files && recording.recording_files.length > 0) {
      const recordingFile = recording.recording_files.find(f => f.file_type === 'MP4') || recording.recording_files[0];
      
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          recordingUrl: recordingFile.play_url,
        },
      });
    }

    return c.json({
      success: true,
      recording,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Fetch recording error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch recording' });
  }
});

/**
 * POST /meetings/:id/import-recording
 * Import and store recording from Zoom to local storage
 */
meetingRoutes.post('/:id/import-recording', authMiddleware, requireZoomAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');
    const { recordingTypes = ['MP4'] } = await c.req.json().catch(() => ({}));

    // Get meeting from database
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      include: {
        recordings: true,
      },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.zoomMeetingId) {
      throw new HTTPException(400, { message: 'No Zoom meeting ID available' });
    }

    // Fetch recording metadata from Zoom
    const zoomService = ZoomService.getInstance();
    const zoomRecording = await zoomService.getMeetingRecordings(userId, meeting.zoomMeetingId);

    if (!zoomRecording.recording_files || zoomRecording.recording_files.length === 0) {
      throw new HTTPException(404, { message: 'No recordings available for this meeting' });
    }

    const storageService = StorageService.getInstance();
    const importedRecordings = [];
    const errors = [];

    // Process each recording file
    for (const recordingFile of zoomRecording.recording_files) {
      // Skip if not in requested types
      if (!recordingTypes.includes(recordingFile.file_type)) {
        continue;
      }

      // Check if already imported
      const existingRecording = meeting.recordings.find(
        r => r.downloadUrl === recordingFile.download_url
      );

      if (existingRecording) {
        console.log(`Recording already imported: ${recordingFile.file_type}`);
        continue;
      }

      try {
        console.log(`Importing recording: ${recordingFile.file_type} (${recordingFile.file_size} bytes)`);

        // Download recording from Zoom
        const recordingBuffer = await zoomService.downloadRecordingFile(
          userId,
          recordingFile.download_url
        );

        // Store recording locally
        const { filePath, fileUrl } = await storageService.storeRecordingLocally(
          recordingBuffer,
          {
            meetingId: meeting.id,
            fileType: recordingFile.file_type,
            fileSize: recordingFile.file_size,
            recordingType: recordingFile.recording_type,
            downloadUrl: recordingFile.download_url,
            playUrl: recordingFile.play_url,
          }
        );

        // Store metadata in database
        const recordingRecord = await storageService.storeRecordingMetadata(
          meeting.id,
          fileUrl,
          {
            meetingId: meeting.id,
            fileType: recordingFile.file_type,
            fileSize: recordingFile.file_size,
            recordingType: recordingFile.recording_type,
            downloadUrl: recordingFile.download_url,
            playUrl: recordingFile.play_url,
            recordingStart: new Date(recordingFile.recording_start),
            recordingEnd: new Date(recordingFile.recording_end),
          }
        );

        importedRecordings.push({
          id: recordingRecord.id,
          fileType: recordingFile.file_type,
          fileSize: recordingFile.file_size,
          fileUrl,
          recordingType: recordingFile.recording_type,
        });

        // Update meeting with primary recording URL if it's an MP4
        if (recordingFile.file_type === 'MP4' && !meeting.recordingUrl) {
          await prisma.meeting.update({
            where: { id: meetingId },
            data: {
              recordingUrl: fileUrl,
            },
          });
        }
      } catch (error: any) {
        errors.push({
          fileType: recordingFile.file_type,
          error: error.message,
        });
        console.error(`Failed to import recording ${recordingFile.file_type}:`, error);
      }
    }

    return c.json({
      success: true,
      message: `Imported ${importedRecordings.length} recordings`,
      imported: importedRecordings,
      errors: errors.length > 0 ? errors : undefined,
      totalSize: importedRecordings.reduce((sum, r) => sum + r.fileSize, 0),
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Import recording error:', error);
    throw new HTTPException(500, { message: 'Failed to import recording' });
  }
});

/**
 * GET /meetings/:id/recordings
 * Get all recordings for a meeting
 */
meetingRoutes.get('/:id/recordings', authMiddleware, async (c) => {
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

    const recordings = await prisma.recording.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({
      success: true,
      recordings: recordings.map(r => ({
        ...r,
        fileSize: r.fileSize.toString(), // Convert BigInt to string for JSON
      })),
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Get recordings error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch recordings' });
  }
});

/**
 * DELETE /meetings/:id/recordings/:recordingId
 * Delete a specific recording
 */
meetingRoutes.delete('/:id/recordings/:recordingId', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');
    const recordingId = c.req.param('recordingId');

    // Verify recording belongs to user's meeting
    const recording = await prisma.recording.findFirst({
      where: {
        id: recordingId,
        meeting: {
          id: meetingId,
          userId,
        },
      },
    });

    if (!recording) {
      throw new HTTPException(404, { message: 'Recording not found' });
    }

    // Delete file from storage
    const storageService = StorageService.getInstance();
    const fileName = recording.fileUrl.split('/').pop();
    if (fileName) {
      await storageService.deleteRecording(fileName);
    }

    // Delete from database
    await prisma.recording.delete({
      where: { id: recordingId },
    });

    return c.json({
      success: true,
      message: 'Recording deleted successfully',
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Delete recording error:', error);
    throw new HTTPException(500, { message: 'Failed to delete recording' });
  }
});

/**
 * POST /meetings/batch-import-recordings
 * Import recordings for multiple meetings at once
 */
meetingRoutes.post('/batch-import-recordings', authMiddleware, requireZoomAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { 
      meetingIds = [], 
      recordingTypes = ['MP4'],
      fromDate,
      toDate,
      limit = 10
    } = await c.req.json().catch(() => ({}));

    let meetings;
    
    if (meetingIds.length > 0) {
      // Import specific meetings
      meetings = await prisma.meeting.findMany({
        where: {
          id: { in: meetingIds },
          userId,
        },
        select: {
          id: true,
          zoomMeetingId: true,
          topic: true,
        },
      });
    } else {
      // Import meetings within date range
      const whereClause: any = { userId };
      
      if (fromDate) {
        whereClause.startTime = { ...whereClause.startTime, gte: new Date(fromDate) };
      }
      
      if (toDate) {
        whereClause.startTime = { ...whereClause.startTime, lte: new Date(toDate) };
      }
      
      meetings = await prisma.meeting.findMany({
        where: whereClause,
        select: {
          id: true,
          zoomMeetingId: true,
          topic: true,
        },
        orderBy: { startTime: 'desc' },
        take: limit,
      });
    }

    if (meetings.length === 0) {
      throw new HTTPException(404, { message: 'No meetings found for import' });
    }

    const zoomService = ZoomService.getInstance();
    const storageService = StorageService.getInstance();
    const results = {
      successful: [] as any[],
      failed: [] as any[],
      totalImported: 0,
      totalSize: 0,
    };

    // Process each meeting
    for (const meeting of meetings) {
      if (!meeting.zoomMeetingId) {
        results.failed.push({
          meetingId: meeting.id,
          topic: meeting.topic,
          error: 'No Zoom meeting ID',
        });
        continue;
      }

      try {
        // Fetch recording metadata from Zoom
        const zoomRecording = await zoomService.getMeetingRecordings(userId, meeting.zoomMeetingId);

        if (!zoomRecording.recording_files || zoomRecording.recording_files.length === 0) {
          results.failed.push({
            meetingId: meeting.id,
            topic: meeting.topic,
            error: 'No recordings available',
          });
          continue;
        }

        const importedFiles = [];
        let meetingSize = 0;

        // Process each recording file
        for (const recordingFile of zoomRecording.recording_files) {
          if (!recordingTypes.includes(recordingFile.file_type)) {
            continue;
          }

          try {
            // Check if already imported
            const existingRecording = await prisma.recording.findFirst({
              where: {
                meetingId: meeting.id,
                downloadUrl: recordingFile.download_url,
              },
            });

            if (existingRecording) {
              continue;
            }

            // Download and store recording
            const recordingBuffer = await zoomService.downloadRecordingFile(
              userId,
              recordingFile.download_url
            );

            const { filePath, fileUrl } = await storageService.storeRecordingLocally(
              recordingBuffer,
              {
                meetingId: meeting.id,
                fileType: recordingFile.file_type,
                fileSize: recordingFile.file_size,
                recordingType: recordingFile.recording_type,
                downloadUrl: recordingFile.download_url,
                playUrl: recordingFile.play_url,
              }
            );

            await storageService.storeRecordingMetadata(
              meeting.id,
              fileUrl,
              {
                meetingId: meeting.id,
                fileType: recordingFile.file_type,
                fileSize: recordingFile.file_size,
                recordingType: recordingFile.recording_type,
                downloadUrl: recordingFile.download_url,
                playUrl: recordingFile.play_url,
                recordingStart: new Date(recordingFile.recording_start),
                recordingEnd: new Date(recordingFile.recording_end),
              }
            );

            importedFiles.push(recordingFile.file_type);
            meetingSize += recordingFile.file_size;

            // Update meeting with primary recording URL if it's an MP4
            if (recordingFile.file_type === 'MP4') {
              await prisma.meeting.update({
                where: { id: meeting.id },
                data: { recordingUrl: fileUrl },
              });
            }
          } catch (fileError: any) {
            console.error(`Failed to import ${recordingFile.file_type} for meeting ${meeting.id}:`, fileError);
          }
        }

        if (importedFiles.length > 0) {
          results.successful.push({
            meetingId: meeting.id,
            topic: meeting.topic,
            importedFiles,
            size: meetingSize,
          });
          results.totalImported += importedFiles.length;
          results.totalSize += meetingSize;
        } else {
          results.failed.push({
            meetingId: meeting.id,
            topic: meeting.topic,
            error: 'No files imported',
          });
        }
      } catch (error: any) {
        results.failed.push({
          meetingId: meeting.id,
          topic: meeting.topic,
          error: error.message,
        });
      }
    }

    return c.json({
      success: true,
      message: `Processed ${meetings.length} meetings`,
      results: {
        ...results,
        totalSizeMB: (results.totalSize / 1024 / 1024).toFixed(2),
      },
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Batch import error:', error);
    throw new HTTPException(500, { message: 'Failed to batch import recordings' });
  }
});

/**
 * GET /meetings/:id/transcript
 * Fetch meeting transcript from Zoom
 */
meetingRoutes.get('/:id/transcript', authMiddleware, requireZoomAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('id');

    // Get meeting from database
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.zoomMeetingId) {
      throw new HTTPException(400, { message: 'No Zoom meeting ID available' });
    }

    // Fetch transcript from Zoom
    const zoomService = ZoomService.getInstance();
    const transcript = await zoomService.getMeetingTranscript(userId, meeting.zoomMeetingId);

    if (transcript) {
      // Update meeting with transcript
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          transcript: JSON.stringify(transcript),
          transcriptText: transcript.transcript_text || '',
          speakers: transcript.speakers ? JSON.stringify(transcript.speakers) : null,
        },
      });

      return c.json({
        success: true,
        transcript,
      });
    } else {
      return c.json({
        success: false,
        message: 'No transcript available for this meeting',
      });
    }
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Fetch transcript error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch transcript' });
  }
});

/**
 * POST /meetings/upload-csv
 * Upload CSV file with meeting data for processing
 */
meetingRoutes.post('/upload-csv', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new HTTPException(400, { message: 'No file uploaded' });
    }

    if (!file.name.endsWith('.csv')) {
      throw new HTTPException(400, { message: 'Only CSV files are allowed' });
    }

    // Read CSV content
    const text = await file.text();
    console.log('CSV Content Length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));
    
    // Parse CSV with proper handling of quoted fields
    const parseCSVLine = (line: string): string[] => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add last field
      result.push(current.trim());
      return result;
    };
    
    const lines = text.split('\n').filter(line => line.trim());
    console.log('Number of lines:', lines.length);
    console.log('First line:', lines[0]?.substring(0, 100));
    
    if (lines.length < 2) {
      throw new HTTPException(400, { message: 'CSV file is empty or invalid' });
    }

    // Parse CSV headers
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    console.log('Parsed headers:', headers);
    
    // Required columns: topic, date, transcript
    const requiredColumns = ['topic', 'date', 'transcript'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('Missing columns:', missingColumns);
      console.log('Available headers:', headers);
      throw new HTTPException(400, { 
        message: `Missing required columns: ${missingColumns.join(', ')}. Required: topic, date, transcript` 
      });
    }

    const meetings = [];
    const errors = [];

    // Parse each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        if (!row.topic || !row.date || !row.transcript) {
          errors.push(`Row ${i + 1}: Missing required data`);
          continue;
        }

        // Create meeting record
        const meeting = await prisma.meeting.create({
          data: {
            topic: row.topic,
            startTime: new Date(row.date),
            endTime: row.end_date ? new Date(row.end_date) : new Date(row.date),
            duration: row.duration ? parseInt(row.duration) : null,
            transcriptText: row.transcript,
            zoomMeetingId: row.meeting_id || `csv_${Date.now()}_${i}`,
            userId,
            source: 'CSV_UPLOAD',
          },
        });

        meetings.push(meeting);

        // If OpenAI is configured, analyze the transcript
        if (process.env.OPENAI_API_KEY) {
          const openaiService = OpenAIService.getInstance();
          const analysis = await openaiService.analyzeTranscript(
            row.transcript,
            row.topic
          );

          // Update meeting with AI analysis
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: {
              summary: analysis.summary.summary,
              bulletPoints: JSON.stringify(analysis.summary.keyPoints),
              aiNotes: JSON.stringify({
                sentiment: analysis.summary.sentiment,
                topics: analysis.summary.topics,
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
              meetingId: meeting.id,
              status: 'PENDING' as const,
            }));

            await prisma.task.createMany({
              data: tasks,
            });
          }
        }
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return c.json({
      success: true,
      message: `Processed ${meetings.length} meetings from CSV`,
      processed: meetings.length,
      errors: errors.length > 0 ? errors : undefined,
      meetings: meetings.map(m => ({
        id: m.id,
        topic: m.topic,
        date: m.startTime,
      })),
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('CSV upload error:', error);
    throw new HTTPException(500, { message: 'Failed to process CSV file' });
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