import jwt from "jsonwebtoken";

// `tv` is the user's tokenVersion at issue time; requireAuth rejects the
// token once the version moves on (e.g. after a password reset).
export function issueSessionToken(user) {
  return jwt.sign({ userId: user.id, tv: user.tokenVersion }, process.env.JWT_SECRET, { expiresIn: "7d" });
}
