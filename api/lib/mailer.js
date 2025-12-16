import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendLoginCodeEmail = async (to, code) => {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || '"Estate UI" <no-reply@estateui.com',
    to,
    subject: "Your EstateUI Login Code",
    text: `Your login code is: ${code}\n\nThis code will expire in 10 minutes.Please do not share this code with anyone.`,
    html: `<p>Your login code is: <b>${Code}</b></p><p>This code will expire in 10 minutes.</p>`,
  });
};
export const sendMagicLinkEmail = async (to, link) => {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || '"Estate UI" <no-reply@estateui.com>',
    to,
    subject: "Your EstateUI Login Link",
    text: `Click the following link to login: ${link}\n\nThis link will expire in 10 minutes.`,
    html: `<p>Click the following link to login: </p><p><a href="${link}">${link}</a></p><p>This link will expire in 10 minutes.</p>`,
  });
};
