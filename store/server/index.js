import "dotenv/config";
import cors from "cors";
import express from "express";
import { existsSync, createReadStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import {
  createPaymentSession,
  getPaymentSessionStatus,
} from "./payoneer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = Number(process.env.PORT) || 3001;
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;
const PAYONEER_ENV = process.env.PAYONEER_ENV || "test";
const MERCHANT_CODE = process.env.PAYONEER_MERCHANT_CODE || "";
const PAYMENT_TOKEN = process.env.PAYONEER_PAYMENT_TOKEN || "";
const PRODUCT_PRICE = Number(process.env.PRODUCT_PRICE) || 14;
const PRODUCT_CURRENCY = process.env.PRODUCT_CURRENCY || "USD";
const PRODUCT_COUNTRY = process.env.PRODUCT_COUNTRY || "US";

const DOWNLOAD_FILE = join(__dirname, "..", "downloads", "wedding-invitation-source.zip");
const paidSessions = new Map();
const downloadTokens = new Map();

app.use(cors());
app.use(express.json());

function requirePayoneerConfig(res) {
  if (!MERCHANT_CODE || !PAYMENT_TOKEN) {
    res.status(503).json({
      error:
        "Payoneer is not configured. Set PAYONEER_MERCHANT_CODE and PAYONEER_PAYMENT_TOKEN in .env",
    });
    return false;
  }
  return true;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    payoneerConfigured: Boolean(MERCHANT_CODE && PAYMENT_TOKEN),
    env: PAYONEER_ENV,
  });
});

app.get("/api/product", (_req, res) => {
  res.json({
    name: "Wedding Invitation — Full Source Code",
    description:
      "Beautiful mobile-first wedding invitation template with countdown, map, audio wishes, bilingual support, and Supabase integration.",
    price: PRODUCT_PRICE,
    currency: PRODUCT_CURRENCY,
  });
});

app.post("/api/create-session", async (req, res) => {
  if (!requirePayoneerConfig(res)) return;

  try {
    const email = String(req.body?.email || "").trim();
    const transactionId = `wi-${uuidv4().slice(0, 8)}`;

    const session = await createPaymentSession({
      env: PAYONEER_ENV,
      merchantCode: MERCHANT_CODE,
      paymentToken: PAYMENT_TOKEN,
      transactionId,
      amount: PRODUCT_PRICE,
      currency: PRODUCT_CURRENCY,
      country: PRODUCT_COUNTRY,
      email,
      siteUrl: SITE_URL,
    });

    paidSessions.set(session.longId, {
      transactionId,
      email,
      createdAt: Date.now(),
      paid: false,
    });

    res.json({
      longId: session.longId,
      env: PAYONEER_ENV === "live" ? "live" : "test",
      amount: PRODUCT_PRICE,
      currency: PRODUCT_CURRENCY,
    });
  } catch (err) {
    console.error("create-session error:", err);
    res.status(500).json({ error: err.message || "Failed to create session" });
  }
});

app.get("/api/verify-payment", async (req, res) => {
  if (!requirePayoneerConfig(res)) return;

  const longId = String(req.query.longId || "").trim();
  if (!longId) {
    return res.status(400).json({ error: "longId is required" });
  }

  try {
    const status = await getPaymentSessionStatus({
      env: PAYONEER_ENV,
      merchantCode: MERCHANT_CODE,
      paymentToken: PAYMENT_TOKEN,
      longId,
    });

    if (!status.isPaid) {
      return res.json({ paid: false, status: status.statusCode });
    }

    const session = paidSessions.get(longId) || { email: "", transactionId: longId };
    session.paid = true;
    paidSessions.set(longId, session);

    let token = [...downloadTokens.entries()].find(([, v]) => v.longId === longId)?.[0];
    if (!token) {
      token = uuidv4();
      downloadTokens.set(token, {
        longId,
        createdAt: Date.now(),
        used: false,
      });
    }

    res.json({
      paid: true,
      status: status.statusCode,
      downloadToken: token,
    });
  } catch (err) {
    console.error("verify-payment error:", err);
    res.status(500).json({ error: err.message || "Verification failed" });
  }
});

app.post("/api/webhook/payoneer", (req, res) => {
  const longId =
    req.body?.identification?.longId ||
    req.body?.longId ||
    req.query?.longId;

  if (longId && paidSessions.has(longId)) {
    const session = paidSessions.get(longId);
    session.paid = true;
    paidSessions.set(longId, session);
  }

  res.status(200).send("OK");
});

app.get("/api/download/:token", (req, res) => {
  const token = req.params.token;
  const entry = downloadTokens.get(token);

  if (!entry) {
    return res.status(404).json({ error: "Invalid download link" });
  }

  if (!existsSync(DOWNLOAD_FILE)) {
    return res.status(503).json({
      error:
        "Source zip not found. Place wedding-invitation-source.zip in store/downloads/",
    });
  }

  entry.used = true;
  downloadTokens.set(token, entry);

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="wedding-invitation-source.zip"'
  );
  createReadStream(DOWNLOAD_FILE).pipe(res);
});

if (process.env.NODE_ENV === "production") {
  const distPath = join(__dirname, "..", "dist");
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(join(distPath, "index.html"));
    });
  }
}

app.listen(PORT, () => {
  console.log(`Store API running on http://localhost:${PORT}`);
  if (!MERCHANT_CODE || !PAYMENT_TOKEN) {
    console.warn("⚠ Payoneer credentials missing — copy .env.example to .env");
  }
});
