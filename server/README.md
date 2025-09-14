# SmartGov Assistant - Server

Express.js backend server for the SmartGov Assistant citizen feedback management system.

## Features

- RESTful API endpoints
- TiDB Serverless database integration
- AI agents for feedback processing
- CORS enabled for frontend integration
- TypeScript support

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- TiDB Serverless account

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your database and API credentials

4. Start the development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm run build` - Build TypeScript to JavaScript
- `npm run lint` - Run ESLint

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api` - API information

## Project Structure

```
server/
├── agents/          # AI processing agents
├── models/          # Data models
├── routes/          # API route handlers
├── index.ts         # Server entry point
└── package.json     # Server dependencies
```

## Environment Variables

See `.env.example` for required environment variables.

## Development

The server runs on http://localhost:3001 by default.