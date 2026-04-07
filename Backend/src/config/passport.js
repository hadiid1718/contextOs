import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { env } from "./env.js";
import { User } from "../models/User.js";

const normalizeProfileEmail = (profile) => {
  if (profile?.emails?.length) {
    return profile.emails[0].value.toLowerCase();
  }

  if (profile.username) {
    return `${profile.username}-${profile.id}@users.noreply.github.com`;
  }

  return null;
};

const findOrCreateOAuthUser = async ({ provider, providerId, profile }) => {
  const email = normalizeProfileEmail(profile);
  if (!email) {
    throw new Error("OAuth profile does not include an email");
  }

  const providerKey = provider === "google" ? "authProviders.googleId" : "authProviders.githubId";

  let user = await User.findOne({ [providerKey]: providerId });
  if (user) {
    return user;
  }

  user = await User.findOne({ email });
  if (user) {
    user.authProviders = {
      ...user.authProviders,
      ...(provider === "google" ? { googleId: providerId } : { githubId: providerId }),
    };
    user.emailVerified = true;
    await user.save();
    return user;
  }

  const displayName = profile.displayName || profile.username || "New User";
  user = await User.create({
    name: displayName,
    email,
    role: "member",
    emailVerified: true,
    authProviders:
      provider === "google"
        ? { googleId: providerId }
        : { githubId: providerId },
  });

  return user;
};

export const configurePassport = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser({
            provider: "google",
            providerId: profile.id,
            profile,
          });
          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );

  passport.use(
    new GitHubStrategy(
      {
        clientID: env.githubClientId,
        clientSecret: env.githubClientSecret,
        callbackURL: env.githubCallbackUrl,
        scope: ["user:email"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser({
            provider: "github",
            providerId: profile.id,
            profile,
          });
          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );
};
