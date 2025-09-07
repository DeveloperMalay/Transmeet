# Transmeet - AI-Powered Zoom Meeting Intelligence Platform

A comprehensive meeting intelligence platform that integrates with Zoom to automatically fetch, transcribe, and analyze meeting recordings using AI to extract actionable insights, summaries, and tasks.

## Features

### Core Functionality
- **Zoom OAuth Integration**: Secure authentication with Zoom accounts
- **Automatic Meeting Sync**: Fetch recordings and transcripts from Zoom
- **AI-Powered Analysis**: 
  - Meeting summaries
  - Key points extraction
  - Action items identification
  - Sentiment analysis
  - Meeting effectiveness scoring

### Transcript Features
- **Searchable Transcripts**: Full-text search across all meetings
- **Speaker Identification**: Know who said what
- **Timestamp Navigation**: Jump to specific moments
- **Real-time Search**: Highlight and navigate search results

### Export & Sharing
- **Multiple Export Formats**: PDF, Word, Markdown, JSON
- **Slack Integration**: Share summaries and tasks to Slack channels
- **Email Notifications**: Send meeting notes via email
- **Professional Formatting**: Well-structured exports with branding

### User Interface
- **Modern Dashboard**: Overview of all meetings with statistics
- **Dark Mode Support**: System-aware theme switching
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Advanced Filtering**: Search by date, participants, content

## Tech Stack

### Backend
- **Runtime**: Bun (high-performance JavaScript runtime)
- **Framework**: Hono (lightweight, fast web framework)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens
- **AI**: OpenAI GPT-4 for intelligent analysis

### Frontend
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **API Client**: Axios with React Query
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Custom components with Lucide icons

## Getting Started

### Prerequisites
- Node.js 18+ or Bun runtime
- PostgreSQL database
- Zoom OAuth App credentials
- OpenAI API key (optional)
- Slack Bot Token (optional)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/transmeet.git
cd transmeet
```

2. **Install Backend Dependencies**:
```bash
cd backend
bun install
```

3. **Configure Backend Environment**:
Copy `.env.example` to `.env` and update with your credentials:
```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `ZOOM_CLIENT_ID`: Your Zoom OAuth app client ID
- `ZOOM_CLIENT_SECRET`: Your Zoom OAuth app client secret
- `JWT_SECRET`: Secret key for JWT tokens
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `SLACK_BOT_TOKEN`: Slack bot token (optional)

4. **Run Database Migrations**:
```bash
bun run prisma:migrate
```

5. **Install Frontend Dependencies**:
```bash
cd ../frontend
bun install
```

6. **Start the Servers**:

Backend (runs on port 4000):
```bash
cd backend
bun run dev
```

Frontend (runs on port 3000):
```bash
cd frontend
bun run dev
```

7. **Access the Application**:
Open http://localhost:3000 in your browser

## Usage

### Initial Setup
1. Navigate to http://localhost:3000
2. Click "Connect with Zoom" to authenticate
3. Grant necessary permissions for meeting and recording access
4. You'll be redirected to the dashboard

### Syncing Meetings
1. Click "Sync Meetings" on the dashboard
2. The system will fetch your recent meetings with recordings
3. Transcripts will be processed automatically

### Analyzing Meetings
1. Select a meeting from the dashboard
2. Click "Analyze" to generate AI insights
3. View summaries, action items, and key points

### Exporting & Sharing
1. Open a meeting detail page
2. Click the export menu
3. Choose format (PDF, Word, Markdown)
4. Or share via Slack/Email

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/zoom` - Initiate Zoom OAuth
- `GET /api/auth/zoom/callback` - Handle Zoom OAuth callback

### Meetings
- `GET /api/meetings` - List all meetings
- `POST /api/meetings/sync` - Sync from Zoom
- `GET /api/meetings/:id` - Get meeting details
- `POST /api/meetings/:id/analyze` - AI analysis
- `POST /api/meetings/:id/export` - Export meeting

### Transcripts
- `GET /api/transcripts/meeting/:id` - Get transcript
- `POST /api/transcripts/meeting/:id/search` - Search in transcript
- `GET /api/transcripts/search` - Global search

## Project Structure

```
transmeet/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities
│   │   └── index.ts        # Main server
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
├── frontend/
│   ├── app/                # Next.js pages
│   ├── components/         # React components
│   ├── hooks/              # Custom hooks
│   ├── lib/                # API client
│   ├── store/              # State management
│   ├── types/              # TypeScript types
│   └── package.json
└── README.md
```

## Security Considerations

- **JWT Authentication**: All API routes are protected
- **CORS Configuration**: Restricted to frontend origin
- **Environment Variables**: Sensitive data in .env files
- **Input Validation**: Zod schemas for data validation
- **Rate Limiting**: Consider adding for production
- **HTTPS**: Use in production environment

## Development Tips

### Database Management
```bash
# View database in Prisma Studio
cd backend
bun run prisma:studio
```

### Testing API Endpoints
Use tools like Postman or curl to test endpoints:
```bash
# Get auth token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Debugging
- Backend logs: Check terminal running `bun run dev`
- Frontend logs: Browser DevTools console
- Database: Prisma Studio for data inspection

## Deployment

### Backend Deployment
1. Set production environment variables
2. Build: `bun run build`
3. Start: `bun run start`
4. Use process manager (PM2, systemd)

### Frontend Deployment
1. Build: `bun run build`
2. Deploy to Vercel, Netlify, or similar
3. Set API_URL environment variable

### Database
- Use managed PostgreSQL (Supabase, Neon, etc.)
- Run migrations: `bun run prisma:migrate deploy`

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/transmeet/issues)
- Email: support@transmeet.example.com

## Acknowledgments

- Zoom API for meeting integration
- OpenAI for intelligent analysis
- Prisma for database ORM
- Next.js team for the framework
- All contributors and users

---

Built with ❤️ for better meeting intelligence