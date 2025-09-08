import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.recording.deleteMany();
  await prisma.task.deleteMany();
  await prisma.export.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Existing data cleaned\n');

  // Create test users
  console.log('👥 Creating users...');
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.doe@example.com',
        password: hashedPassword,
        name: 'John Doe',
        emailVerified: true,
        zoomEmail: 'john.doe@example.com',
        zoomConnected: true,
        zoomUserId: 'zoom_john_123',
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane.smith@example.com',
        password: hashedPassword,
        name: 'Jane Smith',
        emailVerified: true,
        zoomEmail: 'jane.smith@example.com',
        zoomConnected: true,
        zoomUserId: 'zoom_jane_456',
      },
    }),
    prisma.user.create({
      data: {
        email: 'demo@transmeet.com',
        password: hashedPassword,
        name: 'Demo User',
        emailVerified: true,
        zoomEmail: 'demo@transmeet.com',
        zoomConnected: false,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users\n`);

  // Meeting topics and descriptions
  const meetingTopics = [
    {
      topic: 'Q4 2024 Planning Session',
      transcript: `Welcome everyone to our Q4 planning session. Today we'll be discussing our roadmap for the final quarter.
      
      John: Let's start with our product priorities. We need to focus on the mobile app launch.
      
      Jane: I agree. The mobile app is critical. We should allocate 60% of our engineering resources to this.
      
      Mike: What about the API improvements we discussed last week?
      
      John: Good point. We can run that in parallel with a smaller team. Let me share my screen to show the timeline.
      
      Sarah: I think we should also consider the holiday season impact on our schedule.
      
      John: Absolutely. We'll need to plan for reduced capacity in December. Let's target mid-November for the beta release.
      
      Jane: That works for me. What about marketing preparation?
      
      Lisa: Marketing can start preparing campaigns now. We'll need product screenshots by early November.
      
      John: Perfect. Let's schedule weekly sync meetings to track progress.
      
      Mike: I'll set up a Slack channel for quick updates.
      
      John: Great. To summarize our action items:
      1. Mobile app beta by November 15th
      2. API improvements by October 30th
      3. Marketing materials ready by November 1st
      4. Weekly sync meetings starting next Monday
      
      Any questions before we wrap up?
      
      Jane: All clear from my side.
      
      John: Excellent. Thanks everyone for your time. Let's make Q4 our best quarter yet!`,
      summary: 'Q4 planning meeting focused on mobile app launch, API improvements, and holiday planning.',
      actionItems: [
        { task: 'Complete mobile app beta', owner: 'Engineering Team', deadline: '2024-11-15', priority: 'high' },
        { task: 'Finish API improvements', owner: 'Mike', deadline: '2024-10-30', priority: 'medium' },
        { task: 'Prepare marketing materials', owner: 'Lisa', deadline: '2024-11-01', priority: 'high' },
        { task: 'Set up weekly sync meetings', owner: 'John', deadline: '2024-10-07', priority: 'low' },
        { task: 'Create Slack channel for updates', owner: 'Mike', deadline: '2024-10-05', priority: 'low' },
      ],
    },
    {
      topic: 'Customer Success Review',
      transcript: `Sarah: Welcome to our monthly customer success review. Let's dive into the metrics.
      
      Our NPS score has increased to 72 this month, up from 68 last month. This is primarily driven by improvements in our response time.
      
      Tom: That's fantastic! What about churn rate?
      
      Sarah: Churn is down to 2.1%, which is below our target of 2.5%. The new onboarding flow seems to be working well.
      
      Rachel: I've noticed customers are particularly happy with the new dashboard. We're getting great feedback.
      
      Sarah: Yes, the product team did an excellent job there. Now, let's talk about support tickets.
      
      We're averaging 24-hour response time, but I'd like to get that down to 12 hours.
      
      Tom: We might need to hire additional support staff for that.
      
      Sarah: I agree. I'll prepare a hiring proposal for next week's leadership meeting.
      
      Rachel: What about the enterprise customers? Any concerns there?
      
      Sarah: Two enterprise accounts have requested custom integrations. We need to discuss this with product.
      
      Tom: I can set up a meeting with the product team this week.
      
      Sarah: Perfect. Let's also implement a quarterly business review process for enterprise accounts.
      
      Action items from today:
      - Hiring proposal for support team expansion
      - Meeting with product team about custom integrations
      - Implement QBR process for enterprise accounts
      - Continue monitoring NPS and churn metrics`,
      summary: 'Customer success metrics review showing improved NPS and reduced churn. Plans for support team expansion.',
      actionItems: [
        { task: 'Prepare hiring proposal for support team', owner: 'Sarah', deadline: '2024-10-12', priority: 'high' },
        { task: 'Schedule meeting with product team', owner: 'Tom', deadline: '2024-10-08', priority: 'medium' },
        { task: 'Implement QBR process', owner: 'Sarah', deadline: '2024-10-20', priority: 'medium' },
        { task: 'Monitor NPS trends', owner: 'Rachel', deadline: '2024-10-31', priority: 'low' },
      ],
    },
    {
      topic: 'Engineering Sprint Retrospective',
      transcript: `David: Alright team, let's start our sprint retrospective. What went well this sprint?
      
      Alice: The new CI/CD pipeline saved us a lot of time. Deployments are much smoother now.
      
      Bob: Agreed. Also, pair programming on the payment integration worked really well.
      
      Carol: The daily standups were more focused this sprint. Keeping them to 15 minutes made a big difference.
      
      David: Great observations. What didn't go so well?
      
      Alice: We underestimated the complexity of the search feature. It took twice as long as planned.
      
      Bob: The testing environment was down for two days, which blocked several tasks.
      
      Carol: Communication with the design team could have been better. We had to redo some UI components.
      
      David: Good points. What should we do differently next sprint?
      
      Alice: We should add buffer time for complex features and get design reviews earlier.
      
      Bob: Let's set up monitoring for the test environment to catch issues faster.
      
      Carol: I suggest having a weekly sync with the design team.
      
      David: Excellent suggestions. Let's implement these changes:
      1. Add 20% buffer time for complex features
      2. Set up test environment monitoring
      3. Weekly design sync meetings
      4. Continue with pair programming for critical features
      5. Maintain 15-minute standup limit
      
      Any other thoughts?
      
      Team: Looks good!
      
      David: Great retro everyone. Let's make next sprint even better!`,
      summary: 'Sprint retrospective highlighting CI/CD improvements and identifying areas for better estimation and communication.',
      actionItems: [
        { task: 'Set up test environment monitoring', owner: 'Bob', deadline: '2024-10-06', priority: 'high' },
        { task: 'Schedule weekly design sync', owner: 'Carol', deadline: '2024-10-05', priority: 'medium' },
        { task: 'Update sprint planning process with buffer time', owner: 'David', deadline: '2024-10-07', priority: 'medium' },
        { task: 'Document pair programming best practices', owner: 'Alice', deadline: '2024-10-10', priority: 'low' },
      ],
    },
    {
      topic: 'Sales Team Weekly Sync',
      transcript: `Mark: Good morning sales team! Let's review our pipeline and this week's priorities.
      
      Current pipeline stands at $2.4M with 35 active opportunities. We're at 78% of our quarterly target.
      
      Emily: I'm close to closing the TechCorp deal. They're ready to sign this week - $250K annual contract.
      
      James: Excellent! I have three demos scheduled with enterprise prospects. Potential value of $500K.
      
      Nina: The FinanceHub deal might slip to next quarter. They're asking for additional security audits.
      
      Mark: Nina, let's get security team involved immediately. We can't afford to lose that one.
      
      Emily: I've noticed competitors are pushing hard on pricing. We're losing deals on cost.
      
      Mark: Good observation. I'll discuss with leadership about a competitive pricing strategy.
      
      James: The new sales deck is really helping. Conversion from demo to trial improved by 15%.
      
      Nina: Agreed. The ROI slides are particularly effective.
      
      Mark: Great feedback. Let's focus on these priorities this week:
      1. Close TechCorp deal
      2. Support Nina with FinanceHub security requirements
      3. Complete all scheduled demos
      4. Update CRM with latest opportunity stages
      5. Identify upsell opportunities in existing accounts
      
      Emily: Should we do anything special for the product launch next month?
      
      Mark: Yes! Let's prepare a launch campaign for existing customers. Could drive significant upsells.
      
      Team: Sounds good!
      
      Mark: Excellent. Let's have a great week and push towards that quarterly target!`,
      summary: 'Sales team review showing strong pipeline at $2.4M, focusing on closing key deals and addressing competitive pricing.',
      actionItems: [
        { task: 'Close TechCorp deal', owner: 'Emily', deadline: '2024-10-09', priority: 'urgent' },
        { task: 'Get security team support for FinanceHub', owner: 'Mark', deadline: '2024-10-06', priority: 'high' },
        { task: 'Complete scheduled enterprise demos', owner: 'James', deadline: '2024-10-11', priority: 'high' },
        { task: 'Prepare product launch campaign', owner: 'Emily', deadline: '2024-10-20', priority: 'medium' },
        { task: 'Update CRM opportunity stages', owner: 'All', deadline: '2024-10-07', priority: 'medium' },
      ],
    },
    {
      topic: 'Product Roadmap Review',
      transcript: `Lisa: Welcome everyone to our quarterly product roadmap review. Let's assess our progress and priorities.
      
      We've completed 70% of our Q3 commitments. The mobile app is our biggest win, currently in beta with 500 users.
      
      Alex: Beta feedback has been overwhelmingly positive. 4.5 star average rating.
      
      Sam: The API v2 is also complete. We're seeing 40% faster response times.
      
      Lisa: Excellent progress. Now, what didn't we complete?
      
      Alex: The advanced analytics dashboard was pushed to Q4. We underestimated the data pipeline work.
      
      Sam: The third-party integrations are only 60% complete. Partner APIs were more complex than expected.
      
      Lisa: Understood. For Q4, our priorities are:
      1. Mobile app general release
      2. Complete analytics dashboard
      3. Finish third-party integrations
      4. Start AI-powered features
      
      Alex: Do we have resources for AI features? That's a significant undertaking.
      
      Lisa: Good question. We're hiring two ML engineers next month.
      
      Sam: What about customer requests? We have 50+ feature requests in the backlog.
      
      Lisa: Let's prioritize based on customer segment. Enterprise features take precedence.
      
      Alex: Should we consider a hackathon for innovative features?
      
      Lisa: Great idea! Let's plan one for November.
      
      Action items:
      - Finalize Q4 roadmap document
      - Start ML engineer recruitment
      - Plan November hackathon
      - Prioritize customer feature requests
      - Create communication plan for product updates`,
      summary: 'Quarterly product roadmap review showing 70% completion of Q3 goals, with Q4 focus on mobile app release and AI features.',
      actionItems: [
        { task: 'Finalize Q4 roadmap document', owner: 'Lisa', deadline: '2024-10-08', priority: 'high' },
        { task: 'Start ML engineer recruitment', owner: 'HR Team', deadline: '2024-10-10', priority: 'high' },
        { task: 'Plan November hackathon', owner: 'Alex', deadline: '2024-10-15', priority: 'medium' },
        { task: 'Prioritize feature request backlog', owner: 'Sam', deadline: '2024-10-12', priority: 'medium' },
        { task: 'Create product update communication', owner: 'Lisa', deadline: '2024-10-09', priority: 'low' },
      ],
    },
  ];

  // Create meetings with recordings for each user
  console.log('📅 Creating meetings and recordings...');
  
  let meetingCount = 0;
  let recordingCount = 0;
  let taskCount = 0;

  for (const user of users.slice(0, 2)) { // Create meetings for first 2 users
    for (let i = 0; i < meetingTopics.length; i++) {
      const topic = meetingTopics[i];
      const meetingDate = faker.date.recent({ days: 30 });
      const duration = faker.number.int({ min: 30, max: 120 });
      
      // Create meeting
      const meeting = await prisma.meeting.create({
        data: {
          zoomMeetingId: faker.string.numeric(10),
          uuid: faker.string.uuid(),
          topic: topic.topic,
          startTime: meetingDate,
          endTime: new Date(meetingDate.getTime() + duration * 60000),
          duration: duration,
          recordingUrl: `/api/recordings/sample-video-${i + 1}.mp4`,
          transcriptText: topic.transcript,
          transcript: JSON.stringify({
            meeting_id: faker.string.numeric(10),
            transcript_text: topic.transcript,
          }),
          summary: topic.summary,
          bulletPoints: JSON.stringify([
            'Key discussion on strategic priorities',
            'Action items assigned to team members',
            'Timeline established for deliverables',
            'Follow-up meeting scheduled',
            'Resources allocated for implementation',
          ]),
          aiNotes: JSON.stringify({
            sentiment: faker.helpers.arrayElement(['positive', 'neutral', 'constructive']),
            topics: ['planning', 'strategy', 'execution', 'team collaboration'],
            effectiveness: faker.number.int({ min: 70, max: 95 }),
          }),
          speakers: JSON.stringify([
            { name: 'Speaker 1', duration: Math.floor(duration * 0.4) },
            { name: 'Speaker 2', duration: Math.floor(duration * 0.3) },
            { name: 'Speaker 3', duration: Math.floor(duration * 0.3) },
          ]),
          userId: user.id,
        },
      });
      meetingCount++;

      // Create recordings for this meeting
      const recordingTypes = [
        { type: 'MP4', extension: 'mp4', size: faker.number.int({ min: 100000000, max: 500000000 }), recordingType: 'shared_screen_with_speaker_view' },
        { type: 'M4A', extension: 'm4a', size: faker.number.int({ min: 10000000, max: 50000000 }), recordingType: 'audio_only' },
        { type: 'TRANSCRIPT', extension: 'vtt', size: faker.number.int({ min: 50000, max: 200000 }), recordingType: 'transcript' },
        { type: 'CHAT', extension: 'txt', size: faker.number.int({ min: 5000, max: 20000 }), recordingType: 'chat' },
      ];

      for (const recType of recordingTypes) {
        await prisma.recording.create({
          data: {
            meetingId: meeting.id,
            fileType: recType.type,
            fileSize: BigInt(recType.size),
            fileUrl: `/api/recordings/recording-${meeting.id}-${faker.string.alphanumeric(8)}.${recType.extension}`,
            downloadUrl: `https://zoom.us/rec/download/${faker.string.alphanumeric(20)}`,
            playUrl: `https://zoom.us/rec/play/${faker.string.alphanumeric(20)}`,
            recordingType: recType.recordingType,
            duration: recType.type === 'MP4' || recType.type === 'M4A' ? duration * 60 : null,
            recordingStart: meetingDate,
            recordingEnd: new Date(meetingDate.getTime() + duration * 60000),
          },
        });
        recordingCount++;
      }

      // Create tasks from action items
      if (topic.actionItems) {
        for (const item of topic.actionItems) {
          await prisma.task.create({
            data: {
              description: item.task,
              owner: item.owner,
              deadline: item.deadline ? new Date(item.deadline) : null,
              priority: item.priority.toUpperCase() as any,
              status: faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
              meetingId: meeting.id,
            },
          });
          taskCount++;
        }
      }
    }
  }

  console.log(`✅ Created ${meetingCount} meetings`);
  console.log(`✅ Created ${recordingCount} recordings`);
  console.log(`✅ Created ${taskCount} tasks\n`);

  // Create some meetings without recordings for the demo user
  console.log('📝 Creating additional meetings for demo user...');
  
  const demoUser = users[2];
  for (let i = 0; i < 3; i++) {
    const meeting = await prisma.meeting.create({
      data: {
        zoomMeetingId: `demo_${faker.string.numeric(10)}`,
        topic: faker.helpers.arrayElement([
          'Team Standup',
          'Client Presentation',
          'Project Kickoff',
          'Budget Review',
          'Training Session',
        ]),
        startTime: faker.date.recent({ days: 14 }),
        duration: faker.number.int({ min: 15, max: 60 }),
        transcriptText: 'This is a demo meeting without recordings. The transcript would appear here.',
        summary: 'Demo meeting for testing purposes.',
        userId: demoUser.id,
        source: 'MANUAL',
      },
    });
    meetingCount++;
  }

  console.log(`✅ Created 3 additional demo meetings\n`);

  // Summary
  console.log('🎉 Seeding completed successfully!');
  console.log('================================');
  console.log(`Total Users: ${users.length}`);
  console.log(`Total Meetings: ${meetingCount}`);
  console.log(`Total Recordings: ${recordingCount}`);
  console.log(`Total Tasks: ${taskCount}`);
  console.log('\n📧 Test Credentials:');
  console.log('-------------------');
  users.forEach(user => {
    console.log(`Email: ${user.email}`);
    console.log(`Password: password123`);
    console.log('');
  });
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });