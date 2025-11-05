const nodemailer = require('nodemailer');
const config = require('./env');

const transporter = nodemailer.createTransport({
  host: config.MAIL_HOST,
  port: config.MAIL_PORT,
  secure: true,
  auth: {
    user: config.MAIL_USER,
    pass: config.MAIL_PASS,
  },
});

module.exports = transporter;