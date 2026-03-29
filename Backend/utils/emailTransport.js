const dns = require("dns");
const nodemailer = require("nodemailer");
const fs = require("fs");

const GMAIL_HOSTNAME = "smtp.gmail.com";
const RESEND_DEFAULT_FROM = "BusBazaar <onboarding@resend.dev>";
const DEFAULT_MAIL_RECIPIENT = process.env.MAIL_OVERRIDE_TO || "devanikeyur19@gmail.com";
const PERSONAL_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);
let cachedIpv4Host = null;

const resolveSmtpHost = async () => {
  if (cachedIpv4Host) {
    return cachedIpv4Host;
  }

  try {
    const result = await dns.promises.lookup(GMAIL_HOSTNAME, { family: 4 });
    if (result && result.address) {
      cachedIpv4Host = result.address;
      return cachedIpv4Host;
    }
  } catch (err) {
    console.error("IPv4 SMTP lookup failed, falling back to hostname:", err.message);
  }

  return GMAIL_HOSTNAME;
};

const createTransporter = async ({ secure = false, port = secure ? 465 : 587 } = {}) => {
  const host = await resolveSmtpHost();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    requireTLS: !secure,
    tls: {
      servername: GMAIL_HOSTNAME,
      rejectUnauthorized: false,
    },
  });
};

const normalizeRecipients = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

const resolveRecipients = () => {
  const recipients = normalizeRecipients(DEFAULT_MAIL_RECIPIENT).filter(Boolean);
  return recipients.length > 0 ? recipients : [];
};

const normalizeAttachment = (attachment) => {
  if (!attachment) return null;
  if (attachment.content && attachment.filename) {
    return {
      filename: attachment.filename,
      content: Buffer.isBuffer(attachment.content)
        ? attachment.content.toString("base64")
        : String(attachment.content),
    };
  }

  if (attachment.path && attachment.filename && fs.existsSync(attachment.path)) {
    return {
      filename: attachment.filename,
      content: fs.readFileSync(attachment.path).toString("base64"),
    };
  }

  return null;
};

const extractEmailAddress = (value = "") => {
  const match = String(value).match(/<([^>]+)>/);
  return (match ? match[1] : String(value)).trim().toLowerCase();
};

const isUnsafeResendSender = (value = "") => {
  const email = extractEmailAddress(value);
  const domain = email.split("@")[1] || "";
  return !email || PERSONAL_MAIL_DOMAINS.has(domain);
};

const buildResendPayload = (mailOptions, from) => {
  const payload = {
    from,
    to: resolveRecipients(mailOptions.to),
    subject: mailOptions.subject,
    html: mailOptions.html,
  };

  const attachments = (mailOptions.attachments || [])
    .map(normalizeAttachment)
    .filter(Boolean);
  if (attachments.length > 0) {
    payload.attachments = attachments;
  }

  return payload;
};

const sendResendRequest = async (payload) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || result?.error || `Resend API failed with status ${response.status}`);
  }

  return { response: `Resend ${result.id || "accepted"}` };
};

const sendWithResend = async (mailOptions) => {
  const configuredFrom = process.env.RESEND_FROM_EMAIL || "";
  const allowCustomFrom = String(process.env.RESEND_USE_CONFIGURED_FROM || "").toLowerCase() === "true";
  const preferredFrom = allowCustomFrom && !isUnsafeResendSender(configuredFrom)
    ? configuredFrom
    : RESEND_DEFAULT_FROM;

  try {
    return await sendResendRequest(buildResendPayload(mailOptions, preferredFrom || RESEND_DEFAULT_FROM));
  } catch (err) {
    const message = String(err.message || "");
    const shouldRetryWithDefault =
      preferredFrom !== RESEND_DEFAULT_FROM &&
      /domain is not verified|verify your domain|testing emails/i.test(message);

    if (!shouldRetryWithDefault) {
      throw err;
    }

    return sendResendRequest(buildResendPayload(mailOptions, RESEND_DEFAULT_FROM));
  }
};

const sendMail = async (mailOptions, transportOptions = { secure: false, port: 587 }) => {
  const outboundMailOptions = {
    ...mailOptions,
    to: resolveRecipients(mailOptions.to),
  };

  if (process.env.RESEND_API_KEY) {
    return sendWithResend(outboundMailOptions);
  }

  const transporter = await createTransporter(transportOptions);
  try {
    return await transporter.sendMail(outboundMailOptions);
  } catch (err) {
    if (["ETIMEDOUT", "ESOCKET", "ECONNREFUSED", "ENETUNREACH"].includes(err.code || "")) {
      err.message = `${err.message}. SMTP connection failed. On Render free web services, outbound SMTP ports 25/465/587 are blocked. Configure RESEND_API_KEY + RESEND_FROM_EMAIL or upgrade the Render service plan.`;
    }
    throw err;
  }
};

module.exports = { createTransporter, sendMail, GMAIL_HOSTNAME };
