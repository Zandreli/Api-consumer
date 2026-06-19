require("dotenv").config();

// console.log("KEY:", process.env.CONSUMER_KEY);
// console.log("SECRET:", process.env.CONSUMER_SECRET);

const AUTH_URL = "https://sandbox.api.gateway.kasapay.com/v1/auth";
const PAYOUT_URL = "https://sandbox.api.gateway.kasapay.com/v1/payouts/initiate";

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

    console.log("Access Token Response:", data);

    return data.access_token;
}

async function sendPayout(token) {
    const payload = {
        payout_reference: "134526781672" + Date.now(),
        service_code: "PREPAY240",
        recipient_first_name: "John",
        recipient_last_name: "Doe",
        destination_type: "MOBILE",
        destination_name: "MPESA_KEN",
        recipient_phone_number: "254700000000",
        recipient_account_number: "254700000000",
        recipient_account_name: "John Doe",
        source_currency: "KES",
        destination_currency: "KES",
        exchange_rate: "1",
        sender_amount: "100",
        sender_country_code: "KEN",
        recipient_amount: "100",
        payment_description: "Salary Payment",
        callback_url: "https://payouts.com/result"
    };

    const res = await fetch(PAYOUT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-access-token": token,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();

    console.log("Payout Response:", data);
}

async function main() {
    try {
        const token = await getAccessToken();

        console.log("Token received");

        await sendPayout(token);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

main();

// getAccessToken();
