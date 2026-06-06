async function loadProduct() {
  try {
    const res = await fetch("/api/product");
    if (!res.ok) return;
    const product = await res.json();

    const priceEl = document.getElementById("productPrice");
    if (priceEl && product.price != null) {
      const symbol = product.currency === "USD" ? "$" : "";
      priceEl.innerHTML = `${symbol}${product.price} <small>${product.currency || ""} one-time</small>`;
    }

    const descEl = document.getElementById("productDescription");
    if (descEl && product.description) {
      descEl.textContent = product.description;
    }

    const demoLink = document.getElementById("demoLink");
    if (demoLink && product.demoUrl) {
      demoLink.href = product.demoUrl;
    }
  } catch {
    // Static fallback values are fine
  }
}

loadProduct();
