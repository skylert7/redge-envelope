import "dotenv/config";
import express from "express";
import mysql from "mysql2/promise";
import uaParser from "ua-parser-js";

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

app.post("/api/track", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const userAgentRaw = req.headers["user-agent"] || "";
    const ua = uaParser(userAgentRaw);

    const name = req.body?.name || "Anonymous";
    const luckyMoney = req.body?.lucky_money_amount || 0;
    const clientHints = req.body?.clientHints ?? null;

    const [result] = await pool.execute(
      `INSERT INTO visits 
       (name, ip, user_agent_raw, ua_json, lucky_money_amount, client_hints)
       VALUES (?, ?, ?, CAST(? AS JSON), ?, CAST(? AS JSON))`,
      [
        name,
        ip,
        userAgentRaw,
        JSON.stringify(ua),
        luckyMoney,
        clientHints ? JSON.stringify(clientHints) : null,
      ]
    );

    res.json({ ok: true, id: result.insertId });
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
