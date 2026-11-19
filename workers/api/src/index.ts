import { app } from './app.js';

export default {
  fetch: app.fetch,
};

export { app } from './app.js';
export * from './env.js';
export * from './bootstrap.js';
