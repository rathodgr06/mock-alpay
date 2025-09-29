const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// In-memory store for transactions
const transactions = new Map();

// Generate random 10-digit number
function generateRandom10DigitId() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// Normalize MSISDN and get initial status
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

// Simulate status update for pending transactions
function schedulePendingToFinalStatus(referenceId) {
  const delayInMinutes = Math.floor(Math.random() * 2) + 12; // 3–4 minutes
  const delayMs = delayInMinutes * 60 * 1000;

  console.log(`⏳ Scheduling status update for ${referenceId} in ${delayInMinutes} minute(s)`);

  setTimeout(() => {
    if (!transactions.has(referenceId)) return;

    const tx = transactions.get(referenceId);
    if (tx.status !== "PENDING") return;

    // Randomly decide final status
    const finalStatus = Math.random() < 0.5 ? "SUCCESSFUL" : "FAILED";
    tx.status = finalStatus;

    console.log(`🔄 Transaction ${referenceId} updated to: ${finalStatus}`);
  }, delayMs);
}

// POST /requesttopay
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

// GET /requesttopay/:referenceId
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

// Start server
app.listen(PORT, () => {
  console.log(`✅ Mock MoMo server running on http://localhost:${PORT}`);
});
