import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// POST /auth/signup
// Body: { email, password, branch, targetField?, separationDate? }
export async function signup(req, res) {
  const { email, password, branch, targetField, separationDate } = req.body;

  // 2. Hash the password — bcrypt.hash(plainPassword, saltRounds).
  //    10 is a reasonable saltRounds default.
  const passwordHash = await bcrypt.hash(password, 10);

  // 3. Create the User via prisma.user.create({ data: { ... } }), storing
  //    the HASH as passwordHash — never the plaintext password.
  //    Watch out: email is @unique on the model. What happens if you
  //    call create() with a duplicate email? Look up Prisma's P2002
  //    error code and decide what status/message to send back.
let user;
try {
  user = await prisma.user.create({
    data: { email, passwordHash, branch, targetField, separationDate },
  });
} catch (err) {
  if(err.code === "P2002"){
    return res.status(409).json({error: "An account with that email already exists"});
  }
  throw err;
}

  // 4. Issue a JWT — jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "..." }).
  //    Keep the payload minimal (just the user's id) — you can always look
  //    up the rest of the user's data from the DB when you actually need it.
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  // 5. Respond with the token (don't include passwordHash in the response).
res.status(201).json({token});

}

// POST /auth/login
// Body: { email, password }
export async function login(req, res) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // 3. If no user is found, OR bcrypt.compare(password, user.passwordHash)
  //    fails, return 401. Use the SAME status/message for both cases —
  //    think about why a distinct "no account with that email" message
  //    vs. "wrong password" message would be a problem.
if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
  return res.status(401).json({ error: "Invalid email or password" });
}

  // 4. If it matches, issue a JWT the same way as signup.
const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
res.json({ token });
}
