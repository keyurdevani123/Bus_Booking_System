const dns = require("dns");
const nodemailer = require("nodemailer");

const GMAIL_HOSTNAME = "smtp.gmail.com";
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

module.exports = { createTransporter, GMAIL_HOSTNAME };
