import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { getConfigError } from './config/authEnv.js';
import { requireAuth } from './middleware/auth.js';

import nicheRoutes from './routes/niche.routes.js';
import leadRoutes from './routes/lead.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import habitRoutes from './routes/habit.routes.js';
import authRoutes from './routes/auth.routes.js';

dotenv.config();

const app = express();

app.disable('x-powered-by');
app.use(compression());

// Allow both production frontend and localhost for development
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') || '';
const allowedOrigins = [
  frontendUrl,
  'http://localhost:5173',
  'http://localhost:4173'
].filter(o => o.length > 0);

console.log('CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }

    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalized)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '100kb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Connect once and reuse the pooled connection. Previously every single
// request went through connectDB(), which awaited a mongoose.connect() on the
// hot path of all pages.
connectDB();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

app.use('/api', requireAuth);
app.use('/api/niches', nicheRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/habits', habitRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    const configError = getConfigError();
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    if (configError) {
      console.warn(`WARNING: ${configError}. Set it in backend/.env or login will not work.`);
    }
  });
}

export default app;