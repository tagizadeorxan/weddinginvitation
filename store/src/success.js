const params = new URLSearchParams(window.location.search);
const longId = params.get("longId");

const titleEl = document.getElementById("title");
const messageEl = document.getElementById("message");
const statusEl = document.getElementById("status");
const actionsEl = document.getElementById("actions");
const nextStepsEl = document.getElementById("nextSteps");
const downloadBtn = document.getElementById("downloadBtn");

async function verifyPayment() {
  if (!longId) {
    titleEl.textContent = "Missing payment reference";
    messageEl.textContent =
      "We could not find your payment session. If you completed payment, check your email or contact support.";
    statusEl.className = "status error";
    statusEl.textContent = "No longId in URL.";
    return;
  }

  let attempts = 0;
  const maxAttempts = 8;

  while (attempts < maxAttempts) {
    attempts += 1;

    try {
      const res = await fetch(`/api/verify-payment?longId=${encodeURIComponent(longId)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      if (data.paid && data.downloadToken) {
        titleEl.textContent = "Payment successful!";
        messageEl.textContent =
          "Your purchase is confirmed. Download your wedding invitation source code below.";
        statusEl.className = "status success";
        statusEl.textContent = "Thank you for your purchase 💛";

        downloadBtn.href = `/api/download/${data.downloadToken}`;
        actionsEl.hidden = false;
        nextStepsEl.hidden = false;
        return;
      }

      statusEl.textContent = `Confirming payment… (${attempts}/${maxAttempts})`;
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      titleEl.textContent = "Verification error";
      messageEl.textContent = err.message || "Could not verify payment.";
      statusEl.className = "status error";
      return;
    }
  }

  titleEl.textContent = "Payment pending";
  messageEl.textContent =
    "Your payment is still being processed. Refresh this page in a minute, or check your email for the download link.";
  statusEl.className = "status";
  statusEl.textContent = "If you were charged, contact support with your receipt.";
}

verifyPayment();
