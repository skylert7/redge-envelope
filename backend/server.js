import "dotenv/config";
import crypto from "crypto";
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

function getSessionKey(ip, userAgent) {
  const raw = `${ip || ""}|${userAgent || ""}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}


/** Record user's envelope pick with their info. Rejects if session already picked. */
app.post("/api/record-pick", async (req, res) => {
  try {
    const realIp = getClientIp(req);

    const ip =
      realIp === "127.0.0.1" || realIp === "::1"
        ? "1.55.0.1" // Vietnam test IP
        : realIp;

    const userAgentRaw = req.headers["user-agent"] || "";
    const sessionKey = getSessionKey(ip, userAgentRaw);

    const [sessionRows] = await pool.execute(
      `SELECT has_picked, picked_amount FROM sessions WHERE session_key = ?`,
      [sessionKey]
    );
    if (sessionRows.length > 0 && sessionRows[0].has_picked) {
      return res.status(409).json({
        ok: false,
        error: "Already picked",
        picked_amount: sessionRows[0].picked_amount,
      });
    }

    const geo = geoip.lookup(ip);
    const country = geo?.country || "Unknown";
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

    await pool.execute(
      `UPDATE sessions SET has_picked = 1, picked_amount = ?, name = ? WHERE session_key = ?`,
      [amount ?? 0, name, sessionKey]
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

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function shuffleArrayWithSeed(arr, seed) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = Math.floor(seededRandom(seed) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Assign amounts to each envelope at start. Amounts are pre-assigned, not random at pick time.
 *  Session is persisted by IP + user agent so the same visitor gets the same amounts on refresh.
 */
app.get("/api/envelopes", async (req, res) => {
  try {
    const realIp = getClientIp(req);
    const ip =
      realIp === "127.0.0.1" || realIp === "::1"
        ? "1.55.0.1" // Vietnam test IP
        : realIp;
    const userAgentRaw = req.headers["user-agent"] || "";
    const sessionKey = getSessionKey(ip, userAgentRaw);

    const [rows] = await pool.execute(
      `SELECT shuffle_seed, country, has_picked, picked_amount FROM sessions WHERE session_key = ?`,
      [sessionKey]
    );

    const geo = geoip.lookup(ip);
    const country = geo?.country || "Unknown";
    const options = country === "VN"
      ? [100000, 200000, 260000]
      : [10, 20, 26];

    if (rows.length > 0) {
      const session = rows[0];
      const amounts = shuffleArrayWithSeed(options, session.shuffle_seed);
      return res.json({
        ok: true,
        amounts,
        country: session.country || "Unknown",
        has_picked: !!session.has_picked,
        picked_amount: session.picked_amount ?? null,
      });
    }

    const shuffleSeed = Math.floor(Math.random() * 1e9);
    const amounts = shuffleArrayWithSeed(options, shuffleSeed);

    const name = req.query?.name || null;
    await pool.execute(
      `INSERT INTO sessions (session_key, ip, user_agent_raw, name, shuffle_seed, country)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionKey, ip, userAgentRaw, name, shuffleSeed, country]
    );

    res.json({
      ok: true,
      amounts,
      country,
      has_picked: false,
      picked_amount: null,
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
