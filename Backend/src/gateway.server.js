import { env } from './config/env.js';
import logger from './config/loggers.js';
import { gatewayApp } from './gateway.app.js';
import { closeGatewayRedis } from './gateway/index.js';

const gatewayLogger = logger.child({ service: 'stackmind-api-gateway' });

const PORT = env.gatewayPort;
let httpServer = null;

const gracefulShutdown = async signal => {
  gatewayLogger.info(`Received ${signal}. Starting API gateway shutdown`);

  try {
    await closeGatewayRedis();

    if (httpServer) {
      await new Promise(resolve => httpServer.close(resolve));
    }

    process.exit(0);
  } catch (error) {
    gatewayLogger.error(
      error?.stack || error?.message || 'Gateway shutdown failed'
    );
    process.exit(1);
  }
};

const startGateway = () => {
  httpServer = gatewayApp.listen(PORT, () => {
    gatewayLogger.info(
      `Stackmind API Gateway is running on http://localhost:${PORT}`
    );
  });
};

startGateway();

process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
