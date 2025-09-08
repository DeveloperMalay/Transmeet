# Seed Data Documentation

## Overview
The seed script populates the database with realistic dummy data for testing and development purposes.

## Running the Seed Script

```bash
# Install dependencies (if not already installed)
bun install

# Run the seed script
npm run seed
# or
bun run seed
```

## Test Credentials

After seeding, you can log in with these test accounts:

| Email | Password | Description |
|-------|----------|-------------|
| john.doe@example.com | password123 | User with Zoom integration and meetings |
| jane.smith@example.com | password123 | User with Zoom integration and meetings |
| demo@transmeet.com | password123 | Demo user without Zoom integration |

## Data Created

### Users (3)
- 2 users with Zoom integration enabled
- 1 demo user without Zoom integration
- All users have verified email addresses

### Meetings (13)
- 10 meetings with full recordings and transcripts for Zoom-connected users
- 3 simple meetings for the demo user
- Meeting topics include:
  - Q4 2024 Planning Session
  - Customer Success Review
  - Engineering Sprint Retrospective
  - Sales Team Weekly Sync
  - Product Roadmap Review

### Recordings (40)
- Each Zoom meeting has 4 recording types:
  - MP4 video (100-500 MB)
  - M4A audio (10-50 MB)
  - VTT transcript (50-200 KB)
  - TXT chat (5-20 KB)
- Recordings include metadata like duration, start/end times

### Tasks (46)
- Action items extracted from meeting transcripts
- Various priorities: LOW, MEDIUM, HIGH, URGENT
- Mixed statuses: PENDING, IN_PROGRESS, COMPLETED
- Assigned owners and deadlines

## Sample Files

The seed script references sample recording files stored in `uploads/recordings/`:
- `sample-video-1.mp4` - Placeholder video file
- `sample-video-2.mp4` - Placeholder video file  
- `sample-transcript.vtt` - Sample WebVTT transcript
- `sample-audio.m4a` - Placeholder audio file

## Verifying Seed Data

```bash
# Run verification script
npx tsx scripts/verify-seed-data.ts

# Or use Prisma Studio for visual inspection
npm run prisma:studio
```

## Resetting Data

The seed script automatically cleans existing data before inserting new records. Simply run the seed script again to reset the database with fresh data.

## Notes

- All passwords are hashed using bcrypt
- Meeting transcripts contain realistic conversation samples
- Tasks are automatically generated from action items in transcripts
- Recording URLs follow the API endpoint pattern (`/api/recordings/...`)
- Zoom meeting IDs and UUIDs are randomly generated