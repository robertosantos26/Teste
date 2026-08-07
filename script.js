const SUPABASE_URL = "https://xqwzeznbznopmupigfuz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yRqdQszi8m3rV4ybrZnysw_j6N1_uWH";
const PASSWORD = "atos1";

const HINOS_CACHE_KEY = "hinos_cache_v1";
const FAVORITES_KEY = "hinos_favoritos_v1";
const DEFAULT_CATEGORY = "coral";
const CATEGORY_LABELS = {
  coral: "Coral",
  banda: "Banda"
};

// Optional columns that may not exist yet in every Supabase project.
// The app degrades gracefully (drops the field from the payload and
// keeps working) if a column hasn't been created yet — see README.
const OPTIONAL_COLUMNS = ["card_color", "category", "tom", "cifra"];

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let hinos = [];
let currentHino = null;
let currentCategory = DEFAULT_CATEGORY;
let isUsingOfflineCache = false;
let searchQuery = "";
let favFilterActive = false;

const canPersist = {
  card_color: false,
  category: true,
  tom: true,
  cifra: true
};

let viewMode = "letra"; // 'letra' | 'cifra'
let transposeOffset = 0;
let useFlatsForCurrentHino = false;
let isStageMode = false;

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
const searchInput = document.getElementById("searchInput");
const favFilterBtn = document.getElementById("favFilterBtn");
const favDetailBtn = document.getElementById("favDetailBtn");

const tomEditField = document.getElementById("tomEditField");
const tomInput = document.getElementById("tomInput");
const tomDial = document.getElementById("tomDial");
const tomNoteDisplay = document.getElementById("tomNoteDisplay");
const letraViewBtn = document.getElementById("letraViewBtn");
const cifraViewBtn = document.getElementById("cifraViewBtn");
const cifraViewBox = document.getElementById("cifraViewBox");
const cifraHint = document.getElementById("cifraHint");
const cifraTextarea = document.getElementById("cifraTextarea");
const stageExitBar = document.getElementById("stageExitBar");

const installBtn = document.getElementById("installBtn");
const iosInstallHint = document.getElementById("iosInstallHint");
const installStatus = document.getElementById("installStatus");

let deferredInstallPrompt = null;

/* ============================================================
   Instalação (PWA)
   ============================================================ */
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

/* ============================================================
   Estado de edição
   ============================================================ */
let isEditMode = false;

function setEditMode(enabled) {
  isEditMode = enabled;
  hinoLyrics.contentEditable = enabled ? "true" : "false";
  hinoTitle.classList.toggle("hidden", enabled);
  titleEditLabel.classList.toggle("hidden", !enabled);
  hinoTitleInput.classList.toggle("hidden", !enabled);
  editTools.classList.toggle("hidden", !enabled);
  tomEditField.classList.toggle("hidden", !enabled);
  colorPalette.classList.add("hidden");
  cardColorPalette.classList.add("hidden");
  editBtn.textContent = enabled ? "✏️ Editando" : "✏️ Editar";

  if (enabled && currentHino) {
    hinoTitleInput.value = currentHino.title || "";
    tomInput.value = currentHino.tom || "";
  }

  refreshHinoPageView();
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

/* ============================================================
   Favoritos (somente neste aparelho)
   ============================================================ */
function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (err) {
    return new Set();
  }
}

let favorites = loadFavorites();

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
}

function isFavorite(id) {
  return favorites.has(id);
}

function toggleFavoriteId(id) {
  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }
  saveFavorites();
}

function toggleFavoriteFromList(event, id) {
  event.stopPropagation();
  toggleFavoriteId(id);
  renderHinos();
}

function toggleFavoriteCurrent() {
  if (!currentHino) return;
  toggleFavoriteId(currentHino.id);
  updateFavDetailButton();
}

function updateFavDetailButton() {
  if (!currentHino) return;
  const fav = isFavorite(currentHino.id);
  favDetailBtn.textContent = fav ? "★" : "☆";
  favDetailBtn.classList.toggle("is-fav", fav);
}

function toggleFavFilter() {
  favFilterActive = !favFilterActive;
  favFilterBtn.classList.toggle("active", favFilterActive);
  renderHinos();
}

/* ============================================================
   Persistência com fallback de colunas opcionais
   ============================================================ */
function isMissingColumnError(error, columnName) {
  if (!error) return false;

  const message = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();

  return message.includes(columnName) && (
    message.includes("schema cache") ||
    message.includes("column") ||
    error.code === "PGRST204"
  );
}

function buildHinoPayload({ title, lyrics, color, fontSize, cardColor, category, tom, cifra }) {
  const payload = {
    title,
    lyrics,
    color,
    font_size: fontSize
  };

  if (canPersist.card_color) payload.card_color = cardColor;
  if (canPersist.category) payload.category = category || DEFAULT_CATEGORY;
  if (canPersist.tom) payload.tom = tom || "";
  if (canPersist.cifra) payload.cifra = cifra || "";

  return payload;
}

