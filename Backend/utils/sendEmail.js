const nodemailer = require("nodemailer");

function sendEmailWithAttachment(email, tempBookId) {
  const pdfPath = `/tmp/${tempBookId}.pdf`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"BusBazaar" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your BusBazaar Booking Confirmation",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;">
        <div style="background:#000991;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;">BusBazaar Travel Pass</h2>
        </div>
        <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <p>Hi there,</p>
          <p>Your booking is <strong>confirmed</strong>! Please find your travel pass attached to this email.</p>
          <p style="color:#888;font-size:13px;">Show the QR code on your ticket to the checker at boarding.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="font-size:12px;color:#aaa;">This is an automated message. Please do not reply.</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: "ticket.pdf",
        path: pdfPath,
      },
    ],
  };

  return transporter.sendMail(mailOptions).then((info) => {
    console.log("Email sent to", email, ":", info.response);
  });
}

module.exports = sendEmailWithAttachment;
