import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import eventRoutes from './routes/events.js';
import authRoutes from './routes/auth.js';
import savedRoutes from './routes/saved.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events/saved', savedRoutes);  // must come before /api/events (has /:id param)
app.use('/api/events', eventRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`HeyCiti server running on port ${PORT}`);
});
