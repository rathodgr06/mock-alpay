/**
 * Mock MoMo Collection Server
 * --------------------------------
 * Endpoints:
 *  - POST /collection/token/
 *  - POST /collection/v1_0/requesttopay
 *  - GET  /collection/v1_0/requesttopay/:referenceId
 */

const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");   // npm install jsonwebtoken
const { v4: uuidv4 } = require("uuid"); // npm install uuid

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// =============================
// 🔧 Configurable mock values
// =============================
const VALID_SUBSCRIPTION_KEY = "aafdc96047404458b0820691110fc362";
const VALID_AUTHORIZATION = "Basic e3ttdG5fYXBpX2tleX19Ont7bXRuX3NlY3JldH19";
const JWT_SECRET = "mock_secret_key"; // for mock signing

// In-memory transaction store
const transactions = new Map();

// Utility: random 10-digit number
function generateRandom10DigitId() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// Utility: expiry 1 hour later
function generateExpiry() {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  return now.toISOString();
}

// Decide initial status based on MSISDN
function getStatusFromMsisdn(msisdnRaw) {
  const msisdn = String(msisdnRaw).trim();
  console.log(`🟡 Checking MSISDN for status: ${msisdn}`);

  if (msisdn === "231233550000001" || msisdn === "231231233550000001") {
    return "PENDING";
  } else if (msisdn === "231233550000002") {
    return "FAILED";
  } else {
    return "SUCCESSFUL";
  }
}

// Simulate background update for pending → final
function schedulePendingToFinalStatus(referenceId) {
  const delayInMinutes = Math.floor(Math.random() * 2) + 3; // 3–4 minutes
  const delayMs = delayInMinutes * 60 * 1000;

  console.log(`⏳ Scheduling status update for ${referenceId} in ${delayInMinutes} minute(s)`);

  setTimeout(() => {
    if (!transactions.has(referenceId)) return;

    const tx = transactions.get(referenceId);
    if (tx.status !== "PENDING") return;

    const finalStatus = Math.random() < 0.5 ? "SUCCESSFUL" : "FAILED";
    tx.status = finalStatus;

    console.log(`🔄 Transaction ${referenceId} updated to: ${finalStatus}`);
  }, delayMs);
}

// =============================
// 🔑 Create Access Token
// =============================
app.post("/collection/token/", (req, res) => {
  const subscriptionKey = req.header("Ocp-Apim-Subscription-Key");
  const authHeader = req.header("Authorization");

  console.log("🔑 Token request received");
  console.log("📌 Subscription-Key:", subscriptionKey);
  console.log("📌 Authorization:", authHeader);

  if (!subscriptionKey || !authHeader) {
    return res.status(400).json({ error: "Missing required headers" });
  }

  if (
    subscriptionKey !== VALID_SUBSCRIPTION_KEY ||
    authHeader !== VALID_AUTHORIZATION
  ) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid Ocp-Apim-Subscription-Key or Authorization"
    });
  }

  // JWT payload
  const payload = {
    clientId: "b5ddc6e2-529b-438f-ae70-c1ae5b50a487",
    expires: generateExpiry(),
    sessionId: uuidv4()
  };

  // Sign JWT (HS256 mock)
  const token = jwt.sign(payload, JWT_SECRET, { algorithm: "HS256" });

  const tokenResponse = {
    access_token: token,
    token_type: "Bearer",
    expires_in: 3600
  };

  return res.status(200).json(tokenResponse);
});

// =============================
// 📩 Request to Pay
// =============================
app.post("/collection/v1_0/requesttopay", (req, res) => {
  const referenceId = req.header("X-Reference-Id");
  console.log(`📩 referenceId on pay: ${referenceId}`);
  console.log("📦 Incoming body:", JSON.stringify(req.body, null, 2));

  if (!referenceId) {
    return res.status(400).json({ message: "Missing X-Reference-Id header" });
  }

  const {
    amount,
    currency,
    externalId,
    payer,
    payerMessage,
    payeeNote
  } = req.body;

  if (!amount || !currency || !payer?.partyIdType || !payer?.partyId) {
    return res.status(400).json({ message: "Missing required fields in body" });
  }

  const finalExternalId = externalId || generateRandom10DigitId();
  const status = getStatusFromMsisdn(payer.partyId);

  const transaction = {
    referenceId,
    financialTransactionId: generateRandom10DigitId(),
    externalId: finalExternalId,
    amount,
    currency,
    payer,
    payerMessage,
    payeeNote,
    status,
    timestamp: new Date().toISOString()
  };

  transactions.set(referenceId, transaction);

  if (status === "PENDING") {
    schedulePendingToFinalStatus(referenceId);
  }

  return res.status(202).json({ message: "Request to pay accepted" });
});

// =============================
// 📥 Get Request to Pay Status
// =============================
app.get("/collection/v1_0/requesttopay/:referenceId", (req, res) => {
  const { referenceId } = req.params;
  console.log(`📥 Fetching transaction status for: ${referenceId}`);

  if (!transactions.has(referenceId)) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  const tx = transactions.get(referenceId);

  const response = {
    financialTransactionId: tx.financialTransactionId,
    externalId: tx.externalId,
    amount: tx.amount,
    currency: tx.currency,
    payer: tx.payer,
    status: tx.status
  };

  return res.status(200).json(response);
});

// =============================
// 🚀 Start Server
// =============================
app.listen(PORT, () => {
  console.log(`✅ Mock MoMo server running on http://localhost:${PORT}`);
});
