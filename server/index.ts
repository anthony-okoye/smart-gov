import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'SmartGov Assistant API is running' });
});

// API routes placeholder
app.get('/api', (req, res) => {
  res.json({ message: 'SmartGov Assistant API' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});