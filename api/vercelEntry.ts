/**
 * Vercel bundle entry: Express app wrapped with serverless-http (single CJS output).
 */
import serverless from 'serverless-http';
import app from '../server/app';

export default serverless(app);
