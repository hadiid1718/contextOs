import { app } from './app.js';
import { connectToDatabase } from './config/db.js';
import { env } from './config/env.js';
import logger from './config/loggers.js';
import {
  initializeKnowledgeGraphModule,
  shutdownKnowledgeGraphModule,
} from './graph/index.js';
import {
  initializeIngestionModule,
  shutdownIngestionModule,
} from './ingestion/index.js';
import { initializeAIQueryModule, shutdownAIQueryModule } from './ai/index.js';
import {
  initializeNotificationRealtime,
  shutdownNotificationRealtime,
} from './notifications/services/notificationRealtime.service.js';

const PORT = env.port;
let httpServer = null;

const gracefulShutdown = async signal => {
  logger.info(`Received ${signal}. Starting graceful shutdown`);

  try {
    await shutdownKnowledgeGraphModule();
    await shutdownIngestionModule();
    await shutdownAIQueryModule();
    await shutdownNotificationRealtime();

    if (httpServer) {
      await new Promise(resolve => httpServer.close(resolve));
    }

    process.exit(0);
  } catch (error) {
    logger.error(error?.stack || error?.message || 'Graceful shutdown failed');
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await connectToDatabase();
    await initializeIngestionModule();
    await initializeKnowledgeGraphModule();
    await initializeAIQueryModule();

    httpServer = app.listen(PORT, () => {
      logger.info(
        `ContextOS API server is running on port : http://localhost:${PORT}`
      );
    });

    initializeNotificationRealtime(httpServer);
  } catch (error) {
    logger.error(error?.stack || error?.message || 'Server startup failed');
    process.exitCode = 1;
  }
};

void startServer();

process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
