#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
  console.log('📊 Verifying Seed Data\n');
  console.log('=' .repeat(50));

  // Count records in each table
  const userCount = await prisma.user.count();
  const meetingCount = await prisma.meeting.count();
  const recordingCount = await prisma.recording.count();
  const taskCount = await prisma.task.count();

  console.log('\n📈 Database Statistics:');
  console.log(`   Users: ${userCount}`);
  console.log(`   Meetings: ${meetingCount}`);
  console.log(`   Recordings: ${recordingCount}`);
  console.log(`   Tasks: ${taskCount}`);

  // Sample user data
  console.log('\n👤 Sample Users:');
  const users = await prisma.user.findMany({
    take: 3,
    select: {
      email: true,
      name: true,
      zoomConnected: true,
      _count: {
        select: {
          meetings: true,
        },
      },
    },
  });

  users.forEach(user => {
    console.log(`   - ${user.name} (${user.email})`);
    console.log(`     Zoom Connected: ${user.zoomConnected ? '✅' : '❌'}`);
    console.log(`     Meetings: ${user._count.meetings}`);
  });

  // Sample meeting data
  console.log('\n📅 Recent Meetings:');
  const meetings = await prisma.meeting.findMany({
    take: 5,
    orderBy: { startTime: 'desc' },
    select: {
      topic: true,
      startTime: true,
      duration: true,
      _count: {
        select: {
          recordings: true,
          tasks: true,
        },
      },
    },
  });

  meetings.forEach(meeting => {
    console.log(`   - ${meeting.topic}`);
    console.log(`     Date: ${meeting.startTime.toLocaleDateString()}`);
    console.log(`     Duration: ${meeting.duration} minutes`);
    console.log(`     Recordings: ${meeting._count.recordings}, Tasks: ${meeting._count.tasks}`);
  });

  // Sample recording data
  console.log('\n🎥 Sample Recordings:');
  const recordings = await prisma.recording.findMany({
    take: 5,
    select: {
      fileType: true,
      fileSize: true,
      recordingType: true,
      meeting: {
        select: {
          topic: true,
        },
      },
    },
  });

  recordings.forEach(recording => {
    const sizeMB = (Number(recording.fileSize) / 1024 / 1024).toFixed(2);
    console.log(`   - ${recording.fileType} (${recording.recordingType})`);
    console.log(`     Size: ${sizeMB} MB`);
    console.log(`     Meeting: ${recording.meeting.topic}`);
  });

  // Task statistics
  console.log('\n📋 Task Statistics:');
  const taskStats = await prisma.task.groupBy({
    by: ['status'],
    _count: true,
  });

  taskStats.forEach(stat => {
    console.log(`   ${stat.status}: ${stat._count}`);
  });

  console.log('\n✅ Data verification complete!');
}

verifyData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());