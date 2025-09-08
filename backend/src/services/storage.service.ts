import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';

export interface StorageOptions {
  bucket?: string;
  provider?: 'local' | 's3' | 'gcs';
}

export interface RecordingMetadata {
  meetingId: string;
  fileType: string;
  fileSize: number;
  duration?: number;
  recordingType: string;
  downloadUrl?: string;
  playUrl?: string;
}

export class StorageService {
  private static instance: StorageService;
  private uploadDir: string;
  private recordingsDir: string;

  private constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.recordingsDir = path.join(this.uploadDir, 'recordings');
    this.initializeDirectories();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.recordingsDir, { recursive: true });
      console.log('Storage directories initialized');
    } catch (error) {
      console.error('Failed to create storage directories:', error);
    }
  }

  /**
   * Generate unique filename for recording
   */
  private generateFileName(meetingId: string, fileType: string): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(`${meetingId}-${timestamp}`).digest('hex').substring(0, 8);
    const extension = this.getFileExtension(fileType);
    return `recording-${meetingId}-${hash}.${extension}`;
  }

  /**
   * Get file extension based on file type
   */
  private getFileExtension(fileType: string): string {
    const typeMap: { [key: string]: string } = {
      'MP4': 'mp4',
      'M4A': 'm4a',
      'CHAT': 'txt',
      'TRANSCRIPT': 'vtt',
      'CC': 'vtt',
      'CSV': 'csv',
    };
    return typeMap[fileType.toUpperCase()] || 'bin';
  }

  /**
   * Store recording file locally
   */
  async storeRecordingLocally(
    buffer: Buffer,
    metadata: RecordingMetadata
  ): Promise<{ filePath: string; fileUrl: string }> {
    const fileName = this.generateFileName(metadata.meetingId, metadata.fileType);
    const filePath = path.join(this.recordingsDir, fileName);
    
    try {
      await fs.writeFile(filePath, buffer);
      
      const fileUrl = `/api/recordings/${fileName}`;
      
      return {
        filePath,
        fileUrl,
      };
    } catch (error) {
      console.error('Failed to store recording locally:', error);
      throw new Error('Failed to store recording file');
    }
  }

  /**
   * Store recording metadata in database
   */
  async storeRecordingMetadata(
    meetingId: string,
    fileUrl: string,
    metadata: RecordingMetadata & { recordingStart?: Date; recordingEnd?: Date }
  ): Promise<any> {
    try {
      const recording = await prisma.recording.create({
        data: {
          meetingId,
          fileType: metadata.fileType,
          fileSize: BigInt(metadata.fileSize),
          fileUrl,
          downloadUrl: metadata.downloadUrl || null,
          playUrl: metadata.playUrl || null,
          recordingType: metadata.recordingType,
          duration: metadata.duration || null,
          recordingStart: metadata.recordingStart || null,
          recordingEnd: metadata.recordingEnd || null,
        },
      });
      return recording;
    } catch (error) {
      console.error('Failed to store recording metadata:', error);
      throw error;
    }
  }

  /**
   * Get recording file path
   */
  getRecordingFilePath(fileName: string): string {
    return path.join(this.recordingsDir, fileName);
  }

  /**
   * Check if recording exists
   */
  async recordingExists(fileName: string): Promise<boolean> {
    try {
      const filePath = this.getRecordingFilePath(fileName);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete recording file
   */
  async deleteRecording(fileName: string): Promise<void> {
    try {
      const filePath = this.getRecordingFilePath(fileName);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  }

  /**
   * Get recording file size
   */
  async getRecordingSize(fileName: string): Promise<number> {
    try {
      const filePath = this.getRecordingFilePath(fileName);
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      console.error('Failed to get recording size:', error);
      return 0;
    }
  }

  /**
   * Clean up old recordings (older than 30 days)
   */
  async cleanupOldRecordings(daysToKeep: number = 30): Promise<number> {
    try {
      const files = await fs.readdir(this.recordingsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.recordingsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old recordings:', error);
      return 0;
    }
  }
}