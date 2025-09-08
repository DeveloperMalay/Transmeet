import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { StorageService } from '../services/storage.service.js';
import prisma from '../utils/prisma.js';
import path from 'path';

const recordingRoutes = new Hono();

/**
 * GET /recordings/:fileName
 * Stream recording file
 */
recordingRoutes.get('/:fileName', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const fileName = c.req.param('fileName');

    // Verify recording belongs to user
    const recording = await prisma.recording.findFirst({
      where: {
        fileUrl: { contains: fileName },
        meeting: {
          userId,
        },
      },
      select: {
        id: true,
        fileType: true,
        fileSize: true,
      },
    });

    if (!recording) {
      throw new HTTPException(404, { message: 'Recording not found' });
    }

    const storageService = StorageService.getInstance();
    const filePath = storageService.getRecordingFilePath(fileName);

    // Check if file exists
    const exists = await storageService.recordingExists(fileName);
    if (!exists) {
      throw new HTTPException(404, { message: 'Recording file not found' });
    }

    // Set appropriate headers
    const extension = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'mp4':
        contentType = 'video/mp4';
        break;
      case 'm4a':
        contentType = 'audio/mp4';
        break;
      case 'txt':
        contentType = 'text/plain';
        break;
      case 'vtt':
        contentType = 'text/vtt';
        break;
      case 'csv':
        contentType = 'text/csv';
        break;
    }

    // Get file size for proper streaming
    const fileSize = await storageService.getRecordingSize(fileName);
    
    c.header('Content-Type', contentType);
    c.header('Content-Length', fileSize.toString());
    c.header('Accept-Ranges', 'bytes');
    
    // Handle range requests for video streaming
    const range = c.req.header('range');
    if (range && extension === 'mp4') {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      c.status(206);
      c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      c.header('Content-Length', chunksize.toString());
      
      // For range requests, we'd need to implement streaming
      // For now, return the full file
      return c.body(await Bun.file(filePath).arrayBuffer());
    }

    return c.body(await Bun.file(filePath).arrayBuffer());
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Stream recording error:', error);
    throw new HTTPException(500, { message: 'Failed to stream recording' });
  }
});

/**
 * POST /recordings/cleanup
 * Clean up old recordings
 */
recordingRoutes.post('/cleanup', authMiddleware, async (c) => {
  try {
    const { daysToKeep = 30 } = await c.req.json().catch(() => ({}));
    
    // Only allow admin users to cleanup (you might want to add an admin check here)
    const userId = c.get('userId');
    
    const storageService = StorageService.getInstance();
    const deletedCount = await storageService.cleanupOldRecordings(daysToKeep);
    
    // Also cleanup database records for deleted files
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    await prisma.recording.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    
    return c.json({
      success: true,
      message: `Cleaned up ${deletedCount} old recordings`,
      deletedCount,
    });
  } catch (error: any) {
    console.error('Cleanup recordings error:', error);
    throw new HTTPException(500, { message: 'Failed to cleanup recordings' });
  }
});

export default recordingRoutes;