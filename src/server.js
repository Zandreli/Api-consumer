require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json());

// Config
const AUTH_URL = "https://sandbox.api.gateway.kasapay.com/v1/auth";
const PAYOUT_URL = "https://sandbox.api.gateway.kasapay.com/v1/payouts/initiate";
const CHECKOUT_URL = "https://sandbox.api.gateway.kasapay.com/v2/checkout/initiate";

//Customers
const customers = [
    {
        id: 1,
        firstName: "Xander",
        lastName: "Poper",
        email: "xander@gmail.com",
        phone:"+254700000003",
        amount: 100
    },
    {
        id: 2,
        firstName: "Peter",
        lastName: "Griffin",
        email: "peter@griffin.com",
        phone: "+254706062805",
        amount: 10000,
    },
    {
        id: 3,
        firstName: "Stewie",
        lastName: "Griffin",
        email: "stewie@griffin.com",
        phone: "+254700000001",
        amount: 200
    },
    {
        id: 4,
        firstName: "Lois",
        lastName: "Griffin",
        email: "lois@griffin.com",
        phone: "+254700000002",
        amount: 10000
    }
]

//Auth function
async function getAccessToken() {
    const response = await fetch(AUTH_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            consumer_key: process.env.CONSUMER_KEY,
            consumer_secret: process.env.CONSUMER_SECRET,
        }),
    });
    
    const data = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(data));
    }

    return data.access_token;
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
        callback_url: body.callback_url
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

    console.log("STATUS:", res.status);
    console.log("RAW RESPONSE:", text);

    if (!res.ok) {
        throw new Error(text);
    }

    return JSON.parse(text);
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
        callback_url: body.callback_url,
        redirect_url: body.redirect_url
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

    return JSON.parse(text);
}

//Localhost route
app.get("/", (req, res) => {
    res.send("Server running");
});

//Payout endpoint
app.post("/payout/:id", async (req, res) => {
    try {
        const customer = customers.find(
            c => c.id === Number(req.params.id)
        );

        if (!customer) {
            return res.status(404).json({
                error: "Customer not found"
            });
        }

        const token = await getAccessToken();

        const result =await sendPayout(token, {
            first_name: customer.firstName,
            last_name: customer.lastName,
            phone: customer.phone,
            amount: customer.amount,
            name: `${customer.firstName} ${customer.lastName}`,
            service_code: "PREPAY240"
        });

        res.send(`
            <h2>Payout Successful</h2>
            <pre>${JSON.stringify(result, null, 2)}</pre>
            <a href="/customers">Back to customers</a>
            `);

        // res.json(result);

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

//Checkout endpoint
app.post("/checkout/:id", async (req, res) => {
    try {
        const customer = customers.find(
            c => c.id === Number(req.params.id)
        );

        if (!customer) {
            return res.status(404).json({
                error: "Customer not found"
            });
        }

        const token = await getAccessToken();

        const result = await initiateCheckout(token, {
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            phone: customer.phone,
            amount: customer.amount,
            service_code: "PRECHE241"
        });

        res.send(`
            <h2>Checkout Successful</h2>
            <pre>${JSON.stringify(result, null, 2)}</pre>
            <a href="/customers">Back to customers</a>
            `);

        // res.json(result);

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

app.get("/customers", (req, res) => {
    res.json(customers);
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
