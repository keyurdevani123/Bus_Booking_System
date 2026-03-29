const allowedOrigins = require("./allowedOrigins");

const corsOptions = {
  origin: (origin, callback) => {
    // Allow REST clients/postman or same-origin server calls with no Origin header
    if (!origin) return callback(null, true);

    // Comma-separated override for production deploys
    const envOrigins = (process.env.CORS_ORIGINS || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);

    const localDevOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

    const allowlist = [...new Set([...allowedOrigins, ...envOrigins, ...localDevOrigins])];

    // Allow any Vercel preview/production domain for this frontend repo pattern.
    // If you want stricter security, keep only explicit origins in CORS_ORIGINS.
    if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    if (allowlist.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
