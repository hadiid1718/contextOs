import { app } from './app.js';
import { connectToDatabase } from './config/db.js';
import { env } from './config/env.js';
import logger from './config/loggers.js';

const PORT = env.port;

app.listen(PORT, async () => {
  logger.info(`server is running on port: http://localhost:${PORT}`);
  await connectToDatabase();
});
