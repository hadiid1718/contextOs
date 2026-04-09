import { app } from './app.js';
import { connectToDatabase } from './config/db.js';
import { env } from './config/env.js';
import logger from './config/loggers.js';
import { initializeIngestionModule } from './ingestion/index.js';

const PORT = env.port;

const startServer = async () => {
  try {
    await connectToDatabase();
    await initializeIngestionModule();

    app.listen(PORT, () => {
      logger.info(
        `ContextOS API server is running on port : http://localhost:${PORT}`
      );
    });
  } catch (error) {
    logger.error(error?.stack || error?.message || 'Server startup failed');
    process.exitCode = 1;
  }
};

void startServer();
