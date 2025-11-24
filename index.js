const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Same assets as in Flutter
const ASSETS = ["BTC", "ETH", "USDT", "SOL", "BNB", "DOGE", "LTC", "USDC"];

// In-memory data (Replit restart hone par reset, for demo this is fine)
const wallets = {}; // address -> { address, name, balances: {}, transactions: [] }

function createAddress() {
  return (
    "WALLET_" +
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );
}

function createEmptyBalances() {
  const b = {};
  ASSETS.forEach((sym) => (b[sym] = 0));
  return b;
}

// ---- ROUTES ----

// Health check
app.get("/", (req, res) => {
  res.send("Wallet backend running");
});

// Register new wallet
// POST /register { name: "Khush" }
app.post("/register", (req, res) => {
  const name = req.body.name || "Unnamed";

  const address = createAddress();
  const wallet = {
    name,
    address,
    balances: createEmptyBalances(),
    transactions: [],
  };

  wallets[address] = wallet;

  return res.json({
    success: true,
    wallet: {
      address: wallet.address,
      name: wallet.name,
      balances: wallet.balances,
      transactions: wallet.transactions,
    },
  });
});

// Get wallet details
// GET /wallet/:address
app.get("/wallet/:address", (req, res) => {
  const { address } = req.params;
  const wallet = wallets[address];
  if (!wallet) {
    return res
      .status(404)
      .json({ success: false, error: "Wallet not found" });
  }

  return res.json({
    success: true,
    wallet: {
      address: wallet.address,
      name: wallet.name,
      balances: wallet.balances,
      transactions: wallet.transactions,
    },
  });
});

// Admin credit (for demo)
// POST /admin/credit { address, asset, amount }
app.post("/admin/credit", (req, res) => {
  const { address, asset, amount } = req.body;

  const wallet = wallets[address];
  if (!wallet) {
    return res
      .status(404)
      .json({ success: false, error: "Wallet not found" });
  }

  if (!ASSETS.includes(asset)) {
    return res
      .status(400)
      .json({ success: false, error: "Unknown asset symbol" });
  }

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid amount" });
  }

  wallet.balances[asset] += amt;

  const tx = {
    type: "ADMIN_CREDIT",
    asset,
    amount: amt,
    from: "ADMIN",
    to: wallet.address,
    time: new Date().toISOString(),
  };

  wallet.transactions.push(tx);

  return res.json({
    success: true,
    wallet: {
      address: wallet.address,
      balances: wallet.balances,
    },
  });
});

// Send between wallets
// POST /send { from, to, asset, amount }
app.post("/send", (req, res) => {
  const { from, to, asset, amount } = req.body;

  const fromWallet = wallets[from];
  const toWallet = wallets[to];

  if (!fromWallet) {
    return res
      .status(404)
      .json({ success: false, error: "Sender wallet not found" });
  }
  if (!toWallet) {
    return res
      .status(404)
      .json({ success: false, error: "Recipient wallet not found" });
  }

  if (!ASSETS.includes(asset)) {
    return res
      .status(400)
      .json({ success: false, error: "Unknown asset symbol" });
  }

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid amount" });
  }

  if (fromWallet.balances[asset] < amt) {
    return res
      .status(400)
      .json({ success: false, error: "Insufficient balance" });
  }

  // Update balances
  fromWallet.balances[asset] -= amt;
  toWallet.balances[asset] += amt;

  const time = new Date().toISOString();

  const txSend = {
    type: "SEND",
    asset,
    amount: amt,
    from,
    to,
    time,
  };
  const txReceive = {
    type: "RECEIVE",
    asset,
    amount: amt,
    from,
    to,
    time,
  };

  fromWallet.transactions.push(txSend);
  toWallet.transactions.push(txReceive);

  return res.json({
    success: true,
    fromWallet: {
      address: fromWallet.address,
      balances: fromWallet.balances,
    },
    toWallet: {
      address: toWallet.address,
      balances: toWallet.balances,
    },
  });
});

// ---- START ----
app.listen(PORT, () => {
  console.log("Wallet backend running on port", PORT);
});