// Runs a Supabase write, stripping optional columns one at a time if the
// database reports they don't exist yet, and retrying until it succeeds
// or runs out of optional columns to drop.
async function withColumnFallback(execute, payload) {
  let currentPayload = { ...payload };

  for (let attempt = 0; attempt <= OPTIONAL_COLUMNS.length; attempt += 1) {
    const { error } = await execute(currentPayload);
    if (!error) return null;

    const missingCol = OPTIONAL_COLUMNS.find(
      (col) => Object.prototype.hasOwnProperty.call(currentPayload, col) && isMissingColumnError(error, col)
    );

    if (missingCol) {
      canPersist[missingCol] = false;
      const rest = { ...currentPayload };
      delete rest[missingCol];
      currentPayload = rest;
      continue;
    }

    return error;
  }

  return null;
}

async function saveHinoRecord(id, payload) {
  return withColumnFallback(
    (data) => supabaseClient.from("hinos").update(data).eq("id", id),
    payload
  );
}

async function insertHinoRecord(payload) {
  return withColumnFallback(
    (data) => supabaseClient.from("hinos").insert([data]),
    payload
  );
}

/* ============================================================
   Carregamento e listagem
   ============================================================ */
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

  OPTIONAL_COLUMNS.forEach((col) => {
    canPersist[col] = hinos.length === 0 ? canPersist[col] : hinos.some((hino) => Object.prototype.hasOwnProperty.call(hino, col));
  });

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

