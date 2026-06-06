import { CheckoutWeb } from "@payoneer/checkout-web";

const emailInput = document.getElementById("email");
const statusEl = document.getElementById("checkoutStatus");
const orderSummary = document.getElementById("orderSummary");
const container = document.getElementById("cards-container");

let checkoutInstance = null;
let currentLongId = null;

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status${type ? ` ${type}` : ""}`;
}

function formatPrice(amount, currency) {
  if (currency === "USD") return `$${amount}`;
  return `${amount} ${currency}`;
}

async function createSession(email) {
  const res = await fetch("/api/create-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Could not start checkout");
  }
  return data;
}

async function initCheckout(email) {
  setStatus("Creating secure payment session…");

  const session = await createSession(email);
  currentLongId = session.longId;

  orderSummary.innerHTML = `
    <strong>Wedding Invitation — Full Source Code</strong><br />
    <strong>${formatPrice(session.amount, session.currency)}</strong> — one-time purchase
  `;

  container.innerHTML = "";

  const checkout = await CheckoutWeb({
    env: session.env,
    longId: session.longId,
    onPaymentSuccess: () => {
      window.location.href = `/success.html?longId=${encodeURIComponent(session.longId)}`;
    },
    onPaymentFailure: (error) => {
      console.error("Payment failed:", error);
      setStatus("Payment failed. Please try again or use a different card.", "error");
    },
    onBeforeError: (error) => {
      console.error("Checkout error:", error);
      setStatus(error?.message || "Checkout error. Please refresh and try again.", "error");
    },
  });

  checkoutInstance = checkout;
  checkout.dropIn("cards").mount(container);
  setStatus("Complete your payment below.");
}

async function bootstrap() {
  try {
    const health = await fetch("/api/health").then((r) => r.json());
    if (!health.payoneerConfigured) {
      container.innerHTML = `
        <p style="color: var(--muted); font-size: 14px;">
          Payoneer is not configured yet. Copy <code>.env.example</code> to <code>.env</code>
          and add your merchant code and payment token from the Payoneer portal.
        </p>`;
      setStatus("Server needs Payoneer credentials in .env", "error");
      return;
    }

    const savedEmail = sessionStorage.getItem("checkout_email") || "";
    if (savedEmail) emailInput.value = savedEmail;

    const start = async () => {
      const email = emailInput.value.trim();
      if (!email || !email.includes("@")) {
        setStatus("Enter a valid email to continue.", "error");
        return;
      }
      sessionStorage.setItem("checkout_email", email);
      await initCheckout(email);
    };

    emailInput.addEventListener("change", () => {
      if (checkoutInstance) {
        checkoutInstance = null;
        currentLongId = null;
        container.innerHTML = `<p style="color: var(--muted); font-size: 14px;">Email changed — reloading payment form…</p>`;
        start();
      }
    });

    await start();
  } catch (err) {
    console.error(err);
    container.innerHTML = "";
    setStatus(err.message || "Failed to load checkout.", "error");
  }
}

bootstrap();
