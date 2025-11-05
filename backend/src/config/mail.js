import nodemailer from 'nodemailer';
import config from './env.js';

const transporter = nodemailer.createTransport({
  host: config.MAIL_HOST,
  port: config.MAIL_PORT,
  secure: true,
  auth: {
    user: config.MAIL_USER,
    pass: config.MAIL_PASS,
  },
});

export default transporter;