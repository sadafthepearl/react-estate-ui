import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

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
