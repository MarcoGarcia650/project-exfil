import { rateLimit } from "express-rate-limit";
import { normalizeEmail } from "../lib/accountRules.js";

// In-memory stores: fine on the single-instance Elastic Beanstalk setup.
// Limits reset on restart, which is acceptable for this scale.
//
// IP keys depend on Express's `trust proxy` (set in app.js from
// TRUST_PROXY). Until that is verified against the real CloudFront → nginx
// chain, production IP limits may see every visitor as the proxy's IP, so
// the per-email limit is the one to rely on for credential guessing.

const message = (what) => ({ error: `Too many ${what}. Please wait a few minutes and try again.` });

const WINDOW_MS = 15 * 60 * 1000;

export const loginIpLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("login attempts"),
});

// Per account: stops guessing one person's password from many IPs.
// Only failed attempts count, so a user who logs in fine is never blocked.
export const loginEmailLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => normalizeEmail(req.body?.email) ? `email:${normalizeEmail(req.body.email)}` : `ip:${req.ip}`,
  message: message("login attempts for this account"),
});

export const signupIpLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("sign-up attempts"),
});

export const resetIpLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("password reset attempts"),
});
