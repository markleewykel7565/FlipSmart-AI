const visitorKey = "flipsmart_visitor_id";
let visitorId = localStorage.getItem(visitorKey);
if (!visitorId) {
  visitorId = crypto.randomUUID();
  localStorage.setItem(visitorKey, visitorId);
}

const $ = (id) => document.getElementById(id);

async function loadConfig() {
  try {
    const r = await fetch("/api/config");
    const c = await r.json();
    $("remaining").textContent = `${c.freeAnalysesPerDay} free analyses/day`;
    $("upgradeBtn").style.display = c.stripeEnabled ? "inline-flex" : "none";
  } catch {}
}

function money(n) {
  return Number.isFinite(Number(n)) ? `$${Number(n).toFixed(2)}` : "—";
}

function render(result) {
  $("identifiedItem").textContent = result.identifiedItem || "Resale report";
  $("buyDecision").textContent = result.buyDecision || "Review";
  $("resaleRange").textContent = `${money(result.estimatedResaleLow)} – ${money(result.estimatedResaleHigh)}`;
  $("listPrice").textContent = money(result.recommendedListPrice);
  $("profit").textContent = money(result.estimatedProfit);
  $("margin").textContent = `${Number(result.profitMarginPercent || 0).toFixed(1)}%`;
  $("condition").textContent = `Condition assumption: ${result.conditionAssumption || "Not enough information."}`;
  $("demand").textContent = result.demand || "—";
  $("risk").textContent = result.risk || "—";
  $("listingTitle").textContent = result.listingTitle || "";
  $("description").textContent = result.description || "";
  $("tips").innerHTML = (result.tips || []).map(x => `<li>${escapeHtml(x)}</li>`).join("");
  $("keywords").innerHTML = (result.keywords || []).map(x => `<span class="tag">${escapeHtml(x)}</span>`).join("");
  $("results").classList.remove("hidden");
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

$("photo").addEventListener("change", () => {
  const file = $("photo").files[0];
  $("uploadText").textContent = file ? `✓ ${file.name}` : "📷 Upload product photo (optional)";
});

$("analyzeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("loading").classList.remove("hidden");
  $("results").classList.add("hidden");
  $("analyzeBtn").disabled = true;

  try {
    let imageData = null;
    const file = $("photo").files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) throw new Error("Please use an image under 5 MB.");
      imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-visitor-id": visitorId },
      body: JSON.stringify({
        productName: $("productName").value.trim(),
        purchasePrice: $("purchasePrice").value,
        marketplace: $("marketplace").value,
        imageData
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis failed.");
    render(data);
    $("remaining").textContent = `${data.analysesRemaining} free analyses remaining today`;
  } catch (err) {
    alert(err.message);
  } finally {
    $("loading").classList.add("hidden");
    $("analyzeBtn").disabled = false;
  }
});

$("copyListing").addEventListener("click", async () => {
  const text = `${$("listingTitle").textContent}\n\n${$("description").textContent}`;
  await navigator.clipboard.writeText(text);
  $("copyListing").textContent = "Copied ✓";
  setTimeout(() => $("copyListing").textContent = "Copy listing", 1500);
});

$("upgradeBtn").addEventListener("click", async () => {
  try {
    const r = await fetch("/api/create-checkout", { method: "POST" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Checkout unavailable.");
    window.location.href = data.url;
  } catch (err) {
    alert(err.message);
  }
});

loadConfig();