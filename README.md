# SmartGov Assistant

A citizen feedback management system that enables government agencies to collect, categorize, analyze, and gain insights from citizen feedback using AI agents.

## Features

- Citizen feedback submission
- Automatic categorization and sentiment analysis
- Real-time dashboard with insights
- Vector search capabilities
- Trend analysis and reporting

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: TiDB Serverless (MySQL-compatible with vector search)
- **AI Processing**: Custom agents with OpenAI API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TiDB Serverless account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your database and API credentials

5. Start the development servers:
   ```bash
   # Start Next.js frontend
   npm run dev

   # Start Express backend (in another terminal)
   npm run server:dev
   ```

## Project Structure

```
├── src/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/              # Utility functions
├── server/                # Express backend
│   ├── routes/           # API routes
│   ├── models/           # Data models
│   └── agents/           # AI agents
└── .kiro/                # Kiro specs and configuration
```

## Development

- Frontend runs on http://localhost:3000
- Backend API runs on http://localhost:3001
- API health check: http://localhost:3001/health