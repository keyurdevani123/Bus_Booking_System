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

    const allowlist = [...new Set([...allowedOrigins, ...envOrigins])];

    if (allowlist.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
