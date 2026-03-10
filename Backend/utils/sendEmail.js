const nodemailer = require("nodemailer");
const path = require("path");
const os   = require("os");

function sendEmailWithAttachment(email, tempBookId) {
  const pdfPath = path.join(os.tmpdir(), `${tempBookId}.pdf`);

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

function sendCancellationEmail(email, booking) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  const mailOptions = {
    from: `"BusBazaar" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your BusBazaar Ticket Has Been Cancelled",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;">
        <div style="background:#b91c1c;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;">Booking Cancelled</h2>
        </div>
        <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <p>Hi there,</p>
          <p>Your booking has been <strong style="color:#b91c1c;">cancelled</strong> as requested.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
            <tr style="background:#f9fafb;">
              <td style="padding:8px 12px;color:#6b7280;">Route</td>
              <td style="padding:8px 12px;font-weight:600;">${booking.from} → ${booking.to}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;color:#6b7280;">Date</td>
              <td style="padding:8px 12px;">${booking.date}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:8px 12px;color:#6b7280;">Departure</td>
              <td style="padding:8px 12px;">${booking.departureTime || "—"}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;color:#6b7280;">Seats</td>
              <td style="padding:8px 12px;">${Array.isArray(booking.seats) ? booking.seats.join(", ") : booking.seats}</td>
            </tr>
          </table>
          <p style="color:#888;font-size:13px;">If you did not request this cancellation, please contact support immediately.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="font-size:12px;color:#aaa;">This is an automated message. Please do not reply.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions).then((info) => {
    console.log("Cancellation email sent to", email, ":", info.response);
  });
}

function sendWaitlistNotificationEmail(email, name, details) {
  const { from, to, date, bookingLink, seatsNotified, seatsWanted } = details;
  const remaining = seatsWanted - seatsNotified;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  const mailOptions = {
    from: `"BusBazaar" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `\uD83C\uDF9F\uFE0F Seat Available: ${from} \u2192 ${to} on ${date}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;">
        <div style="background:#059669;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;">\uD83C\uDF9F\uFE0F A Seat Has Opened Up!</h2>
        </div>
        <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Great news! A seat has become available on your waitlisted trip:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
            <tr style="background:#f0fdf4;">
              <td style="padding:8px 12px;color:#6b7280;">Route</td>
              <td style="padding:8px 12px;font-weight:600;">${from} \u2192 ${to}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;color:#6b7280;">Date</td>
              <td style="padding:8px 12px;">${date}</td>
            </tr>
            <tr style="background:#f0fdf4;">
              <td style="padding:8px 12px;color:#6b7280;">Notified</td>
              <td style="padding:8px 12px;">${seatsNotified} of ${seatsWanted} seat${seatsWanted !== 1 ? 's' : ''}</td>
            </tr>
            ${remaining > 0 ? `<tr><td style="padding:8px 12px;color:#6b7280;">Still waiting</td><td style="padding:8px 12px;">${remaining} more seat${remaining !== 1 ? 's' : ''}</td></tr>` : ''}
          </table>
          <p style="text-align:center;margin:24px 0;">
            <a href="${bookingLink}" style="background:#059669;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">🎟️ Book Your Seat Now</a>
          </p>
          <p style="background:#fff7ed;border:1px solid #fb923c;border-radius:6px;padding:10px 14px;color:#c2410c;font-size:13px;text-align:center;">
            ⏰ <strong>You have 30 minutes</strong> to complete your booking.<br>
            After that, the seat will be offered to the next person in queue.
          </p>
          <p style="color:#888;font-size:12px;text-align:center;margin-top:8px;">This link takes you directly to the bus booking page.<br>You must be logged in to complete your booking.</p>
          <p style="color:#888;font-size:13px;">Seats are available on a first-come, first-served basis. Book as soon as possible!</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="font-size:12px;color:#aaa;">This is an automated message. Please do not reply.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions).then((info) => {
    console.log("Waitlist notification sent to", email, ":", info.response);
  });
}

module.exports = { sendEmailWithAttachment, sendCancellationEmail, sendWaitlistNotificationEmail };
