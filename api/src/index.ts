import { buildContainer } from './container.js';
import { createApp } from './create-app.js';

/** Vercel entry: Express deploys zero-config as one function from the default export. */
const app = createApp(buildContainer());

export default app;
