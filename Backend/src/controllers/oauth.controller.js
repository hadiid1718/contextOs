import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/appError.js";
import { setAuthCookies } from "../utils/cookie.js";
import { env } from "../config/env.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { generateAccessToken, generateRefreshToken, generateTokenId } from "../utils/token.js";
import { hashToken } from "../utils/hash.js";

const refreshExpiryDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

export const oauthCallbackSuccess = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new AppError("OAuth authentication failed", 401);
  }

  const tokenId = generateTokenId();

  const accessToken = generateAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    type: "access",
  });

  const refreshToken = generateRefreshToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    type: "refresh",
    tid: tokenId,
  });

  await RefreshToken.create({
    user: user.id,
    tokenId,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiryDate(),
  });

  setAuthCookies(res, accessToken, refreshToken);
  res.redirect(env.oauthSuccessRedirect);
});

export const oauthCallbackFailure = (_req, res) => {
  res.redirect(env.oauthFailureRedirect);
};
