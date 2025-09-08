#!/usr/bin/env tsx

/**
 * Test script for recording import functionality
 * Usage: tsx src/scripts/test-recording-import.ts <meetingId>
 */

import axios from 'axios';
import { config } from 'dotenv';

config();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

async function testRecordingImport(meetingId: string) {
  console.log('🧪 Testing Recording Import Functionality');
  console.log('=========================================\n');

  if (!AUTH_TOKEN) {
    console.error('❌ Error: Please set TEST_AUTH_TOKEN environment variable');
    console.log('You can get a token by logging in through the API');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    // Step 1: Get meeting details
    console.log('📋 Step 1: Fetching meeting details...');
    const meetingResponse = await axios.get(
      `${API_URL}/api/meetings/${meetingId}`,
      { headers }
    );
    
    const meeting = meetingResponse.data.meeting;
    console.log(`✅ Meeting found: ${meeting.topic}`);
    console.log(`   - Zoom Meeting ID: ${meeting.zoomMeetingId}`);
    console.log(`   - Date: ${new Date(meeting.startTime).toLocaleString()}\n`);

    // Step 2: Check for available recordings from Zoom
    console.log('🎥 Step 2: Checking for recordings on Zoom...');
    const recordingCheckResponse = await axios.get(
      `${API_URL}/api/meetings/${meetingId}/recording`,
      { headers }
    );
    
    const zoomRecordings = recordingCheckResponse.data.recording;
    if (!zoomRecordings.recording_files || zoomRecordings.recording_files.length === 0) {
      console.log('⚠️  No recordings available on Zoom for this meeting');
      process.exit(0);
    }

    console.log(`✅ Found ${zoomRecordings.recording_files.length} recording file(s):`);
    zoomRecordings.recording_files.forEach((file: any) => {
      console.log(`   - ${file.file_type}: ${(file.file_size / 1024 / 1024).toFixed(2)} MB`);
    });
    console.log();

    // Step 3: Import recordings
    console.log('💾 Step 3: Importing recordings to local storage...');
    const importResponse = await axios.post(
      `${API_URL}/api/meetings/${meetingId}/import-recording`,
      {
        recordingTypes: ['MP4', 'M4A', 'TRANSCRIPT', 'CHAT', 'CC'],
      },
      { headers }
    );

    const importResult = importResponse.data;
    console.log(`✅ Import completed: ${importResult.message}`);
    
    if (importResult.imported && importResult.imported.length > 0) {
      console.log('\n📦 Imported recordings:');
      importResult.imported.forEach((rec: any) => {
        console.log(`   - ${rec.fileType}: ${rec.fileUrl}`);
      });
      console.log(`\n   Total size: ${(importResult.totalSize / 1024 / 1024).toFixed(2)} MB`);
    }

    if (importResult.errors && importResult.errors.length > 0) {
      console.log('\n⚠️  Import errors:');
      importResult.errors.forEach((err: any) => {
        console.log(`   - ${err.fileType}: ${err.error}`);
      });
    }

    // Step 4: Verify stored recordings
    console.log('\n🔍 Step 4: Verifying stored recordings...');
    const storedResponse = await axios.get(
      `${API_URL}/api/meetings/${meetingId}/recordings`,
      { headers }
    );

    const storedRecordings = storedResponse.data.recordings;
    console.log(`✅ Found ${storedRecordings.length} stored recording(s):`);
    storedRecordings.forEach((rec: any) => {
      console.log(`   - ${rec.fileType}: ${rec.fileUrl} (${(parseInt(rec.fileSize) / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Step 5: Test streaming a recording
    if (storedRecordings.length > 0) {
      console.log('\n🎬 Step 5: Testing recording playback...');
      const mp4Recording = storedRecordings.find((r: any) => r.fileType === 'MP4');
      
      if (mp4Recording) {
        const fileName = mp4Recording.fileUrl.split('/').pop();
        const streamUrl = `${API_URL}/api/recordings/${fileName}`;
        
        try {
          const streamResponse = await axios.head(streamUrl, { headers });
          console.log(`✅ Recording is accessible: ${streamUrl}`);
          console.log(`   - Content-Type: ${streamResponse.headers['content-type']}`);
          console.log(`   - Content-Length: ${(parseInt(streamResponse.headers['content-length']) / 1024 / 1024).toFixed(2)} MB`);
        } catch (error) {
          console.log(`⚠️  Could not access recording: ${streamUrl}`);
        }
      }
    }

    console.log('\n✨ Recording import test completed successfully!');

  } catch (error: any) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || error.response.data.error}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Main execution
const meetingId = process.argv[2];

if (!meetingId) {
  console.error('❌ Error: Please provide a meeting ID');
  console.log('Usage: tsx src/scripts/test-recording-import.ts <meetingId>');
  console.log('Example: tsx src/scripts/test-recording-import.ts 550e8400-e29b-41d4-a716-446655440000');
  process.exit(1);
}

testRecordingImport(meetingId).catch(console.error);