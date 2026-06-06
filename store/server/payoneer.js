const API_BASE = {
  test: "https://api.sandbox.oscato.com/api",
  live: "https://api.live.oscato.com/api",
};

const CONTENT_TYPE =
  "application/vnd.optile.payment.enterprise-v1-extensible+json";

function getAuthHeader(merchantCode, paymentToken) {
  const encoded = Buffer.from(`${merchantCode}:${paymentToken}`).toString(
    "base64"
  );
  return `Basic ${encoded}`;
}

function getApiBase(env) {
  return API_BASE[env === "live" ? "live" : "test"];
}

export async function createPaymentSession({
  env,
  merchantCode,
  paymentToken,
  transactionId,
  amount,
  currency,
  country,
  email,
  siteUrl,
}) {
  const body = {
    transactionId,
    country,
    customer: {
      number: transactionId,
      email: email || "customer@example.com",
    },
    payment: {
      amount,
      currency,
      reference: `Wedding Invitation Source — ${transactionId}`,
    },
    callback: {
      returnUrl: `${siteUrl}/success.html`,
      cancelUrl: `${siteUrl}/checkout.html`,
      notificationUrl: `${siteUrl}/api/webhook/payoneer`,
    },
  };

  const response = await fetch(`${getApiBase(env)}/lists`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(merchantCode, paymentToken),
      "Content-Type": CONTENT_TYPE,
      Accept: CONTENT_TYPE,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.resultInfo ||
      data?.message ||
      data?.error ||
      `Payoneer API error (${response.status})`;
    throw new Error(message);
  }

  const longId = data?.identification?.longId;
  if (!longId) {
    throw new Error("Payoneer did not return a session longId");
  }

  return { longId, raw: data };
}

export async function getPaymentSessionStatus({
  env,
  merchantCode,
  paymentToken,
  longId,
}) {
  const response = await fetch(`${getApiBase(env)}/lists/${longId}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(merchantCode, paymentToken),
      Accept: CONTENT_TYPE,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.resultInfo ||
      data?.message ||
      `Failed to verify payment (${response.status})`;
    throw new Error(message);
  }

  const statusCode = data?.status?.code?.toLowerCase() || "";
  const isPaid = statusCode === "charged" || statusCode === "paid";

  return { isPaid, statusCode, raw: data };
}
