import express from "express";
import {
  login,
  logout,
  register,
  enable2FA,
  verify2FA,
  verifyLogin2FA,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/enable-2fa", verifyToken, enable2FA);
router.post("/verify-2fa", verifyToken, verify2FA);
router.post("/verify-login-2fa", verifyLogin2FA);

export default router;
