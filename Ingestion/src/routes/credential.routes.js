import { Router } from 'express';

import {
  readCredential,
  saveCredential,
} from '../controllers/credential.controller.js';

export const credentialRouter = Router();

credentialRouter.post('/', saveCredential);
credentialRouter.get('/', readCredential);

