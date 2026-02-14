# Red Envelope for friends and family 🧧

Lunar New Year lucky money app. Pick one of three red envelopes; amounts show in USD or your chosen currency based on geo.

**Purpose:** A fun, shareable way to give virtual lì xì (lucky money) during Lunar New Year. Visitors pick an envelope and receive a randomized amount, with visit data recorded for analytics.

**Stack:** React + Vite, Express, MySQL

## Setup

1. **Database** — Create `redEnvelope` and run:

```sql
CREATE TABLE visits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ip VARCHAR(45),
  user_agent_raw TEXT,
  ua_json JSON,
  lucky_money_amount INT DEFAULT 0,
  client_hints JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

2. **Backend** — `cd backend`, `npm install`, copy `.env.example` to `.env`, `npm run dev`
3. **Frontend** — `cd frontend`, `npm install`, `npm run dev`

Vite proxies `/api` to port 3001.
