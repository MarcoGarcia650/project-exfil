import { prisma } from "../lib/prisma.js";
// TODO (you): import bcrypt and jsonwebtoken

// POST /auth/signup
// Body: { email, password, branch, targetField?, separationDate? }
export async function signup(req, res) {
  // TODO:
  // 1. Pull email, password, branch (+ optional targetField, separationDate)
  //    off req.body.
  // 2. Hash the password — bcrypt.hash(plainPassword, saltRounds).
  //    10 is a reasonable saltRounds default.
  // 3. Create the User via prisma.user.create({ data: { ... } }), storing
  //    the HASH as passwordHash — never the plaintext password.
  //    Watch out: email is @unique on the model. What happens if you
  //    call create() with a duplicate email? Look up Prisma's P2002
  //    error code and decide what status/message to send back.
  // 4. Issue a JWT — jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "..." }).
  //    Keep the payload minimal (just the user's id) — you can always look
  //    up the rest of the user's data from the DB when you actually need it.
  // 5. Respond with the token (don't include passwordHash in the response).
}

// POST /auth/login
// Body: { email, password }
export async function login(req, res) {
  // TODO:
  // 1. Pull email, password off req.body.
  // 2. Find the user by email — prisma.user.findUnique({ where: { email } }).
  // 3. If no user is found, OR bcrypt.compare(password, user.passwordHash)
  //    fails, return 401. Use the SAME status/message for both cases —
  //    think about why a distinct "no account with that email" message
  //    vs. "wrong password" message would be a problem.
  // 4. If it matches, issue a JWT the same way as signup.
}
