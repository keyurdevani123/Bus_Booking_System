const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../model/User");
const Admin = require("../model/Admin");
const { createTransporter } = require("../utils/emailTransport");

// ─── Email helper ────────────────────────────────────────────────────────────
const sendResetEmail = async (toEmail, resetURL) => {
  const transporter = await createTransporter({ secure: true, port: 465 });

  await transporter.sendMail({
    from: `"E-Ticket" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Password Reset Request",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;">
        <div style="background:#000991;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;">E-Ticket — Password Reset</h2>
        </div>
        <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <p>You requested a password reset. Click the button below to set a new password.</p>
          <p style="text-align:center;margin:32px 0;">
            <a href="${resetURL}" style="background:#000991;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px;">Reset Password</a>
          </p>
          <p style="color:#888;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="font-size:12px;color:#aaa;">This is an automated message. Please do not reply.</p>
        </div>
      </div>
    `,
  });
};

// ─── POST /auth/forgot-password ──────────────────────────────────────────────
// Body: { email, type }  — type is "user" or "admin"
const forgotPassword = asyncHandler(async (req, res) => {
  const { email, type } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const Model = type === "admin" ? Admin : User;

  // Admin uses 'email' field; find by email in both
  const user = await Model.findOne({ email });
  if (!user) {
    // Return 200 so we don't leak whether the email exists
    return res.json({ message: "If that email is registered, a reset link has been sent." });
  }

  // Generate raw token and store hashed version
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  // Derive base URL from the request so it works on any IP, domain, or deployment
  const frontendBase = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
  const resetURL = `${frontendBase}/reset-password?token=${rawToken}&type=${type || "user"}`;

  try {
    await sendResetEmail(email, resetURL);
    console.log("Reset email sent to:", email);
    return res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    // Rollback token on email failure
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    console.error("Reset email error:", err.message, err.response || "");
    return res.status(500).json({ message: "Failed to send email. Try again later.", detail: err.message });
  }
});

// ─── POST /auth/reset-password ───────────────────────────────────────────────
// Body: { token, password, type }
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, type } = req.body;
  if (!token || !password) return res.status(400).json({ message: "Token and password are required" });
  if (password.length < 5) return res.status(400).json({ message: "Password must be at least 5 characters" });

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const Model = type === "admin" ? Admin : User;

  const user = await Model.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Token is invalid or has expired" });

  user.password = await bcrypt.hash(password, 10);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ message: "Password reset successful. You can now log in." });
});

module.exports = { forgotPassword, resetPassword };
