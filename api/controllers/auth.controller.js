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

export const loginWithEmail = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailLoginCode: code, emailLoginExpires: expires },
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Your login code",
      html: `<p>Your login code is: <b>${code}</b></p><p>Expires in 10 minutes.</p>`,
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

    const age = 1000 * 60 * 60 * 24 * 7;
    const token = jwt.sign(
      { id: user.id, isAdmin: false },
      process.env.JWT_SECRET_KEY,
      { expiresIn: age }
    );

    const { password, ...userInfo } = user;

    res.cookie("token", token, { httpOnly: true, maxAge: age }).json(userInfo);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Login failed" });
  }
};

export const register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json({ message: "User created successfully!" });
  } catch (err) {
    console.error("Prisma Error:", err);
    res.status(500).json({ message: "Failed to create user!" });
  }
};

export const sendMagicLink = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found!" });

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(token, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        magicLoginToken: hashedToken,
        magicLoginExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const magicLink = `${process.env.APP_URL}/auth/magic-login?token=${token}`;

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Your magic login link",
      html: `
        <p>Click the link below to log in:</p>
        <a href="${magicLink}">${magicLink}</a>
        <p>This link expires in 10 minutes.</p>
      `,
    });

    res.json({ message: "Magic link sent to email!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send magic link!" });
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

    // Normal login without 2FA
    const age = 1000 * 60 * 60 * 24 * 7;

    const token = jwt.sign(
      {
        id: user.id,
        isAdmin: false,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: age }
    );

    const { password: userPassword, ...userInfo } = user;

    res
      .cookie("token", token, {
        httpOnly: true,
        maxAge: age,
      })
      .status(200)
      .json(userInfo);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Failed to login!" });
  }
};

export const enable2FA = async (req, res) => {
  try {
    const userId = req.userId;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `EstateUI (${userId})`,
    });

    // Save secret to database
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    // Generate QR code
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
      const age = 1000 * 60 * 60 * 24 * 7;
      const jwtToken = jwt.sign(
        {
          id: user.id,
          isAdmin: false,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: age }
      );

      const { password: userPassword, ...userInfo } = user;

      res
        .cookie("token", jwtToken, {
          httpOnly: true,
          maxAge: age,
        })
        .status(200)
        .json(userInfo);
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
