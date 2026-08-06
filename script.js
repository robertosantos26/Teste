const SUPABASE_URL = "https://xqwzeznbznopmupigfuz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yRqdQszi8m3rV4ybrZnysw_j6N1_uWH";
const PASSWORD = "atos1";

const HINOS_CACHE_KEY = "hinos_cache_v1";
const DEFAULT_CATEGORY = "coral";
const CATEGORY_LABELS = {
  coral: "Coral",
  banda: "Banda"
};

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let hinos = [];
let currentHino = null;
let currentCategory = DEFAULT_CATEGORY;
let isUsingOfflineCache = false;
let canPersistCardColor = false;
let canPersistCategory = true;

const homePage = document.getElementById("homePage");
const hinoPage = document.getElementById("hinoPage");
const hinosList = document.getElementById("hinosList");
const listTitle = document.getElementById("listTitle");
const coralTab = document.getElementById("coralTab");
const bandaTab = document.getElementById("bandaTab");
const hinoTitle = document.getElementById("hinoTitle");
const hinoLyrics = document.getElementById("hinoLyrics");
const hinoTitleInput = document.getElementById("hinoTitleInput");
const titleEditLabel = document.getElementById("titleEditLabel");
const editTools = document.getElementById("editTools");
const editBtn = document.getElementById("editBtn");
const colorPalette = document.getElementById("colorPalette");
const cardColorPalette = document.getElementById("cardColorPalette");
const connectionStatus = document.getElementById("connectionStatus");

const installBtn = document.getElementById("installBtn");
const iosInstallHint = document.getElementById("iosInstallHint");
const installStatus = document.getElementById("installStatus");

let deferredInstallPrompt = null;

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function setupInstallExperience() {
  if (isInStandaloneMode()) {
    installBtn.classList.add("hidden");
    iosInstallHint.classList.add("hidden");
    installStatus.classList.add("hidden");
    return;
  }

  const isIos = isIosDevice();
  const isAndroid = /android/i.test(navigator.userAgent);

  if (isIos) {
    installBtn.classList.add("hidden");
    installStatus.classList.add("hidden");
    iosInstallHint.textContent = "No iPhone/iPad (Safari): toque em Compartilhar e depois em 'Adicionar à Tela de Início'.";
    iosInstallHint.classList.remove("hidden");
    return;
  }

  if (isAndroid) {
    installStatus.classList.remove("hidden");
    installStatus.textContent = "No Android: se o botão aparecer, toque em 'Instalar app'. Caso não apareça, use o menu (⋮) > 'Instalar app' ou 'Adicionar à tela inicial'.";

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      installBtn.classList.remove("hidden");
      installStatus.textContent = "Pronto! Toque em 'Instalar app'.";
    });

    installBtn.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;

      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBtn.classList.add("hidden");

      if (choice.outcome === "accepted") {
        installStatus.textContent = "Instalação iniciada com sucesso.";
      } else {
        installStatus.textContent = "Instalação cancelada. Você pode tentar novamente pelo menu do navegador.";
      }
    });

    return;
  }

  installBtn.classList.add("hidden");
  iosInstallHint.classList.add("hidden");
  installStatus.classList.remove("hidden");
  installStatus.textContent = "Para instalar, use o menu do navegador e procure por 'Instalar app' ou 'Adicionar à tela inicial'.";
}

let isEditMode = false;

function setEditMode(enabled) {
  isEditMode = enabled;
  hinoLyrics.contentEditable = enabled ? "true" : "false";
  hinoTitle.classList.toggle("hidden", enabled);
  titleEditLabel.classList.toggle("hidden", !enabled);
  hinoTitleInput.classList.toggle("hidden", !enabled);
  editTools.classList.toggle("hidden", !enabled);
  colorPalette.classList.add("hidden");
  cardColorPalette.classList.add("hidden");
  editBtn.textContent = enabled ? "✏️ Editando" : "✏️ Editar";

  if (enabled && currentHino) {
    hinoTitleInput.value = currentHino.title || "";
  }
}

