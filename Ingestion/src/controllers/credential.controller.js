import { getCredential, upsertCredential } from '../services/credential.service.js';

export const saveCredential = async (req, res, next) => {
  try {
    const { org_id, source, token } = req.body;

    if (!org_id || !source || !token) {
      return res.status(400).json({
        message: 'org_id, source, and token are required',
      });
    }

    await upsertCredential({ org_id, source, token });
    return res.status(201).json({ saved: true });
  } catch (error) {
    return next(error);
  }
};

export const readCredential = async (req, res, next) => {
  try {
    const { org_id, source } = req.query;

    if (!org_id || !source) {
      return res.status(400).json({
        message: 'org_id and source are required',
      });
    }

    const token = await getCredential({ org_id, source });
    if (!token) {
      return res.status(404).json({ message: 'Credential not found' });
    }

    return res.status(200).json({ org_id, source, token });
  } catch (error) {
    return next(error);
  }
};

