// utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'abhisheks@pearlorganisation.com',
    pass: 'exrwrloeisbbypdz' // your app password
  }
});

module.exports = transporter;
