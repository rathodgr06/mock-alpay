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
const verify = require('./verify');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// =============================
// 🔧 Configurable mock values
// =============================
const VALID_SUBSCRIPTION_KEY = "aafdc96047404458b0820691110fc362";
const VALID_AUTHORIZATION = "Basic YjVkZGM2ZTItNTI5Yi00MzhmLWFlNzAtYzFhZTViNTBhNDg3OjUxZTlhMzQzN2FmMzQ0NDdiZGUwZjg0OGE4NTJkZWZh";
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

/**
 * Decide initial status based on MSISDN
 *  - 900800111, 900800112, 900800113 → SUCCESSFUL
 *  - 900800114, 900800115 → FAILED
 *  - 900800116, 900800117 → PENDING (with scheduled final status)
 */
function getStatusFromMsisdn(msisdnRaw) {
  const msisdn = String(msisdnRaw).trim();
  console.log(`🟡 Checking MSISDN for status: ${msisdn}`);

  switch (msisdn) {
    case "233900800111":
    case "233900800112":
    case "233900800113":
      return "SUCCESSFUL";

    case "233900800114":
    case "233900800115":
      return "FAILED";

    case "233900800116":
    case "233900800117":
      return "PENDING";

    default:
      // fallback: random behavior
      return Math.random() < 0.5 ? "SUCCESSFUL" : "FAILED";
  }
}

/**
 * Schedule final status for pending transactions
 * - 900800116 → FAILED after 5 minutes
 * - 900800117 → SUCCESSFUL after 5 minutes
 */
function schedulePendingToFinalStatus(referenceId, msisdn) {
  let finalStatus = null;

  if (msisdn === "233900800116") {
    finalStatus = "FAILED";
  } else if (msisdn === "233900800117") {
    finalStatus = "SUCCESSFUL";
  }

  if (!finalStatus) return;

  const delayMs = 5 * 60 * 1000; // 5 minutes
  console.log(`⏳ Scheduling ${finalStatus} update for ${referenceId} in 5 minutes`);

  setTimeout(() => {
    if (!transactions.has(referenceId)) return;

    const tx = transactions.get(referenceId);
    if (tx.status !== "PENDING") return;

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
  console.log(authHeader);

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
app.post("/collection/v1_0/requesttopay",verify, (req, res) => {
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
    schedulePendingToFinalStatus(referenceId, payer.partyId);
  }

  return res.status(202).json({ message: "Request to pay accepted" });
});

// =============================
// 📥 Get Request to Pay Status
// =============================
app.get("/collection/v1_0/requesttopay/:referenceId",verify, (req, res) => {
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
// 👤 Get Basic User Info Endpoint
// =============================
app.get("/collection/v1_0/accountholder/msisdn/:msisdn/basicuserinfo",verify, (req, res) => {
  const subscriptionKey = req.header("Ocp-Apim-Subscription-Key");
  if (!subscriptionKey || subscriptionKey !== VALID_SUBSCRIPTION_KEY) {
    return res.status(401).json({ code: "AUTHORIZATION_FAILED", message: "Invalid or missing subscription key" });
  }

  const { msisdn } = req.params;
  if (!msisdn) {
    return res.status(400).json({ code: "BAD_REQUEST", message: "MSISDN parameter is required" });
  }



  return res.status(200).json({
    "sub": "0",
    "name": "Sand Box",
    "given_name": "Sand",
    "family_name": "Box",
    "birthdate": "1976-08-13",
    "locale": "sv_SE",
    "gender": "MALE",
    "updated_at": 1757933796
  });
});

// =============================
// 🚀 Start Server
// =============================
app.listen(PORT, () => {
  console.log(`✅ Mock MoMo server running on http://localhost:${PORT}`);
});
