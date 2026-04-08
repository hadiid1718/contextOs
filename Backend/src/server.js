import { app } from './app.js';
import { connectToDatabase } from './config/db.js';
import { env } from './config/env.js';
import { setIngestionStatus } from './config/ingestionStatus.js';
import logger from './config/loggers.js';
import { connectKafka, disconnectKafka } from './ingestion/config/kafka.js';
import { startPollScheduler } from './ingestion/jobs/pollScheduler.js';

const PORT = env.port;

let pollTask;

const startEmbeddedIngestion = async () => {
  if (!env.ingestionEnabled) {
    setIngestionStatus({
      enabled: false,
      kafkaConnected: false,
      schedulerStarted: false,
      startupError: null,
    });
    logger.info('Embedded ingestion is disabled');
    return;
  }

  setIngestionStatus({
    enabled: true,
    kafkaConnected: false,
    schedulerStarted: false,
    startupError: null,
  });

  try {
    await connectKafka();
    setIngestionStatus({ kafkaConnected: true });
  } catch (error) {
    setIngestionStatus({ startupError: `Kafka startup failed: ${error.message}` });
    logger.warn(`Embedded ingestion Kafka startup skipped: ${error.message}`);
  }

  pollTask = startPollScheduler();
  setIngestionStatus({ schedulerStarted: true });
  logger.info('Embedded ingestion routes and scheduler are enabled');
};

const startServer = async () => {
  await connectToDatabase();
  await startEmbeddedIngestion();

  const server = app.listen(PORT, () => {
    logger.info(`server is running on port: http://localhost:${PORT}`);
  });

  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      logger.error(
        `Port ${PORT} is already in use. Stop the existing process or set a different PORT.`
      );
      process.exit(1);
    }

    logger.error(`Server listen error: ${error.message}`);
    process.exit(1);
  });
};

process.on('SIGTERM', async () => {
  pollTask?.stop();
  await disconnectKafka();
  setIngestionStatus({ schedulerStarted: false });
});

process.on('SIGINT', async () => {
  pollTask?.stop();
  await disconnectKafka();
  setIngestionStatus({ schedulerStarted: false });
});

startServer().catch(error => {
  logger.error(`Startup failed: ${error.message}`);
  process.exit(1);
});
