import { AppError } from "../utils/appError.js";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../utils/token.js";

export const requireAuth = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const cookieToken = req.cookies?.[env.accessCookieName];
  const token = bearerToken || cookieToken;

  if (!token) {
    return next(new AppError("Authentication required", 401));
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = payload;
    return next();
  } catch {
    return next(new AppError("Invalid or expired access token", 401));
  }
};
