import express from 'express';
import cors from 'cors';
import { Database } from './database/Database';
import { ContactService } from './services/ContactService';
import { ContactController } from './controllers/ContactController';

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false // Set to true if you need to send cookies
}));
app.use(express.json());

// Initialize database and services
const database = new Database();
const contactService = new ContactService(database);
const contactController = new ContactController(contactService);

// Routes
app.get('/', (req, res) => {
  res.status(200).json({
    message: ' running successfully'  });
});
app.post('/api/v1/identify', (req, res) => contactController.identify(req, res));
app.get('/api/v1/contacts', (req, res) => contactController.getAllContacts(req, res));

// Health check endpoint
app.get('/api/v1/healthf', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Bitespeed Identity Reconciliation Service is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'Please use POST /api/v1/identify to identify contacts'
  });
});



// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on our end'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Gracefully shutting down...');
  try {
    await database.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Gracefully shutting down...');
  try {
    await database.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Errofr during shutdown:', error);
    process.exit(1);
  }
});

app.listen(PORT, () => {
  console.log(` Bitespeed Identity Reconciliation Service running on port ${PORT}`);
  console.log(` Health check: GET http://localhost:${PORT}/api/v1/health`);
  console.log(` Identify endpoint: POST http://localhost:${PORT}/api/v1/identify`);
  console.log(` Contacts list: GET http://localhost:${PORT}/api/v1/contacts?limit=10&page=1`);
});
