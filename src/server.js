require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "../src")));

// Config
const AUTH_URL = "https://sandbox.api.gateway.kasapay.com/v1/auth";
const PAYOUT_URL =
  "https://sandbox.api.gateway.kasapay.com/v1/payouts/initiate";
const CHECKOUT_URL =
  "https://sandbox.api.gateway.kasapay.com/v2/checkout/initiate";
const CHECKOUT_UI_URL = "https://sandbox.checkout.kasapay.com";
const FX_URL = "https://dev.kasapay.com/v1/fx";
const STATEMENT_URL = "https://sandbox.api.gateway.kasapay.com/v1/statement";

//Customers
const customers = [
    { id: 1, firstName: "Xander", lastName: "Poper", email: "xander@gmail.com", phone:"+254700000003", amount: 100 },
    { id: 2, firstName: "Peter", lastName: "Griffin", email: "peter@griffin.com", phone: "+254706062805", amount: 10000 },
    { id: 3, firstName: "Stewie", lastName: "Griffin", email: "stewie@griffin.com", phone: "+254700000001", amount: 200 },
    { id: 4, firstName: "Lois", lastName: "Griffin", email: "lois@griffin.com", phone: "+254700000002", amount: 10000 }
];

//Auth function
async function getAccessToken() {
  try {
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    return data.access_token;
  } catch (err) {
    console.error("Auth Error:", err.message);
    throw err;
  }
}

//Payout logic
async function sendPayout(token, body) {
  const payload = {
    payout_reference: "PAYOUT-" + Date.now(),
    service_code: body.service_code || "PREPAY240",
    recipient_first_name: body.first_name,
    recipient_last_name: body.last_name,
    destination_type: "MOBILE",
    destination_name: "MPESA_KEN",
    recipient_phone_number: body.phone,
    recipient_account_number: body.phone,
    recipient_account_name: body.name,
    source_currency: "KES",
    destination_currency: "KES",
    exchange_rate: "1",
    sender_amount: body.amount,
    sender_country_code: "KEN",
    recipient_amount: body.amount,
    payment_description: body.description || "Payout Final",
    callback_url: body.callback_url || "https://marine-blissful-unranked.ngrok-free.dev",
  };

  const res = await fetch(PAYOUT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": token,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

//FX Logic
async function getExchangeRates(token, baseCurrency = "USD") {
  const response = await fetch(`${FX_URL}?base_currency=${baseCurrency}`, {
    method: "GET",
    headers: {
      "x-access-token": token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}

//Checkout logic
async function initiateCheckout(token, body) {
  const merchantTransactionId = `TX-${Date.now()}`;

  const payload = {
    merchant_transaction_id: merchantTransactionId,
    amount: body.amount,
    payer_name: body.name,
    payer_email: body.email,
    payer_msisdn: body.phone,
    service_code: body.service_code || "PRECHE241",
    account_number: body.phone,
    expires_in: 100,
    narration: body.narration || "Checkout Final",
    callback_url: body.callback_url || "https://marine-blissful-unranked.ngrok-free.dev",
    redirect_url: body.redirect_url || "https://marine-blissful-unranked.ngrok-free.dev",
  };
  
  const response = await fetch(CHECKOUT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": token,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  console.log("STATUS:", response.status);
  console.log("RAW RESPONSE:", text);

  if (!response.ok) {
    throw new Error(text);
  }

  const data = JSON.parse(text);
  return data.redirectUrl || data.redirectUrl || data;
}

// Statement logic
async function getStatement(token, body) {
    const payload = {
        start_date: body.start_date,
        end_date: body.end_date,
        offset: body.offset || 0,
        limit: body.limit || 100
    };

    const response = await fetch(STATEMENT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-access-token": token,
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(data));
    }

    return data;
}

//Localhost route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"), (err) => {
      if (err) res.sendFile(path.join(__dirname, "../src/index.html"));
    });
  });

  app.get("/customers", (req, res) => {
    res.json(customers);
  });

  app.post("/customers", (req, res) => {
    console.log("POST /customers called with body:", req.body);
    const { firstName, lastName, email, phone, amount } = req.body;
  
    if (!firstName || !lastName || !email || !phone || amount === undefined) {
      return res.status(400).json({ error: "All fields are required" });
    }
  
    const newCustomer = {
      id: customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1,
      firstName,
      lastName,
      email,
      phone,
      amount: Number(amount),
    };
  
    customers.push(newCustomer);
    res.status(201).json(newCustomer);
  });

//Payout endpoint
app.post("/payout/:id", async (req, res) => {
  try {
    const customer = customers.find((c) => c.id === Number(req.params.id));
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const token = await getAccessToken();
    const result = await sendPayout(token, {
      first_name: customer.firstName,
      last_name: customer.lastName,
      phone: customer.phone,
      amount: customer.amount,
      name: `${customer.firstName} ${customer.lastName}`,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Callback endpoint
app.post("/callback", (req, res) => {
  console.log("--KASAPAY CALLBACK RECEIVED ---");
  console.log("Body:", JSON.stringify(req.body, null, 2));

  res.status(200).send("OK");
})

//Checkout endpoint
app.post("/checkout/:id", async (req, res) => {
  try {
    const customer = customers.find((c) => c.id === Number(req.params.id));
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const callbackUrl = "https://marine-blissful-unranked.ngrok-free.dev";

    const token = await getAccessToken();
    const redirectUrl = await initiateCheckout(token, {
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      amount: customer.amount,
      callback_url: callbackUrl || "https://marine-blissful-unranked.ngrok-free.dev",
      redirect_url: "https://marine-blissful-unranked.ngrok-free.dev"
    });

    console.log("Checkout redirect URL generated:", redirectUrl);
    res.json({ redirectUrl });
  } catch (err) {
    console.error("Checkout Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/statement", async (req, res) => {
    try {
        const token = await getAccessToken();
        const statement = await getStatement(token, req.body);
        res.json(statement);
    } catch (err) {
        console.error("Statement API Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get("/fx-rates", async (req, res) => {
  try {
    const base = req.query.base || "USD";
    const token = await getAccessToken();
    const rates = await getExchangeRates(token, base);
    res.json(rates);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`\nServer running at http://localhost:${PORT}`);
  console.log(
    `Open http://localhost:${PORT} in your browser to access the dashboard\n`
  );
});
