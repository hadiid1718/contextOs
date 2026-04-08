import { app } from './app.js';
import { connectToDatabase, disconnectDatabase } from './config/db.js';
import { connectKafka, disconnectKafka } from './config/kafka.js';
import { env } from './config/env.js';
import { startPollScheduler } from './jobs/pollScheduler.js';
import { logger } from './utils/logger.js';


const PORT = env.port

app.listen(PORT, async()=> {
  logger.info(`Ingestion is running on port: http://localhost:${PORT}`)
  await connectToDatabase()
  await disconnectDatabase()
  await connectKafka()
  await disconnectKafka()
  await startPollScheduler()
})

