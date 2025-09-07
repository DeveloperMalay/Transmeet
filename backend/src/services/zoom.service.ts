import axios, { AxiosInstance } from 'axios';
import config from '../config/index.js';
import prisma from '../utils/prisma.js';
import { HTTPException } from 'hono/http-exception';

export interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export interface ZoomUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  type: number;
  pmi: number;
  timezone: string;
  verified: number;
  dept: string;
  created_at: string;
  last_login_time: string;
  last_client_version: string;
  pic_url: string;
}

export interface ZoomMeeting {
  id: number;
  uuid: string;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  timezone: string;
  duration: number;
  total_size?: number;
  recording_count?: number;
  share_url?: string;
  recording_files?: ZoomRecordingFile[];
}

export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  play_url: string;
  download_url: string;
  status: string;
  recording_type: string;
}

export interface ZoomTranscript {
  meeting_id: string;
  transcript_start: string;
  transcript_end: string;
  transcript_text: string;
  speakers?: Array<{
    speaker_name: string;
    speaker_email?: string;
    transcript: string;
    start_time: string;
    end_time: string;
  }>;
}

export class ZoomService {
  private static instance: ZoomService;
  private axiosInstance: AxiosInstance;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.zoom.baseUrl,
      timeout: 30000,
    });
  }

  public static getInstance(): ZoomService {
    if (!ZoomService.instance) {
      ZoomService.instance = new ZoomService();
    }
    return ZoomService.instance;
  }

  /**
   * Get authorization URL for Zoom OAuth
   */
  static getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.zoom.clientId,
      redirect_uri: config.zoom.redirectUri,
    });

    return `${config.zoom.authUrl}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  static async exchangeCodeForTokens(code: string): Promise<ZoomTokenResponse> {
    try {
      console.log('Exchanging code for tokens with Zoom API...');
      console.log('Using redirect URI:', config.zoom.redirectUri);
      
      const response = await axios.post(
        `${config.zoom.authUrl}/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.zoom.redirectUri,
        }),
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.zoom.clientId}:${config.zoom.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      console.log('Token exchange successful');
      return response.data;
    } catch (error: any) {
      console.error('Zoom token exchange error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          redirect_uri: config.zoom.redirectUri
        }
      });
      
      const errorMessage = error.response?.data?.reason || error.response?.data?.error || 'Failed to exchange authorization code';
      throw new HTTPException(400, { message: errorMessage });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<ZoomTokenResponse> {
    try {
      const response = await axios.post(
        `${config.zoom.authUrl}/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.zoom.clientId}:${config.zoom.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Zoom token refresh error:', error.response?.data || error.message);
      throw new HTTPException(400, { message: 'Failed to refresh access token' });
    }
  }

  /**
   * Get valid access token for user
   */
  private async getValidAccessToken(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
      },
    });

    if (!user || !user.accessToken) {
      throw new HTTPException(401, { message: 'Zoom authentication required' });
    }

    // Check if token is expired
    if (user.tokenExpiresAt && user.tokenExpiresAt <= new Date()) {
      if (!user.refreshToken) {
        throw new HTTPException(401, { message: 'Zoom re-authentication required' });
      }

      // Refresh token
      const tokens = await ZoomService.refreshAccessToken(user.refreshToken);
      
      // Update user with new tokens
      await prisma.user.update({
        where: { id: userId },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });

      return tokens.access_token;
    }

    return user.accessToken;
  }

  /**
   * Get user information from Zoom
   */
  async getUser(userId: string): Promise<ZoomUser> {
    const accessToken = await this.getValidAccessToken(userId);
    
    try {
      const response = await this.axiosInstance.get('/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Zoom get user error:', error.response?.data || error.message);
      throw new HTTPException(500, { message: 'Failed to fetch user information' });
    }
  }

  /**
   * Get user's meetings
   */
  async getMeetings(
    userId: string,
    options: {
      from?: string;
      to?: string;
      page_size?: number;
      next_page_token?: string;
      type?: 'scheduled' | 'live' | 'upcoming';
    } = {}
  ): Promise<{ meetings: ZoomMeeting[]; next_page_token?: string }> {
    const accessToken = await this.getValidAccessToken(userId);
    
    try {
      const params = new URLSearchParams();
      if (options.from) params.append('from', options.from);
      if (options.to) params.append('to', options.to);
      if (options.page_size) params.append('page_size', options.page_size.toString());
      if (options.next_page_token) params.append('next_page_token', options.next_page_token);
      if (options.type) params.append('type', options.type);

      const response = await this.axiosInstance.get(`/users/me/meetings?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return {
        meetings: response.data.meetings,
        next_page_token: response.data.next_page_token,
      };
    } catch (error: any) {
      console.error('Zoom get meetings error:', error.response?.data || error.message);
      throw new HTTPException(500, { message: 'Failed to fetch meetings' });
    }
  }

  /**
   * Get meeting recordings
   */
  async getMeetingRecordings(userId: string, meetingId: string): Promise<ZoomMeeting> {
    const accessToken = await this.getValidAccessToken(userId);
    
    try {
      const response = await this.axiosInstance.get(`/meetings/${meetingId}/recordings`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new HTTPException(404, { message: 'Meeting recordings not found' });
      }
      console.error('Zoom get recordings error:', error.response?.data || error.message);
      throw new HTTPException(500, { message: 'Failed to fetch meeting recordings' });
    }
  }

  /**
   * Get meeting transcript
   */
  async getMeetingTranscript(userId: string, meetingId: string): Promise<ZoomTranscript | null> {
    const accessToken = await this.getValidAccessToken(userId);
    
    try {
      const response = await this.axiosInstance.get(`/meetings/${meetingId}/transcript`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Transcript not available
      }
      console.error('Zoom get transcript error:', error.response?.data || error.message);
      throw new HTTPException(500, { message: 'Failed to fetch meeting transcript' });
    }
  }

  /**
   * Download recording file
   */
  async downloadRecordingFile(userId: string, downloadUrl: string): Promise<Buffer> {
    const accessToken = await this.getValidAccessToken(userId);
    
    try {
      const response = await axios.get(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        responseType: 'arraybuffer',
        timeout: 300000, // 5 minutes for large files
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('Zoom download recording error:', error.response?.data || error.message);
      throw new HTTPException(500, { message: 'Failed to download recording file' });
    }
  }

  /**
   * Sync meetings from Zoom to database
   */
  async syncMeetings(userId: string, from?: string, to?: string): Promise<{ synced: number; errors: string[] }> {
    try {
      let syncedCount = 0;
      const errors: string[] = [];
      let nextPageToken: string | undefined;

      do {
        try {
          const result = await this.getMeetings(userId, {
            from,
            to,
            page_size: 300,
            next_page_token: nextPageToken,
          });

          for (const zoomMeeting of result.meetings) {
            try {
              // Check if meeting already exists
              const existingMeeting = await prisma.meeting.findUnique({
                where: { zoomMeetingId: zoomMeeting.id.toString() },
              });

              if (!existingMeeting) {
                // Get recordings for this meeting
                let recordingData: ZoomMeeting | null = null;
                try {
                  recordingData = await this.getMeetingRecordings(userId, zoomMeeting.id.toString());
                } catch (recordingError) {
                  console.log(`No recordings found for meeting ${zoomMeeting.id}`);
                }

                // Get transcript for this meeting
                let transcriptData: ZoomTranscript | null = null;
                try {
                  transcriptData = await this.getMeetingTranscript(userId, zoomMeeting.id.toString());
                } catch (transcriptError) {
                  console.log(`No transcript found for meeting ${zoomMeeting.id}`);
                }

                // Create meeting in database
                await prisma.meeting.create({
                  data: {
                    zoomMeetingId: zoomMeeting.id.toString(),
                    uuid: zoomMeeting.uuid,
                    topic: zoomMeeting.topic,
                    startTime: new Date(zoomMeeting.start_time),
                    endTime: zoomMeeting.duration 
                      ? new Date(new Date(zoomMeeting.start_time).getTime() + zoomMeeting.duration * 60000)
                      : null,
                    duration: zoomMeeting.duration,
                    recordingUrl: recordingData?.recording_files?.[0]?.play_url || null,
                    recordingPassword: recordingData?.share_url ? 'protected' : null,
                    transcript: transcriptData ? JSON.stringify(transcriptData) : null,
                    transcriptText: transcriptData?.transcript_text || null,
                    speakers: transcriptData?.speakers ? JSON.stringify(transcriptData.speakers) : null,
                    userId,
                  },
                });

                syncedCount++;
              }
            } catch (meetingError: any) {
              errors.push(`Failed to sync meeting ${zoomMeeting.id}: ${meetingError.message}`);
            }
          }

          nextPageToken = result.next_page_token;
        } catch (pageError: any) {
          errors.push(`Failed to fetch meetings page: ${pageError.message}`);
          break;
        }
      } while (nextPageToken);

      return { synced: syncedCount, errors };
    } catch (error: any) {
      throw new HTTPException(500, { message: `Failed to sync meetings: ${error.message}` });
    }
  }
}