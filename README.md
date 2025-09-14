# SmartGov Assistant

A citizen feedback management system that enables government agencies to collect, categorize, analyze, and gain insights from citizen feedback using AI agents.

## Features

- Citizen feedback submission
- Automatic categorization and sentiment analysis
- Real-time dashboard with insights
- Vector search capabilities
- Trend analysis and reporting

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS (in `frontend/` directory)
- **Backend**: Node.js, Express.js, TypeScript (in `server/` directory)
- **Database**: TiDB Serverless (MySQL-compatible with vector search)
- **AI Processing**: Custom agents with OpenAI API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TiDB Serverless account

### Installation

1. Clone the repository

2. Set up the backend server:
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Update .env with your database credentials
   npm run dev
   ```

3. Set up the frontend (in another terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Project Structure

```
├── frontend/              # Next.js frontend application
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
├── server/               # Express backend server
│   ├── routes/           # API routes
│   ├── models/           # Data models
│   ├── agents/           # AI agents
│   └── package.json      # Server dependencies
└── .kiro/                # Kiro specs and configuration
```

## Development

- Frontend runs on http://localhost:3000
- Backend API runs on http://localhost:3001
- API health check: http://localhost:3001/health

Each component (frontend/server) has its own package.json and can be developed independently.