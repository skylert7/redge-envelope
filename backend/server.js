import "dotenv/config";
import express from "express";
import mysql from "mysql2/promise";
import uaParser from "ua-parser-js";
import geoip from "geoip-lite";

const app = express();
app.use(express.json());

// Important if behind nginx later
app.set("trust proxy", true);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length)
    return xff.split(",")[0].trim();
  return req.ip || "";
}


/** Record user's envelope pick with their info. */
app.post("/api/record-pick", async (req, res) => {
  try {
    const realIp = getClientIp(req);

    const ip =
      realIp === "127.0.0.1" || realIp === "::1"
        ? "1.55.0.1" // Vietnam test IP
        : realIp;

    const geo = geoip.lookup(ip);
    const country = geo?.country || "Unknown";

    const userAgentRaw = req.headers["user-agent"] || "";
    const ua = uaParser(userAgentRaw);

    const name = req.body?.name || "Anonymous";
    const selectedEnvelope = req.body?.selectedEnvelope ?? null;
    const amount = req.body?.amount ?? null;
    const clientHints = req.body?.clientHints ?? null;

    const clientHintsJson = JSON.stringify({
      ...(clientHints || {}),
      selectedEnvelope,
      amount,
    });

    const [result] = await pool.execute(
      `INSERT INTO visits
       (name, ip, user_agent_raw, ua_json, lucky_money_amount, client_hints)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        ip,
        userAgentRaw,
        JSON.stringify(ua),
        amount ?? 0,
        clientHintsJson,
      ]
    );

    res.json({
      ok: true,
      id: result.insertId,
      country,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Assign amounts to each envelope at start. Amounts are pre-assigned, not random at pick time. */
app.get("/api/envelopes", (req, res) => {
  try {
    const realIp = getClientIp(req);

    const ip =
      realIp === "127.0.0.1" || realIp === "::1"
        ? "1.55.0.1" // Vietnam test IP
        : realIp;

    const geo = geoip.lookup(ip);
    const country = geo?.country || "Unknown";

    const options = country === "VN"
      ? [100000, 200000, 260000]
      : [10, 20, 26];

    const amounts = shuffleArray(options);

    res.json({
      ok: true,
      amounts,
      country,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

app.get("/api/visits", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM visits ORDER BY id DESC LIMIT 50`
  );
  res.json(rows);
});

app.listen(process.env.PORT, () => {
  console.log(`API running on port ${process.env.PORT}`);
});
