import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';

import { env } from './config/env.js';
import { configurePassport } from './config/passport.js';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';
import logger from './config/loggers.js';

configurePassport(passport);

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.appOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
  })
);
app.use(passport.initialize());

app.get('/', (req, res) => {
  res.send('Hello From ContextOS API');
});
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'contextos-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
