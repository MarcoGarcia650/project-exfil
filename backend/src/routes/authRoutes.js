import { Router } from "express";
import { signup, login, me, setUsername, resetPassword } from "../controllers/authController.js";
import { requireAuth, requireActiveAccount } from "../middleware/requireAuth.js";
import { loginIpLimit, loginEmailLimit, signupIpLimit, resetIpLimit } from "../middleware/rateLimits.js";

const router = Router();

router.post("/signup", signupIpLimit, signup);
router.post("/login", loginIpLimit, loginEmailLimit, login);
router.get("/me", requireAuth, me);
router.post("/username", requireAuth, requireActiveAccount, setUsername);
router.post("/reset-password", resetIpLimit, resetPassword);

export default router;
