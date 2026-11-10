import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

// Protects routes that require a logged-in user. Expects
// `Authorization: Bearer <token>`.
//
// The JWT only proves who the user *was* when it was issued (it lasts 7
// days), so the user row is loaded on every request:
//   - a deleted user, or a token issued before a password reset
//     (tokenVersion mismatch), gets 401 — old sessions end immediately;
//   - role and suspension are read fresh here, never from the token.
// req.user = { userId, role, username, suspended }
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  let payload;
  try {
    payload = jwt.verify(authHeader.slice("Bearer ".length), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, username: true, suspendedAt: true, tokenVersion: true },
  });

  // Tokens issued before tokenVersion existed carry no `tv`; treat as 0 so
  // existing sessions keep working until the user's first reset.
  if (!user || user.tokenVersion !== (payload.tv ?? 0)) {
    return res.status(401).json({ error: "Your session has ended. Please log in again." });
  }

  req.user = {
    userId: user.id,
    role: user.role,
    username: user.username,
    suspended: user.suspendedAt !== null,
  };
  next();
}

// For write routes, after requireAuth. A suspended account is read-only:
// it can still log in and see its own data, but can't change anything.
export function requireActiveAccount(req, res, next) {
  if (req.user.suspended) {
    return res.status(403).json({ error: "This account is suspended and is read-only." });
  }
  next();
}

// For admin routes, after requireAuth. The role comes from the DB row
// requireAuth just loaded, so granting or revoking admin takes effect on
// the next request. Admin rights are granted only by prisma/make-admin.js.
export function requireAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
}
