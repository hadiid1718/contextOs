import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler, notFound } from './middleware/error.middleware.js';
import { requestContext } from './middleware/requestContext.middleware.js';
import { router } from './routes/index.js';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

app.use(
  express.json({
    verify: (req, _res, buffer) => {
      req.rawBody = buffer.toString('utf8');
    },
  })
);

app.use(requestContext);
app.use('/api/v1', router);

app.use(notFound);
app.use(errorHandler);

