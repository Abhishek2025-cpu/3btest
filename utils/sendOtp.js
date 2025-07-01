const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
   user: 'abhisheks@pearlorganisation.com',
    pass: 'tlxwyqbovwbcpfuh' // your app password
  }
});

exports.sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"Admin Auth" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your OTP for Admin Update',
    html: `<h3>Your OTP is: ${otp}</h3><p>It expires in 5 minutes.</p>`
  });
};