function updateConnectionStatus() {
  const online = navigator.onLine;
  if (online) {
    connectionStatus.textContent = "🟢 Online";
  } else {
    connectionStatus.textContent = "🟠 Offline (dados podem estar desatualizados)";
  }
}

function showInfoMessage(text, type = "info") {
  const banner = document.createElement("p");
  banner.className = `info-banner info-banner-${type}`;
  banner.textContent = text;
  hinosList.appendChild(banner);
}

function saveHinosToCache(data) {
  localStorage.setItem(HINOS_CACHE_KEY, JSON.stringify(data || []));
}

function loadHinosFromCache() {
  const raw = localStorage.getItem(HINOS_CACHE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Erro ao ler cache local:", err);
    return [];
  }
}

function checkPassword() {
  const senha = prompt("Digite a senha:");
  return senha === PASSWORD;
}

function isMissingColumnError(error, columnName) {
  if (!error) return false;

  const message = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();

  return message.includes(columnName) && (
    message.includes("schema cache") ||
    message.includes("column") ||
    error.code === "PGRST204"
  );
}

function isMissingCardColorColumnError(error) {
  return isMissingColumnError(error, "card_color");
}

function isMissingCategoryColumnError(error) {
  return isMissingColumnError(error, "category");
}

function buildHinoPayload(
  { title, lyrics, color, fontSize, cardColor, category },
  includeCardColor = canPersistCardColor,
  includeCategory = true
) {
  const payload = {
    title,
    lyrics,
    color,
    font_size: fontSize
  };

  if (includeCardColor) {
    payload.card_color = cardColor;
  }

  if (includeCategory) {
    payload.category = category || DEFAULT_CATEGORY;
  }

  return payload;
}

async function saveHinoRecord(id, payload) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { error } = await supabaseClient
      .from("hinos")
      .update(nextPayload)
      .eq("id", id);

    if (!error) return null;

    if (isMissingCardColorColumnError(error) && Object.prototype.hasOwnProperty.call(nextPayload, "card_color")) {
      canPersistCardColor = false;
      const { card_color: _cardColor, ...payloadWithoutCardColor } = nextPayload;
      nextPayload = payloadWithoutCardColor;
      continue;
    }

    if (isMissingCategoryColumnError(error) && Object.prototype.hasOwnProperty.call(nextPayload, "category")) {
      canPersistCategory = false;
      return error;
    }

    return error;
  }

  return null;
}

async function loadHinos() {
  hinosList.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("hinos")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Falha online, tentando cache local:", error.message);

    const cachedHinos = loadHinosFromCache();
    if (cachedHinos.length > 0) {
      isUsingOfflineCache = true;
      hinos = cachedHinos;
      renderHinos();
      return;
    }

    isUsingOfflineCache = true;
    hinos = [];
    renderHinos("Sem internet e sem dados salvos neste aparelho. Abra o app online ao menos 1 vez para ativar o offline parcial.", "warning");
    return;
  }

  isUsingOfflineCache = false;
  hinos = data || [];
  canPersistCardColor = hinos.some((hino) => Object.prototype.hasOwnProperty.call(hino, "card_color"));
  canPersistCategory = hinos.length === 0 || hinos.some((hino) => Object.prototype.hasOwnProperty.call(hino, "category"));
  saveHinosToCache(hinos);
  renderHinos();
}

function getHinoCategory(hino) {
  return hino.category || DEFAULT_CATEGORY;
}

function updateTabs() {
  listTitle.textContent = `Lista de Músicas do ${CATEGORY_LABELS[currentCategory]}`;
  coralTab.classList.toggle("active", currentCategory === "coral");
  bandaTab.classList.toggle("active", currentCategory === "banda");
  coralTab.setAttribute("aria-selected", currentCategory === "coral");
  bandaTab.setAttribute("aria-selected", currentCategory === "banda");
}

function selectCategory(category) {
  if (!CATEGORY_LABELS[category]) return;

  currentCategory = category;
  renderHinos();
}

