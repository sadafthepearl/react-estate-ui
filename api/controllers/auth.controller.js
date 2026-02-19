import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import crypto from "crypto";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helpers
const EMAIL_CODE_EXP_MINUTES = Number(process.env.EMAIL_CODE_EXP_MINUTES || 10);
const MAGIC_LINK_EXP_MINUTES = Number(process.env.MAGIC_LINK_EXP_MINUTES || 10);

// 7 days in ms (your existing logic)
const JWT_AGE_MS = 1000 * 60 * 60 * 24 * 7;

const sha256Hex = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const getApiBaseUrl = (req) => {
  const raw = String(process.env.API_URL || "").replace(/\/+$/, "");
  if (raw) return raw.endsWith("/api") ? raw : `${raw}/api`;

  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req?.protocol || "http";
  const host = req?.get?.("host");
  if (!host) return "";
  return `${protocol}://${host}/api`;
};

const getAppBaseUrl = (req) => {
  const raw = String(process.env.APP_URL || "").replace(/\/+$/, "");
  if (raw) return raw;

  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req?.protocol || "http";
  const host = req?.get?.("host");
  if (!host) return "";
  return `${protocol}://${host}`;
};

const issueEmailCode = async (userId) => {
  const code = crypto.randomInt(100000, 999999).toString();
  const expires = new Date(Date.now() + EMAIL_CODE_EXP_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: { emailLoginCode: code, emailLoginExpires: expires },
  });

  return { code };
};

const issueMagicLink = async (userId, req) => {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenId = sha256Hex(token);
  const hashedToken = await bcrypt.hash(token, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      magicLoginToken: hashedToken,
      magicLoginTokenId: tokenId,
      magicLoginExpires: new Date(Date.now() + MAGIC_LINK_EXP_MINUTES * 60 * 1000),
    },
  });

  const apiBase = getApiBaseUrl(req);
  if (!apiBase) {
    throw new Error("Unable to build API base URL for magic link");
  }
  return `${apiBase}/auth/magic-link/consume?token=${encodeURIComponent(token)}`;
};

const setAuthCookie = (res, token) => {
  // NOTE: For production you likely want secure:true.
  // If you're testing on http://localhost, secure:true will prevent the cookie from being set.
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    maxAge: JWT_AGE_MS,
    secure: isProd, // set to true on HTTPS
    sameSite: "lax",
    // If you use subdomains, you may need:
    // domain: process.env.COOKIE_DOMAIN || undefined,
  });
};

export const loginWithEmail = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const { code } = await issueEmailCode(user.id);

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Your login code",
      html: `<p>Your login code is: <b>${code}</b></p><p>Expires in ${EMAIL_CODE_EXP_MINUTES} minutes.</p>`,
    });

    res.json({ message: "Login code sent" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to send code" });
  }
};

export const verifyEmailCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        email,
        emailLoginCode: code,
        emailLoginExpires: { gt: new Date() },
      },
    });

    if (!user) return res.status(400).json({ message: "Invalid/expired code" });

    await prisma.user.update({
      where: { id: user.id },
      data: { emailLoginCode: null, emailLoginExpires: null },
    });

    const token = jwt.sign(
      { id: user.id, isAdmin: false },
      process.env.JWT_SECRET_KEY,
      { expiresIn: JWT_AGE_MS },
    );

    const { password, ...userInfo } = user;

    setAuthCookie(res, token);
    res.json(userInfo);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Login failed" });
  }
};

export const register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    try {
      const magicLink = await issueMagicLink(user.id, req);

      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: email,
        subject: "Welcome to EstateUI - sign in",
        html: `
          <p>Your account was created successfully.</p>
          <p>Use this magic link to sign in (expires in ${MAGIC_LINK_EXP_MINUTES} minutes):</p>
          <a href="${magicLink}">Sign in</a>
        `,
      });
    } catch (mailErr) {
      console.error("Register email delivery failed:", mailErr);
    }

    res.status(201).json({
      message: "User created successfully! Check your email for your magic link.",
    });
  } catch (err) {
    console.error("Prisma Error:", err);
    if (err?.code === "P2002") {
      const target = Array.isArray(err?.meta?.target)
        ? err.meta.target.join(",")
        : String(err?.meta?.target || "");

      if (target.includes("email")) {
        return res.status(409).json({ message: "Email already exists!" });
      }
      if (target.includes("username")) {
        return res.status(409).json({ message: "Username already exists!" });
      }
    }
    res.status(500).json({ message: "Failed to create user!" });
  }
};

