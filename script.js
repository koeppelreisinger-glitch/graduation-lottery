const adminMode = new URLSearchParams(window.location.search).get("admin") === "true";
const dataParam = new URLSearchParams(window.location.search).get("data");
const adminSection = document.getElementById("adminSection");
const lotterySection = document.getElementById("lotterySection");
const prizeForm = document.getElementById("prizeForm");
const prizeList = document.getElementById("prizeList");
const shareLinkInput = document.getElementById("shareLink");
const generateShareLinkBtn = document.getElementById("generateShareLink");
const startDrawBtn = document.getElementById("startDraw");
const inventoryTip = document.getElementById("inventoryTip");
const resultCard = document.getElementById("resultCard");
const resultImage = document.getElementById("resultImage");
const resultName = document.getElementById("resultName");
const wheel = document.getElementById("wheel");
const overlay = document.getElementById("overlay");
const cheerAudio = document.getElementById("cheerAudio");

let prizes = [];

function encodeData(arr) {
  return btoa(encodeURIComponent(JSON.stringify(arr)));
}
function decodeData(str) {
  try {
    return JSON.parse(decodeURIComponent(atob(str)));
  } catch (e) {
    return null;
  }
}
function saveLocal() {
  localStorage.setItem("graduationLotteryData", JSON.stringify(prizes));
}
function loadLocal() {
  try {
    const raw = localStorage.getItem("graduationLotteryData");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function renderAdminList() {
  prizeList.innerHTML = "";
  if (prizes.length === 0) {
    prizeList.innerHTML = "<p style='color:#7f8b9a;padding:8px;'>目前暂无奖品，请添加。</p>";
    return;
  }
  prizes.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "list-item";
    const img = document.createElement("img");
    img.src = item.image || "https://via.placeholder.com/100?text=No+Pic";
    const info = document.createElement("div");
    info.className = "info";
    info.innerHTML = `<h4>${item.name}</h4><small>剩余数量：${item.quantity}</small>`;
    const remove = document.createElement("button");
    remove.className = "remove";
    remove.innerText = "删除";
    remove.addEventListener("click", () => {
      prizes.splice(idx, 1);
      saveLocal();
      renderAdminList();
    });
    card.append(img, info, remove);
    prizeList.appendChild(card);
  });
}

function refreshLotteryTip() {
  if (!prizes.length || totalQuantity() === 0) {
    inventoryTip.textContent = "奖品已抽完，无法继续抽奖。";
    startDrawBtn.disabled = true;
    return;
  }
  inventoryTip.textContent = `当前剩余礼品类型：${prizes.length}，总库存：${totalQuantity()}`;
  startDrawBtn.disabled = false;
}

function totalQuantity() {
  return prizes.reduce((sum, p) => sum + (p.quantity || 0), 0);
}

function pickPrize() {
  const expanded = [];
  prizes.forEach(item => {
    for (let i = 0; i < item.quantity; i++) expanded.push(item);
  });
  if (!expanded.length) return null;
  return expanded[Math.floor(Math.random() * expanded.length)];
}

function showResult(item) {
  if (!item) { return; }
  resultImage.src = item.image || "https://via.placeholder.com/180?text=恭喜";
  resultName.textContent = item.name;
  resultCard.classList.remove("hidden");
  overlay.classList.remove("hidden");
  window.setTimeout(() => overlay.classList.add("hidden"), 2200);
  if (cheerAudio?.play) {
    cheerAudio.currentTime = 0;
    cheerAudio.play().catch(() => {});
  }
}

function updateAfterDraw(item) {
  const idx = prizes.findIndex(p => p.name === item.name && p.image === item.image);
  if (idx >= 0) {
    prizes[idx].quantity = Math.max(0, prizes[idx].quantity - 1);
  }
  saveLocal();
}

function initAdminMode() {
  adminSection.classList.remove("hidden");
  lotterySection.classList.add("hidden");
  prizes = loadLocal();

  const urlData = dataParam ? decodeData(dataParam) : null;
  if (Array.isArray(urlData) && urlData.length) {
    prizes = urlData;
    saveLocal();
  }

  renderAdminList();
  refreshLotteryTip();

  prizeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("prizeName").value.trim();
    const qty = Number(document.getElementById("prizeQty").value);
    const fileInput = document.getElementById("prizeImage");
    if (!name || qty <= 0) return alert("请填写有效奖品名称和数量。");
    const handleAdd = (imgData) => {
      prizes.push({
        name,
        quantity: qty,
        image: imgData,
      });
      saveLocal();
      renderAdminList();
      prizeForm.reset();
      document.getElementById("prizeQty").value = 1;
      refreshLotteryTip();
    };
    if (fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = () => handleAdd(reader.result);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      handleAdd("");
    }
  });

  generateShareLinkBtn.addEventListener("click", () => {
    if (!prizes.length) {
      shareLinkInput.value = "";
      return alert("请先添加奖品再生成分享链接。");
    }
    const encoded = encodeData(prizes);
    shareLinkInput.value = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    shareLinkInput.select();
    document.execCommand("copy");
    alert("分享链接已生成并复制到剪贴板！");
  });
}

function initLotteryMode() {
  adminSection.classList.add("hidden");
  lotterySection.classList.remove("hidden");
  resultCard.classList.add("hidden");
  overlay.classList.add("hidden");

  let loadedPrizes = [];
  if (dataParam) {
    const decoded = decodeData(dataParam);
    if (Array.isArray(decoded)) loadedPrizes = decoded;
  }
  if (!loadedPrizes.length) {
    loadedPrizes = loadLocal();
  }
  prizes = loadedPrizes.filter(p => p.quantity > 0);
  refreshLotteryTip();

  startDrawBtn.addEventListener("click", () => {
    if (!prizes.length || totalQuantity() === 0) {
      return alert("奖品已抽完，敬请期待下一次活动。");
    }

    wheel.classList.add("spin");
    resultCard.classList.add("hidden");
    overlay.classList.add("hidden");
    startDrawBtn.disabled = true;
    setTimeout(() => {
      wheel.classList.remove("spin");
      const result = pickPrize();
      if (!result) {
        inventoryTip.textContent = "已抽完";
        startDrawBtn.disabled = true;
        return;
      }
      showResult(result);
      updateAfterDraw(result);
      prizes = prizes.filter(p => p.quantity > 0);
      refreshLotteryTip();
      startDrawBtn.disabled = totalQuantity() === 0;
    }, 2200);
  });
}

function init() {
  // 过场动画结束后显示主内容
  setTimeout(() => {
    document.getElementById("introAnimation").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    if (adminMode) {
      initAdminMode();
    } else {
      initLotteryMode();
    }
  }, 12000); // 12秒后显示主内容
}

init();