import { connectDatabase } from './db';
import app from './app';

connectDatabase().catch((error) => {
  console.error('Failed to connect to database on cold start:', error);
});

export const fetch = app.fetch.bind(app);

export const config = {
  runtime: 'nodejs',
};
