import express from "express";
import {
  login,
  logout,
  register,
  enable2FA,
  verify2FA,
  verifyLogin2FA,
  me,
  loginWithEmail,
  verifyEmailCode,
  sendMagicLink,
  consumeMagicLink,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.post("/login-email", loginWithEmail);
router.post("/verify-email-code", verifyEmailCode);

router.get("/magic-link", sendMagicLink);

router.get("/magic-link/consume", consumeMagicLink);
router.get("/magic-link/:token", consumeMagicLink);

router.post("/magic-link", sendMagicLink);

router.post("/enable-2fa", verifyToken, enable2FA);
router.post("/verify-2fa", verifyToken, verify2FA);
router.post("/verify-login-2fa", verifyLogin2FA);
router.get("/me", verifyToken, me);

router.post("/logout", logout);

export default router;
