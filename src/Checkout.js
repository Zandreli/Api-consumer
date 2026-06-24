require("dotenv").config();

const AUTH_URL = "https://sandbox.api.gateway.kasapay.com/v1/auth";
const CHECKOUT_URL = "https://sandbox.api.gateway.kasapay.com/v2/checkout/initiate";

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

async function initiateCheckout(token) {
    const merchantTransactionId = `TX-${Date.now()}`;
    const payload = {
        merchant_transaction_id: merchantTransactionId,
        amount: 200,
        payer_name: "Stewie Griffin",
        payer_email: "stewie@griffin.com",
        payer_msisdn: "+254700000001",
        service_code: "PRECHE241",
        account_number: "+254700000001",
        expires_in: 100,
        narration: "Checkout payment",
        callback_url: "https://mpa0e5920feb8609e0a8.free.beeceptor.com",
        redirect_url: "https://sandbox.checkout.kasapay.com",
    };

    const response = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-access-token": token,
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log("Status:", response.status);
    console.log("Checkout Response:", data);

    if (!response.ok) {
        throw new Error(JSON.stringify(data, null, 2));
    }

    return data;
}

async function main() {
    try {
        const token = await getAccessToken();

        console.log("Token received");

        const checkout = await initiateCheckout(token);

        console.log("Checkout created:");
        console.log(checkout);

        console.log("Open this URL in your browser:");
        console.log(checkout.redirect_url);

    } catch (error) {
        console.error(error);
    }
}

main();