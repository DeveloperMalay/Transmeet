import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { OpenAIService } from '../services/openai.service.js';
import prisma from '../utils/prisma.js';

const transcriptRoutes = new Hono();

/**
 * GET /transcripts/meeting/:meetingId
 * Get transcript for a specific meeting
 */
transcriptRoutes.get('/meeting/:meetingId', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('meetingId');

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: {
        id: true,
        topic: true,
        startTime: true,
        transcript: true,
        transcriptText: true,
        speakers: true,
      },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.transcript && !meeting.transcriptText) {
      throw new HTTPException(404, { message: 'Transcript not available for this meeting' });
    }

    return c.json({
      success: true,
      transcript: {
        meetingId: meeting.id,
        topic: meeting.topic,
        startTime: meeting.startTime,
        rawTranscript: meeting.transcript ? JSON.parse(meeting.transcript as string) : null,
        text: meeting.transcriptText,
        speakers: meeting.speakers ? JSON.parse(meeting.speakers as string) : null,
      },
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Get transcript error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch transcript' });
  }
});

/**
 * POST /transcripts/meeting/:meetingId/analyze
 * Analyze transcript for specific insights
 */
transcriptRoutes.post('/meeting/:meetingId/analyze', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('meetingId');
    const { analysisType, customPrompt } = await c.req.json();

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: {
        id: true,
        topic: true,
        transcriptText: true,
        speakers: true,
        duration: true,
      },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.transcriptText) {
      throw new HTTPException(404, { message: 'Transcript not available for this meeting' });
    }

    const openaiService = OpenAIService.getInstance();
    let result: any;

    switch (analysisType) {
      case 'summary':
        result = await openaiService.generateMeetingSummary(meeting.transcriptText, meeting.topic);
        break;

      case 'speaker-insights':
        const speakers = meeting.speakers ? JSON.parse(meeting.speakers as string) : undefined;
        result = await openaiService.analyzeSpeakerInsights(meeting.transcriptText, speakers);
        break;

      case 'effectiveness':
        result = await openaiService.analyzeMeetingEffectiveness(meeting.transcriptText, meeting.duration || 60);
        break;

      case 'custom':
        if (!customPrompt) {
          throw new HTTPException(400, { message: 'Custom prompt is required for custom analysis' });
        }
        result = await openaiService.extractInformation(meeting.transcriptText, customPrompt);
        break;

      case 'complete':
        const speakers2 = meeting.speakers ? JSON.parse(meeting.speakers as string) : undefined;
        result = await openaiService.analyzeTranscript(
          meeting.transcriptText,
          meeting.topic,
          speakers2,
          meeting.duration || undefined
        );
        break;

      default:
        throw new HTTPException(400, { message: 'Invalid analysis type' });
    }

    return c.json({
      success: true,
      analysisType,
      result,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Analyze transcript error:', error);
    throw new HTTPException(500, { message: 'Failed to analyze transcript' });
  }
});

/**
 * POST /transcripts/meeting/:meetingId/search
 * Search within meeting transcript
 */
transcriptRoutes.post('/meeting/:meetingId/search', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('meetingId');
    const { query, caseSensitive = false } = await c.req.json();

    if (!query || query.trim().length === 0) {
      throw new HTTPException(400, { message: 'Search query is required' });
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: {
        id: true,
        topic: true,
        transcriptText: true,
        transcript: true,
        speakers: true,
      },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.transcriptText) {
      throw new HTTPException(404, { message: 'Transcript not available for this meeting' });
    }

    // Perform search
    const searchRegex = new RegExp(query, caseSensitive ? 'g' : 'gi');
    const matches: Array<{
      text: string;
      index: number;
      context: string;
      speaker?: string;
      timestamp?: string;
    }> = [];

    // Search in plain text
    const text = meeting.transcriptText;
    let match;
    while ((match = searchRegex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 100);
      const end = Math.min(text.length, match.index + match[0].length + 100);
      const context = text.substring(start, end);

      matches.push({
        text: match[0],
        index: match.index,
        context: context,
      });
    }

    // If we have structured transcript, try to find speaker and timestamp info
    if (meeting.transcript) {
      try {
        const structuredTranscript = JSON.parse(meeting.transcript as string);
        // Enhance matches with speaker information if available
        // This would depend on the structure of your transcript data
      } catch (error) {
        console.error('Failed to parse structured transcript:', error);
      }
    }

    return c.json({
      success: true,
      query,
      matchCount: matches.length,
      matches: matches.slice(0, 50), // Limit to first 50 matches
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Search transcript error:', error);
    throw new HTTPException(500, { message: 'Failed to search transcript' });
  }
});

/**
 * POST /transcripts/meeting/:meetingId/extract
 * Extract specific information from transcript using AI
 */
transcriptRoutes.post('/meeting/:meetingId/extract', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('meetingId');
    const { query } = await c.req.json();

    if (!query || query.trim().length === 0) {
      throw new HTTPException(400, { message: 'Query is required' });
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: {
        id: true,
        topic: true,
        transcriptText: true,
      },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.transcriptText) {
      throw new HTTPException(404, { message: 'Transcript not available for this meeting' });
    }

    const openaiService = OpenAIService.getInstance();
    const result = await openaiService.extractInformation(meeting.transcriptText, query);

    return c.json({
      success: true,
      query,
      result,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Extract information error:', error);
    throw new HTTPException(500, { message: 'Failed to extract information' });
  }
});

