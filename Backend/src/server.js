import { app } from './app.js';
import { connectToDatabase } from './config/db.js';
import { env } from './config/env.js';
import logger from './config/loggers.js';

const PORT = env.port;

const startServer = async () => {
  await connectToDatabase();

  app.listen(PORT, () => {
    logger.info(`server is running on port: http://localhost:${PORT}`);
  });
};

startServer().catch(error => {
  logger.error(`Startup failed: ${error.message}`);
  process.exit(1);
});
