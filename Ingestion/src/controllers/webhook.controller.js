import {
  processGithubWebhook,
  processJiraWebhook,
  processSlackWebhook,
} from '../services/ingestion.service.js';

export const githubWebhook = async (req, res, next) => {
  try {
    const eventName = req.header('x-github-event');
    const org_id = req.context.org_id;

    await processGithubWebhook({
      org_id,
      eventName,
      payload: {
        ...req.body,
        deliveryId: req.header('x-github-delivery'),
      },
    });

    res.status(202).json({ received: true });
  } catch (error) {
    next(error);
  }
};

export const jiraWebhook = async (req, res, next) => {
  try {
    const org_id = req.context.org_id;

    await processJiraWebhook({ org_id, payload: req.body });
    res.status(202).json({ received: true });
  } catch (error) {
    next(error);
  }
};

export const slackWebhook = async (req, res, next) => {
  try {
    if (req.body?.type === 'url_verification' && req.body?.challenge) {
      return res.status(200).json({ challenge: req.body.challenge });
    }

    const org_id = req.context.org_id;
    await processSlackWebhook({ org_id, payload: req.body });
    return res.status(202).json({ received: true });
  } catch (error) {
    return next(error);
  }
};

