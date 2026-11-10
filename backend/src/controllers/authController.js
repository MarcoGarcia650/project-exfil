import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { issueSessionToken } from "../lib/tokens.js";
import { hashResetToken } from "../lib/passwordReset.js";
import { parseSignup, normalizeEmail, validatePassword, validateUsername, usernameKey } from "../lib/accountRules.js";

const BCRYPT_ROUNDS = 10;

// Emails are stored lowercase from now on, but rows created before that may
// have capitals. Matching case-insensitively covers both until
// prisma/normalize-emails.js has been run everywhere.
const findByEmail = (email) =>
  prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });

// POST /auth/signup
// Body: { email, password, username, branch, targetField?, separationDate? }
export async function signup(req, res) {
  const { error, data } = parseSignup(req.body);
  if (error) return res.status(400).json({ error });

  if (await findByEmail(data.email)) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const { password, username, ...fields } = data;
  let user;
  try {
    user = await prisma.user.create({
      data: {
        ...fields,
        username,
        usernameKey: usernameKey(username),
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      },
    });
  } catch (err) {
    // P2002 = unique constraint; covers races past the checks above.
    if (err.code === "P2002") {
      const field = String(err.meta?.target ?? "");
      return res.status(409).json({
        error: field.includes("username")
          ? "That username is taken"
          : "An account with that email already exists",
      });
    }
    throw err;
  }

  res.status(201).json({ token: issueSessionToken(user) });
}

// POST /auth/login
// Body: { email, password }
// Same 401 for unknown email and wrong password, so the response doesn't
// reveal which emails have accounts.
export async function login(req, res) {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ token: issueSessionToken(user) });
}

// GET /auth/me — auth required. The signed-in user's own account info.
export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { email: true, username: true, branch: true, role: true, suspendedAt: true },
  });
  res.json({
    email: user.email,
    username: user.username,
    branch: user.branch,
    role: user.role,
    suspended: user.suspendedAt !== null,
  });
}

// POST /auth/username — auth required. Body: { username }
// For accounts created before usernames existed. Changes are out of scope
// for this version, so it only works while the username is still unset.
export async function setUsername(req, res) {
  const { username } = req.body ?? {};
  const error = validateUsername(username);
  if (error) return res.status(400).json({ error });

  try {
    const { count } = await prisma.user.updateMany({
      where: { id: req.user.userId, username: null },
      data: { username, usernameKey: usernameKey(username) },
    });
    if (count === 0) {
      return res.status(409).json({ error: "Your username is already set and can't be changed" });
    }
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "That username is taken" });
    throw err;
  }
  res.json({ username });
}

// POST /auth/reset-password — public. Body: { token, password }
// Completes a reset from an admin-issued link. Sets the new password,
// bumps tokenVersion (ending every existing session) and uses up the
// token, all in one transaction. Doesn't log the user in: they log in
// with the new password, which confirms it works.
export async function resetPassword(req, res) {
  const { token, password } = req.body ?? {};
  const passwordError = validatePassword(password);
  if (typeof token !== "string" || !token) {
    return res.status(400).json({ error: "This reset link is invalid" });
  }
  if (passwordError) return res.status(400).json({ error: passwordError });

  const INVALID = { error: "This reset link is invalid or has expired. Ask for a new one." };
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json(INVALID);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const done = await prisma.$transaction(async (tx) => {
    // Conditional update: if two requests race with the same token, only
    // the one that flips usedAt from null proceeds.
    const { count } = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) return false;
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    return true;
  });

  if (!done) return res.status(400).json(INVALID);
  res.json({ ok: true });
}
