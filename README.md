# SmartGov Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A citizen feedback management system that enables government agencies to collect, categorize, analyze, and gain insights from citizen feedback using AI agents. Built for improving government-citizen communication and service delivery.

## 🚀 Features

- **Citizen Feedback Submission**: Easy-to-use form for citizens to submit feedback about government services
- **AI-Powered Analysis**: Automatic categorization and sentiment analysis using OpenAI
- **Real-time Dashboard**: Interactive dashboard with insights and analytics for government officials
- **Vector Search**: Advanced search capabilities to find relevant feedback quickly
- **Trend Analysis**: Identify patterns and trends in citizen feedback over time
- **Responsive Design**: Mobile-friendly interface for accessibility across all devices

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: TiDB Serverless (MySQL-compatible with vector search capabilities)
- **AI Processing**: Custom agents with OpenAI API integration
- **Testing**: Jest, React Testing Library, Vitest
- **Deployment**: Netlify (frontend), Railway/Vercel (backend)

## 🏗 Architecture

The system consists of three main components:

1. **Frontend Application** (`frontend/`): Next.js app providing user interfaces
2. **Backend API** (`server/`): Express.js server handling business logic and AI processing
3. **Database Layer**: TiDB Serverless for data persistence and vector search

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- TiDB Serverless account
- OpenAI API key

## 🚀 Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/smartgov-assistant.git
   cd smartgov-assistant
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Set up the backend server**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Update .env with your database credentials and OpenAI API key
   npm run migrate  # Set up database schema
   npm run dev
   ```

4. **Set up the frontend (in another terminal)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Environment Variables

Create a `.env` file in the `server/` directory with:

```env
DATABASE_URL=your_tidb_connection_string
OPENAI_API_KEY=your_openai_api_key
PORT=3001
NODE_ENV=development
```

## 📁 Project Structure

```
smartgov-assistant/
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # App router pages
│   │   ├── components/   # Reusable React components
│   │   ├── lib/          # Utility functions and API client
│   │   └── types/        # TypeScript type definitions
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
├── server/               # Express backend server
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic services
│   ├── agents/           # AI processing agents
│   ├── repositories/     # Data access layer
│   ├── database/         # Database schema and migrations
│   └── package.json      # Server dependencies
├── .kiro/                # Kiro specs and configuration
├── LICENSE               # MIT License
└── README.md            # This file
```

## 🌐 Development

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start only frontend
npm run dev:server       # Start only backend

# Building
npm run build            # Build both applications
npm run build:frontend   # Build frontend only
npm run build:server     # Build backend only

# Testing
npm test                 # Run all tests
npm run test:frontend    # Run frontend tests
npm run test:server      # Run backend tests
```

## 🧪 Testing

The project includes comprehensive test suites:

- **Frontend**: Jest + React Testing Library for component testing
- **Backend**: Vitest for unit and integration testing
- **Coverage**: Test coverage reports available

Run tests with:
```bash
npm test
```

## 🚀 Deployment

### Frontend (Netlify)
1. Connect your GitHub repository to Netlify
2. Set build command: `cd frontend && npm run build`
3. Set publish directory: `frontend/out`

### Backend (Railway/Vercel)
1. Deploy the `server/` directory
2. Set environment variables in your deployment platform
3. Ensure database migrations run on deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [TiDB Serverless](https://tidb.cloud/) for scalable database solutions
- AI processing powered by [OpenAI](https://openai.com/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)
- Developed using [Kiro IDE](https://kiro.ai/) for AI-assisted development

## 📞 Support

If you have any questions or need help with setup, please open an issue in the GitHub repository.