function renderHinos(customMessage = "", customType = "info") {
  hinosList.innerHTML = "";
  updateTabs();

  if (isUsingOfflineCache) {
    showInfoMessage("Você está vendo dados salvos no aparelho (modo offline parcial).", "warning");
  }

  if (customMessage) {
    showInfoMessage(customMessage, customType);
  }

  const visibleHinos = hinos.filter((hino) => getHinoCategory(hino) === currentCategory);

  if (visibleHinos.length === 0) {
    showInfoMessage(`Nenhuma música do ${CATEGORY_LABELS[currentCategory].toLowerCase()} cadastrada ainda.`, "muted");
    return;
  }

  visibleHinos.forEach((hino) => {
    const div = document.createElement("div");
    div.className = "hino-item";
    div.textContent = hino.title;
    div.style.backgroundColor = hino.card_color || "#ffffff";
    div.style.color = getReadableTextColor(hino.card_color || "#ffffff");
    div.onclick = () => openHino(hino);
    hinosList.appendChild(div);
  });
}

function openHino(hino) {
  currentHino = hino;

  hinoTitle.textContent = hino.title;
  hinoTitleInput.value = hino.title || "";
  hinoLyrics.innerHTML = hino.lyrics || "";
  hinoLyrics.style.color = hino.color || "#222222";
  hinoLyrics.style.fontSize = (hino.font_size || 20) + "px";
  setEditMode(false);

  homePage.classList.add("hidden");
  hinoPage.classList.remove("hidden");
}

function goHome() {
  hinoPage.classList.add("hidden");
  homePage.classList.remove("hidden");
  setEditMode(false);
  loadHinos();
}

async function addHino() {
  if (!navigator.onLine) {
    alert("Você está offline. Para criar novo hino, conecte-se à internet.");
    return;
  }

  if (!checkPassword()) {
    alert("Senha incorreta.");
    return;
  }

  const title = prompt(`Digite o título da nova música do ${CATEGORY_LABELS[currentCategory].toLowerCase()}:`);

  if (!title || title.trim() === "") {
    alert("Digite um título válido.");
    return;
  }

  const payload = buildHinoPayload({
    title: title.trim(),
    lyrics: "Digite aqui a letra do hino...",
    color: "#222222",
    fontSize: 20,
    cardColor: "#ffffff",
    category: currentCategory
  });

  let nextPayload = { ...payload };
  let error = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    ({ error } = await supabaseClient
      .from("hinos")
      .insert([nextPayload]));

    if (!error) break;

    if (isMissingCardColorColumnError(error) && Object.prototype.hasOwnProperty.call(nextPayload, "card_color")) {
      canPersistCardColor = false;
      const { card_color: _cardColor, ...payloadWithoutCardColor } = nextPayload;
      nextPayload = payloadWithoutCardColor;
      continue;
    }

    if (isMissingCategoryColumnError(error) && Object.prototype.hasOwnProperty.call(nextPayload, "category")) {
      canPersistCategory = false;
      break;
    }

    break;
  }

  if (error) {
    if (isMissingCategoryColumnError(error)) {
      alert("Erro ao criar hino: a coluna 'category' precisa existir no Supabase para separar Coral e Banda. Execute o SQL indicado no README.");
    } else {
      alert("Erro ao criar hino: " + error.message);
    }
    console.error(error);
    return;
  }

  alert("Hino criado com sucesso.");
  loadHinos();
}

function enableEdit() {
  if (!currentHino) return;

  if (isEditMode) {
    hinoLyrics.focus();
    return;
  }

  if (!checkPassword()) {
    alert("Senha incorreta.");
    return;
  }

  setEditMode(true);
  hinoLyrics.focus();
}

