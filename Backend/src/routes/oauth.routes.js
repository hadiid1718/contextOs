import { Router } from "express";
import passport from "passport";

import {
  oauthCallbackFailure,
  oauthCallbackSuccess,
} from "../controllers/oauth.controller.js";

const oauthRouter = Router();

oauthRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

oauthRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/v1/auth/oauth/failure",
  }),
  oauthCallbackSuccess
);

oauthRouter.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"], session: false })
);

oauthRouter.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: "/api/v1/auth/oauth/failure",
  }),
  oauthCallbackSuccess
);

oauthRouter.get("/failure", oauthCallbackFailure);

export { oauthRouter };
