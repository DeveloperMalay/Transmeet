# Transmeet Backend API

A comprehensive backend API for Zoom meeting integration with AI-powered summaries, transcripts, and task management.

## Features

- **Zoom OAuth Integration**: Seamless authentication with Zoom
- **Meeting Sync**: Automatic synchronization of meetings from Zoom
- **AI-Powered Analysis**: OpenAI integration for meeting summaries and insights
- **Export Capabilities**: PDF, Word, Markdown, and JSON exports
- **Notification System**: Slack and email notifications
- **Task Management**: Action items extracted from meetings
- **Transcript Processing**: Advanced transcript search and analysis

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens
- **AI**: OpenAI GPT-4
- **Integrations**: Zoom API, Slack API, Nodemailer

## Getting Started

### Prerequisites

- Bun installed
- PostgreSQL database
- Zoom OAuth app
- OpenAI API key (optional)
- Slack bot token (optional)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database:
   ```bash
   bun run prisma:migrate
   bun run prisma:generate
   ```

5. Start the development server:
   ```bash
   bun run dev
   ```

The server will start on http://localhost:4000

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/zoom` - Get Zoom OAuth URL
- `GET /api/auth/zoom/callback` - Handle Zoom OAuth callback
- `POST /api/auth/zoom/disconnect` - Disconnect Zoom account

### Meetings

- `GET /api/meetings` - List user meetings
- `GET /api/meetings/:id` - Get meeting details
- `POST /api/meetings/sync` - Sync meetings from Zoom
- `POST /api/meetings/:id/analyze` - Analyze meeting with AI
- `POST /api/meetings/:id/export` - Export meeting
- `GET /api/meetings/:id/tasks` - Get meeting tasks
- `POST /api/meetings/:id/share` - Share meeting summary

### Transcripts

- `GET /api/transcripts/meeting/:id` - Get meeting transcript
- `POST /api/transcripts/meeting/:id/analyze` - Analyze transcript
- `POST /api/transcripts/meeting/:id/search` - Search in transcript
- `GET /api/transcripts/search` - Search all transcripts

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `ZOOM_CLIENT_ID` | Zoom OAuth client ID | Yes |
| `ZOOM_CLIENT_SECRET` | Zoom OAuth client secret | Yes |
| `ZOOM_REDIRECT_URI` | Zoom OAuth redirect URI | Yes |
| `OPENAI_API_KEY` | OpenAI API key | No |
| `SLACK_BOT_TOKEN` | Slack bot token | No |
| `EMAIL_HOST` | SMTP host | No |
| `EMAIL_USER` | SMTP username | No |
| `EMAIL_PASS` | SMTP password | No |

## Development Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run prisma:generate` - Generate Prisma client
- `bun run prisma:migrate` - Run database migrations
- `bun run prisma:studio` - Open Prisma Studio

## Project Structure

```
src/
├── config/           # Configuration management
├── middleware/       # Hono middleware
├── routes/          # API route handlers
├── services/        # Business logic services
├── utils/           # Utility functions
└── index.ts         # Main server file
```

## Architecture

The backend follows a layered architecture:

1. **Routes**: Handle HTTP requests and responses
2. **Services**: Contain business logic and external integrations
3. **Middleware**: Handle authentication, validation, etc.
4. **Database**: Prisma ORM with PostgreSQL

## Error Handling

All errors are handled consistently with proper HTTP status codes and JSON responses:

```json
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```

## Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.