import { env } from "../config/env.js";

const accessMaxAgeMs = 15 * 60 * 1000;
const refreshMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

const baseCookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  domain: env.cookieDomain,
  path: "/",
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(env.accessCookieName, accessToken, {
    ...baseCookieOptions,
    maxAge: accessMaxAgeMs,
  });

  res.cookie(env.refreshCookieName, refreshToken, {
    ...baseCookieOptions,
    maxAge: refreshMaxAgeMs,
  });
};

export const clearAuthCookies = (res) => {
  res.clearCookie(env.accessCookieName, baseCookieOptions);
  res.clearCookie(env.refreshCookieName, baseCookieOptions);
};