export const sendMagicLink = async (req, res) => {
  const email = req.body?.email || req.query?.email;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found!" });
    const magicLink = await issueMagicLink(user.id, req);

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Your magic login link",
      html: `
        <p>Click the link below to log in:</p>
        <a href="${magicLink}">Sign in</a>
        <p>This link expires in ${MAGIC_LINK_EXP_MINUTES} minutes.</p>
      `,
    });

    res.json({ message: "Magic link sent to email!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send magic link!" });
  }
};

// NEW: user clicks email link -> logs in
export const consumeMagicLink = async (req, res) => {
  try {
    const token = String(req.query.token || req.params.token || "");
    const appBase = getAppBaseUrl(req);
    if (!appBase) {
      return res.status(500).send("APP_URL is not configured");
    }

    if (!token || token.length < 20) {
      return res.redirect(`${appBase}/login?error=invalid_link`);
    }

    const tokenId = sha256Hex(token);

    // Find user by tokenId + not expired
    const user = await prisma.user.findFirst({
      where: {
        magicLoginTokenId: tokenId,
        magicLoginExpires: { gt: new Date() },
      },
    });

    if (!user || !user.magicLoginToken) {
      return res.redirect(`${appBase}/login?error=expired_or_used`);
    }

    // Verify token against stored bcrypt hash (extra safety)
    const ok = await bcrypt.compare(token, user.magicLoginToken);
    if (!ok) {
      return res.redirect(`${appBase}/login?error=expired_or_used`);
    }

    // One-time use: clear fields immediately
    await prisma.user.update({
      where: { id: user.id },
      data: {
        magicLoginToken: null,
        magicLoginTokenId: null,
        magicLoginExpires: null,
      },
    });

    // If 2FA is enabled, require it (mirror your password login behavior)
    if (user.twoFactorEnabled) {
      // Note: redirecting because this is a GET from email.
      // Your frontend can read query params and continue 2FA flow.
      return res.redirect(
        `${appBase}/login?requires2FA=true&userId=${encodeURIComponent(user.id)}`,
      );
    }

    const jwtToken = jwt.sign(
      { id: user.id, isAdmin: false },
      process.env.JWT_SECRET_KEY,
      { expiresIn: JWT_AGE_MS },
    );

    setAuthCookie(res, jwtToken);

    // Redirect to login page after magic-link authentication.
    return res.redirect(`${appBase}/login?magic=success`);
  } catch (e) {
    console.error(e);
    const appBase = getAppBaseUrl(req);
    if (!appBase) return res.status(500).send("APP_URL is not configured");
    return res.redirect(`${appBase}/login?error=server_error`);
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials!" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid Credentials!" });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return res.status(200).json({
        message: "2FA Required",
        requires2FA: true,
        userId: user.id,
      });
    }

    const token = jwt.sign(
      { id: user.id, isAdmin: false },
      process.env.JWT_SECRET_KEY,
      { expiresIn: JWT_AGE_MS },
    );

    const { password: userPassword, ...userInfo } = user;

    setAuthCookie(res, token);
    res.status(200).json(userInfo);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Failed to login!" });
  }
};

export const enable2FA = async (req, res) => {
  try {
    const userId = req.userId;

    const secret = speakeasy.generateSecret({
      name: `EstateUI (${userId})`,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to enable 2FA!" });
  }
};

export const verify2FA = async (req, res) => {
  const { token } = req.body;
  const userId = req.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
    });

    if (verified) {
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      });

      res.status(200).json({ message: "2FA Enabled Successfully!" });
    } else {
      res.status(400).json({ message: "Invalid 2FA Token!" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to verify 2FA!" });
  }
};

export const verifyLogin2FA = async (req, res) => {
  const { userId, token } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
    });

    if (verified) {
      const jwtToken = jwt.sign(
        { id: user.id, isAdmin: false },
        process.env.JWT_SECRET_KEY,
        { expiresIn: JWT_AGE_MS },
      );

      const { password: userPassword, ...userInfo } = user;

      setAuthCookie(res, jwtToken);
      res.status(200).json(userInfo);
    } else {
      res.status(400).json({ message: "Invalid 2FA token!" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to verify 2FA!" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token").status(200).json({ message: "Logout Successful!" });
};
