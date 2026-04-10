import OpenAI from 'openai';

import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';

let openAIClient = null;

export const getOpenAIClient = () => {
  if (openAIClient) {
    return openAIClient;
  }

  if (!env.openAiApiKey) {
    throw new AppError('OPENAI_API_KEY is not configured', 500);
  }

  openAIClient = new OpenAI({ apiKey: env.openAiApiKey });
  return openAIClient;
};