async function saveHino() {
  if (!navigator.onLine) {
    alert("Você está offline. Para salvar no servidor, conecte-se à internet.");
    return;
  }

  if (!currentHino) return;
  if (!isEditMode) {
    alert("Clique em Editar para liberar as ferramentas.");
    return;
  }

  const title = hinoTitleInput.value.trim();

  if (!title) {
    alert("Digite um título válido.");
    hinoTitleInput.focus();
    return;
  }

  const fontSize = parseInt(hinoLyrics.style.fontSize) || 20;
  const color = hinoLyrics.style.color || "#222222";
  const cardColor = currentHino.card_color || "#ffffff";

  const payload = buildHinoPayload({
    title,
    lyrics: hinoLyrics.innerHTML,
    color,
    fontSize,
    cardColor,
    category: getHinoCategory(currentHino)
  });

  const error = await saveHinoRecord(currentHino.id, payload);

  if (error) {
    if (isMissingCategoryColumnError(error)) {
      alert("Erro ao salvar hino: a coluna 'category' precisa existir no Supabase para manter a música na aba correta.");
    } else {
      alert("Erro ao salvar hino: " + error.message);
    }
    console.error(error);
    return;
  }

  currentHino.title = title;
  hinoTitle.textContent = title;
  setEditMode(false);
  alert("Hino salvo com sucesso.");
  loadHinos();
}

function toggleCardColorPalette() {
  if (!isEditMode) {
    alert("Clique em Editar para liberar as ferramentas.");
    return;
  }
  cardColorPalette.classList.toggle("hidden");
}

function applyCardColor(color) {
  if (!isEditMode) {
    alert("Clique em Editar para liberar as ferramentas.");
    return;
  }

  currentHino.card_color = color;
  cardColorPalette.classList.add("hidden");
}

function getReadableTextColor(backgroundColor) {
  const hex = backgroundColor.replace("#", "");

  if (hex.length !== 6) return "#222222";

  const red = parseInt(hex.substring(0, 2), 16);
  const green = parseInt(hex.substring(2, 4), 16);
  const blue = parseInt(hex.substring(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 145 ? "#222222" : "#ffffff";
}

function toggleColorPalette() {
  if (!isEditMode) {
    alert("Clique em Editar para liberar as ferramentas.");
    return;
  }
  colorPalette.classList.toggle("hidden");
}

function applySelectedColor(color) {
  if (!isEditMode) {
    alert("Clique em Editar para liberar as ferramentas.");
    return;
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    alert("Selecione um trecho do texto para aplicar a cor.");
    return;
  }

  const range = selection.getRangeAt(0);

  if (!hinoLyrics.contains(range.commonAncestorContainer)) {
    alert("Selecione um trecho dentro da letra do hino.");
    return;
  }

  const selectedContent = range.extractContents();
  const span = document.createElement("span");
  span.style.color = color;
  span.appendChild(selectedContent);
  range.insertNode(span);

  selection.removeAllRanges();
  colorPalette.classList.add("hidden");
}

function increaseFont() {
  if (!isEditMode) {
    alert("Clique em Editar para liberar as ferramentas.");
    return;
  }

  const currentSize = parseInt(hinoLyrics.style.fontSize) || 20;
  hinoLyrics.style.fontSize = currentSize + 2 + "px";
}

function decreaseFont() {
  if (!isEditMode) {
    alert("Clique em Editar para liberar as ferramentas.");
    return;
  }

  const currentSize = parseInt(hinoLyrics.style.fontSize) || 20;

  if (currentSize > 12) {
    hinoLyrics.style.fontSize = currentSize - 2 + "px";
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.error("Falha ao registrar Service Worker:", error);
  }
}

window.addEventListener("online", () => {
  updateConnectionStatus();
  loadHinos();
});
window.addEventListener("offline", () => {
  updateConnectionStatus();
  loadHinos();
});

window.addHino = addHino;
window.selectCategory = selectCategory;
window.goHome = goHome;
window.enableEdit = enableEdit;
window.saveHino = saveHino;
window.toggleColorPalette = toggleColorPalette;
window.toggleCardColorPalette = toggleCardColorPalette;
window.applyCardColor = applyCardColor;
window.applySelectedColor = applySelectedColor;
window.increaseFont = increaseFont;
window.decreaseFont = decreaseFont;

updateConnectionStatus();
registerServiceWorker();
setupInstallExperience();
loadHinos();