function matchesSearch(hino, query) {
  if (!query) return true;
  const haystack = `${hino.title || ""} ${hino.tom || ""}`.toLowerCase();
  return haystack.includes(query);
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

  const query = searchQuery.trim().toLowerCase();

  let visibleHinos = hinos.filter((hino) => getHinoCategory(hino) === currentCategory);

  if (favFilterActive) {
    visibleHinos = visibleHinos.filter((hino) => isFavorite(hino.id));
  }

  visibleHinos = visibleHinos.filter((hino) => matchesSearch(hino, query));

  if (visibleHinos.length === 0) {
    const wrap = document.createElement("div");
    wrap.className = "empty-state";

    if (query) {
      wrap.innerHTML = `<span class="empty-icon">🔍</span>Nenhum hino encontrado para "${escapeHtml(searchQuery)}".`;
    } else if (favFilterActive) {
      wrap.innerHTML = `<span class="empty-icon">☆</span>Nenhum favorito ainda nesta lista. Toque na estrela de um hino para guardá-lo aqui.`;
    } else {
      wrap.innerHTML = `<span class="empty-icon">🎵</span>Nenhuma música do ${CATEGORY_LABELS[currentCategory].toLowerCase()} cadastrada ainda.`;
    }

    hinosList.appendChild(wrap);
    return;
  }

  visibleHinos.forEach((hino) => {
    const div = document.createElement("div");
    div.className = "hino-item";
    div.style.backgroundColor = hino.card_color || "#ffffff";

    const textColor = getReadableTextColor(hino.card_color || "#ffffff");
    const isDarkCard = textColor === "#ffffff";

    const favActive = isFavorite(hino.id);

    let metaHtml = "";
    if (hino.tom) {
      metaHtml += `<span class="tag" style="${isDarkCard ? "background:rgba(255,255,255,0.16); color:#fff;" : ""}">🎼 Tom ${escapeHtml(hino.tom)}</span>`;
    }
    if (hino.cifra && hino.cifra.trim()) {
      metaHtml += `<span class="tag tag-cifra" style="${isDarkCard ? "background:rgba(255,255,255,0.2); color:#fff;" : ""}">🎸 cifra</span>`;
    }

    div.innerHTML = `
      <p class="hino-item-title" style="color:${textColor}">${escapeHtml(hino.title)}</p>
      <div class="hino-item-meta">${metaHtml}</div>
    `;

    const favBtn = document.createElement("button");
    favBtn.className = "fav-btn" + (favActive ? " is-fav" : "");
    favBtn.type = "button";
    favBtn.title = favActive ? "Remover dos favoritos" : "Adicionar aos favoritos";
    favBtn.textContent = favActive ? "★" : "☆";
    if (isDarkCard) favBtn.style.color = favActive ? "#e0b872" : "rgba(255,255,255,0.5)";
    favBtn.onclick = (event) => toggleFavoriteFromList(event, hino.id);
    div.appendChild(favBtn);

    div.addEventListener("click", () => openHino(hino));
    hinosList.appendChild(div);
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ============================================================
   Transposição de cifra
   ============================================================ */
const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const NOTE_BASE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteIndexFromLabel(letter, accidental) {
  const base = NOTE_BASE_INDEX[letter];
  const shift = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return ((base + shift) % 12 + 12) % 12;
}

function transposeNoteLabel(letter, accidental, steps, useFlats) {
  const idx = ((noteIndexFromLabel(letter, accidental) + steps) % 12 + 12) % 12;
  return (useFlats ? NOTES_FLAT : NOTES_SHARP)[idx];
}

const CHORD_TOKEN_RE = /\[([A-G])([#b]?)([^\/\]]*)(?:\/([A-G])([#b]?))?\]/g;

function transposeChordToken(match, rootLetter, rootAcc, quality, bassLetter, bassAcc, steps, useFlats) {
  const newRoot = transposeNoteLabel(rootLetter, rootAcc, steps, useFlats);
  let result = newRoot + (quality || "");
  if (bassLetter) {
    const newBass = transposeNoteLabel(bassLetter, bassAcc, steps, useFlats);
    result += "/" + newBass;
  }
  return "[" + result + "]";
}

function transposeCifraText(text, steps, useFlats) {
  if (!steps) return text;
  return text.replace(CHORD_TOKEN_RE, (match, r, ra, q, b, ba) =>
    transposeChordToken(match, r, ra, q, b, ba, steps, useFlats)
  );
}

function guessUseFlats(tom) {
  return !!(tom && tom.includes("b") && !tom.toLowerCase().includes("bm"));
}

/* ============================================================
   Renderização de cifra (com acordes destacados)
   ============================================================ */
function renderCifraLine(line) {
  if (!line) return "&nbsp;";

  const segments = [];
  const chordRegex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let pendingChord = "";
  let match;

  while ((match = chordRegex.exec(line)) !== null) {
    const textBeforeChord = line.slice(lastIndex, match.index);

    if (textBeforeChord) {
      segments.push({ chord: pendingChord, text: textBeforeChord });
      pendingChord = "";
    }

    pendingChord = match[1];
    lastIndex = chordRegex.lastIndex;
  }

  const textAfterLastChord = line.slice(lastIndex);
  if (textAfterLastChord || pendingChord) {
    segments.push({ chord: pendingChord, text: textAfterLastChord });
  }

  return segments.map(({ chord, text }) => {
    const lyricText = text || "&nbsp;";
    const chordHtml = chord ? `<span class="chord">${chord}</span>` : "&nbsp;";

    return `<span class="cifra-segment"><span class="chord-row">${chordHtml}</span><span class="lyric-row">${lyricText}</span></span>`;
  }).join("");
}

function renderCifraHtml(rawText) {
  const escaped = escapeHtml(rawText);
  const transposed = transposeCifraText(escaped, transposeOffset, useFlatsForCurrentHino);

  return transposed
    .split("\n")
    .map((line) => `<div class="cifra-line">${renderCifraLine(line)}</div>`)
    .join("");
}

/* ============================================================
   Página do hino
   ============================================================ */
function setViewMode(mode) {
  viewMode = mode;
  letraViewBtn.classList.toggle("active", mode === "letra");
  cifraViewBtn.classList.toggle("active", mode === "cifra");
  refreshHinoPageView();
}

function refreshHinoPageView() {
  if (!currentHino) return;

  const hasCifra = !!(currentHino.cifra && currentHino.cifra.trim());
  const showCifraTab = viewMode === "cifra";

  // Edit-mode surfaces
  hinoLyrics.classList.toggle("hidden", showCifraTab);
  cifraTextarea.classList.toggle("hidden", !(isEditMode && showCifraTab));
  cifraViewBox.classList.toggle("hidden", !(!isEditMode && showCifraTab));
  cifraHint.classList.toggle("hidden", !(isEditMode && showCifraTab));

  if (isEditMode && showCifraTab) {
    cifraTextarea.value = currentHino.cifra || "";
  }

  if (!isEditMode && showCifraTab) {
    if (hasCifra) {
      cifraViewBox.innerHTML = renderCifraHtml(currentHino.cifra);
    } else {
      cifraViewBox.innerHTML = `<div class="cifra-empty">Este hino ainda não tem cifra cadastrada.<br><button class="icon-btn subtle" type="button" onclick="startAddingCifra()">+ Adicionar cifra</button></div>`;
    }
  }

  tomDial.classList.toggle("hidden", !(showCifraTab && (hasCifra || isEditMode)));
  updateTomDisplay();
}

function startAddingCifra() {
  if (!isEditMode) {
    enableEdit();
  }
  setViewMode("cifra");
}

function updateTomDisplay() {
  if (!currentHino) return;
  const baseTom = currentHino.tom || "";
  if (!baseTom) {
    tomNoteDisplay.textContent = transposeOffset === 0 ? "—" : (transposeOffset > 0 ? `+${transposeOffset}` : `${transposeOffset}`);
    return;
  }

  const match = baseTom.trim().match(/^([A-G])([#b]?)(.*)$/);
  if (!match) {
    tomNoteDisplay.textContent = baseTom;
    return;
  }

  const [, letter, acc, suffix] = match;
  const newNote = transposeNoteLabel(letter, acc, transposeOffset, useFlatsForCurrentHino);
  tomNoteDisplay.textContent = newNote + suffix;
}

function transposeStep(delta) {
  transposeOffset += delta;
  updateTomDisplay();
  if (!isEditMode && viewMode === "cifra" && currentHino && currentHino.cifra) {
    cifraViewBox.innerHTML = renderCifraHtml(currentHino.cifra);
  }
}

function openHino(hino) {
  currentHino = hino;
  transposeOffset = 0;
  useFlatsForCurrentHino = guessUseFlats(hino.tom);

  hinoTitle.textContent = hino.title;
  hinoTitleInput.value = hino.title || "";
  tomInput.value = hino.tom || "";
  hinoLyrics.innerHTML = hino.lyrics || "";
  hinoLyrics.style.color = hino.color || "#222222";
  hinoLyrics.style.fontSize = (hino.font_size || 20) + "px";

  const hasCifra = !!(hino.cifra && hino.cifra.trim());
  viewMode = hasCifra ? "cifra" : "letra";
  letraViewBtn.classList.toggle("active", viewMode === "letra");
  cifraViewBtn.classList.toggle("active", viewMode === "cifra");

  updateFavDetailButton();
  setEditMode(false);

  homePage.classList.add("hidden");
  hinoPage.classList.remove("hidden");
}

function goHome() {
  if (isStageMode) exitStageMode();
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

  const tom = prompt("Tom do hino (opcional, ex: G, Am, D):") || "";

  const payload = buildHinoPayload({
    title: title.trim(),
    lyrics: "Digite aqui a letra do hino...",
    color: "#222222",
    fontSize: 20,
    cardColor: "#ffffff",
    category: currentCategory,
    tom: tom.trim(),
    cifra: ""
  });

  const error = await insertHinoRecord(payload);

  if (error) {
    if (isMissingColumnError(error, "category")) {
      alert("Erro ao criar hino: a coluna 'category' precisa existir no Supabase para separar Coral e Banda. Veja o SQL no README.");
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
    if (viewMode === "cifra") {
      cifraTextarea.focus();
    } else {
      hinoLyrics.focus();
    }
    return;
  }

  if (!checkPassword()) {
    alert("Senha incorreta.");
    return;
  }

  setEditMode(true);

  if (viewMode === "cifra") {
    cifraTextarea.focus();
  } else {
    hinoLyrics.focus();
  }
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
  const tom = tomInput.value.trim();
  const cifra = cifraTextarea.value;

  const payload = buildHinoPayload({
    title,
    lyrics: hinoLyrics.innerHTML,
    color,
    fontSize,
    cardColor,
    category: getHinoCategory(currentHino),
    tom,
    cifra
  });

  const error = await saveHinoRecord(currentHino.id, payload);

  if (error) {
    if (isMissingColumnError(error, "category")) {
      alert("Erro ao salvar hino: a coluna 'category' precisa existir no Supabase para manter a música na aba correta.");
    } else if (isMissingColumnError(error, "tom") || isMissingColumnError(error, "cifra")) {
      alert("Tom/cifra ainda não têm coluna no Supabase. Veja o SQL no README para habilitar — o resto do hino foi salvo normalmente.");
    } else {
      alert("Erro ao salvar hino: " + error.message);
    }
    console.error(error);
    return;
  }

  currentHino.title = title;
  currentHino.tom = tom;
  currentHino.cifra = cifra;
  hinoTitle.textContent = title;
  useFlatsForCurrentHino = guessUseFlats(tom);
  transposeOffset = 0;
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

/* ============================================================
   Modo Apresentação (leitura em palco)
   ============================================================ */
function enterStageMode() {
  isStageMode = true;
  document.body.classList.add("stage-mode");
  stageExitBar.classList.remove("hidden");
}

function exitStageMode() {
  isStageMode = false;
  document.body.classList.remove("stage-mode");
  stageExitBar.classList.add("hidden");
}

/* ============================================================
   Service worker + eventos
   ============================================================ */
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

searchInput.addEventListener("input", (event) => {
  searchQuery = event.target.value;
  renderHinos();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isStageMode) {
    exitStageMode();
  }
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
window.setViewMode = setViewMode;
window.transposeStep = transposeStep;
window.toggleFavoriteCurrent = toggleFavoriteCurrent;
window.toggleFavFilter = toggleFavFilter;
window.enterStageMode = enterStageMode;
window.exitStageMode = exitStageMode;
window.startAddingCifra = startAddingCifra;

updateConnectionStatus();
registerServiceWorker();
setupInstallExperience();
loadHinos();