/**
 * POST /transcripts/meeting/:meetingId/personalized-notes
 * Generate personalized meeting notes
 */
transcriptRoutes.post('/meeting/:meetingId/personalized-notes', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('meetingId');
    const { role, interests } = await c.req.json();

    if (!role) {
      throw new HTTPException(400, { message: 'User role is required' });
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: {
        id: true,
        topic: true,
        transcriptText: true,
      },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.transcriptText) {
      throw new HTTPException(404, { message: 'Transcript not available for this meeting' });
    }

    const openaiService = OpenAIService.getInstance();
    const personalizedNotes = await openaiService.generatePersonalizedNotes(
      meeting.transcriptText,
      role,
      interests || []
    );

    return c.json({
      success: true,
      personalizedNotes,
      role,
      interests: interests || [],
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Generate personalized notes error:', error);
    throw new HTTPException(500, { message: 'Failed to generate personalized notes' });
  }
});

/**
 * GET /transcripts/meeting/:meetingId/speakers
 * Get speaker analysis for a meeting
 */
transcriptRoutes.get('/meeting/:meetingId/speakers', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('meetingId');

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: {
        id: true,
        topic: true,
        speakers: true,
        transcriptText: true,
      },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.speakers && !meeting.transcriptText) {
      throw new HTTPException(404, { message: 'Speaker information not available for this meeting' });
    }

    let speakers = null;
    if (meeting.speakers) {
      try {
        speakers = JSON.parse(meeting.speakers as string);
      } catch (error) {
        console.error('Failed to parse speaker data:', error);
      }
    }

    // If we don't have speakers but have transcript, analyze it
    if (!speakers && meeting.transcriptText) {
      const openaiService = OpenAIService.getInstance();
      speakers = await openaiService.analyzeSpeakerInsights(meeting.transcriptText);
    }

    return c.json({
      success: true,
      meetingId: meeting.id,
      topic: meeting.topic,
      speakers: speakers || [],
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Get speakers error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch speaker information' });
  }
});

/**
 * POST /transcripts/meeting/:meetingId/sentiment
 * Analyze sentiment of the meeting
 */
transcriptRoutes.post('/meeting/:meetingId/sentiment', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const meetingId = c.req.param('meetingId');

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      select: {
        id: true,
        topic: true,
        transcriptText: true,
      },
    });

    if (!meeting) {
      throw new HTTPException(404, { message: 'Meeting not found' });
    }

    if (!meeting.transcriptText) {
      throw new HTTPException(404, { message: 'Transcript not available for this meeting' });
    }

    const openaiService = OpenAIService.getInstance();
    const summary = await openaiService.generateMeetingSummary(meeting.transcriptText, meeting.topic);

    return c.json({
      success: true,
      sentiment: summary.sentiment,
      topics: summary.topics,
      overallTone: summary.sentiment === 'positive' 
        ? 'The meeting had a positive and productive tone'
        : summary.sentiment === 'negative'
        ? 'The meeting had some tension or negative discussions'
        : 'The meeting maintained a neutral, professional tone',
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Analyze sentiment error:', error);
    throw new HTTPException(500, { message: 'Failed to analyze meeting sentiment' });
  }
});

/**
 * GET /transcripts/search
 * Search across all user's transcripts
 */
transcriptRoutes.get('/search', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const query = c.req.query('q');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const offset = parseInt(c.req.query('offset') || '0');

    if (!query || query.trim().length === 0) {
      throw new HTTPException(400, { message: 'Search query is required' });
    }

    // Search across all meetings with transcripts
    const meetings = await prisma.meeting.findMany({
      where: {
        userId,
        OR: [
          { transcriptText: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
          { topic: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        topic: true,
        startTime: true,
        duration: true,
        summary: true,
        transcriptText: true,
      },
      orderBy: { startTime: 'desc' },
      take: limit,
      skip: offset,
    });

    // Prepare search results with highlighted excerpts
    const searchResults = meetings.map(meeting => {
      const searchRegex = new RegExp(query, 'gi');
      let excerpt = '';
      
      if (meeting.transcriptText) {
        const match = searchRegex.exec(meeting.transcriptText);
        if (match) {
          const start = Math.max(0, match.index - 100);
          const end = Math.min(meeting.transcriptText.length, match.index + match[0].length + 100);
          excerpt = meeting.transcriptText.substring(start, end);
        }
      }

      return {
        meetingId: meeting.id,
        topic: meeting.topic,
        startTime: meeting.startTime,
        duration: meeting.duration,
        hasSummary: !!meeting.summary,
        excerpt,
      };
    });

    return c.json({
      success: true,
      query,
      results: searchResults,
      total: searchResults.length,
      hasMore: searchResults.length === limit,
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Search all transcripts error:', error);
    throw new HTTPException(500, { message: 'Failed to search transcripts' });
  }
});

export default transcriptRoutes;