import app from './app';

export const fetch = app.fetch.bind(app);

export const config = {
  runtime: 'nodejs',
};
