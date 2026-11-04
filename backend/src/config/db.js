import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let connecting = null;

/**
 * Connect once and share the connection. On a serverless cold start every
 * request awaits the same promise; if connecting fails, the next request tries
 * again instead of the instance staying broken until it is recycled.
 */
export const connectDB = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        socketTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 1
      })
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
      })
      .catch((error) => {
        console.error(`Database Connection Error: ${error.message}`);
        connecting = null;
        throw error;
      });
  }
  return connecting;
};

/** Express middleware: make sure the database is reachable before a route runs. */
export const requireDB = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch {
    res.status(503).json({ message: 'The database is not reachable right now. Please try again.' });
  }
};
