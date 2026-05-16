const SUPABASE_URL = "https://xqwzeznbznopmupigfuz.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_yRqdQszi8m3rV4ybrZnysw_j6N1_uWH";

const PASSWORD = "atos1";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let hinos = [];
let currentHino = null;

const homePage = document.getElementById("homePage");
const hinoPage = document.getElementById("hinoPage");
const hinosList = document.getElementById("hinosList");
const hinoTitle = document.getElementById("hinoTitle");
const hinoLyrics = document.getElementById("hinoLyrics");
const editBtn = document.getElementById("editBtn");
const colorBtn = document.getElementById("colorBtn");
const increaseFontBtn = document.getElementById("increaseFontBtn");
const decreaseFontBtn = document.getElementById("decreaseFontBtn");
const saveBtn = document.getElementById("saveBtn");

let isEditMode = false;

function setEditMode(enabled) {
  isEditMode = enabled;
  hinoLyrics.disabled = !enabled;
  colorBtn.disabled = !enabled;
  increaseFontBtn.disabled = !enabled;
  decreaseFontBtn.disabled = !enabled;
  saveBtn.disabled = !enabled;
  editBtn.textContent = enabled ? "Editando" : "Editar";
}

function checkPassword() {
  const senha = prompt("Digite a senha:");
  return senha === PASSWORD;
}

async function loadHinos() {
  const { data, error } = await supabaseClient
    .from("hinos")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    alert("Erro ao carregar hinos: " + error.message);
    console.error(error);
    return;
  }

  hinos = data || [];
  renderHinos();
}

function renderHinos() {
  hinosList.innerHTML = "";

  if (hinos.length === 0) {
    hinosList.innerHTML = "<p>Nenhum hino cadastrado ainda.</p>";
    return;
  }

  hinos.forEach((hino) => {
    const div = document.createElement("div");
    div.className = "hino-item";
    div.textContent = hino.title;
    div.onclick = () => openHino(hino);
    hinosList.appendChild(div);
  });
}

function openHino(hino) {
  currentHino = hino;

  hinoTitle.textContent = hino.title;
  hinoLyrics.value = hino.lyrics || "";
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
  if (!checkPassword()) {
    alert("Senha incorreta.");
    return;
  }

  const title = prompt("Digite o título do novo hino:");

  if (!title || title.trim() === "") {
    alert("Digite um título válido.");
    return;
  }

  const { error } = await supabaseClient
    .from("hinos")
    .insert([
      {
        title: title.trim(),
        lyrics: "Digite aqui a letra do hino...",
        color: "#222222",
        font_size: 20
      }
    ]);

  if (error) {
    alert("Erro ao criar hino: " + error.message);
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
  if (!currentHino) return;
  if (!isEditMode) {
    alert("Clique em Editar para liberar as ferramentas.");
    return;
  }

  const fontSize = parseInt(hinoLyrics.style.fontSize) || 20;
  const color = hinoLyrics.style.color || "#222222";

  const { error } = await supabaseClient
    .from("hinos")
    .update({
      lyrics: hinoLyrics.value,
      color: color,
      font_size: fontSize
    })
    .eq("id", currentHino.id);

  if (error) {
    alert("Erro ao salvar hino: " + error.message);
    console.error(error);
    return;
  }

  setEditMode(false);
  alert("Hino salvo com sucesso.");
}

function changeColor() {
  if (!isEditMode) {
    alert("Clique em Editar para liberar as ferramentas.");
    return;
  }

  const color = prompt("Digite a cor. Exemplo: red, blue, green ou #000000");

  if (color) {
    hinoLyrics.style.color = color;
  }
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

window.addHino = addHino;
window.goHome = goHome;
window.enableEdit = enableEdit;
window.saveHino = saveHino;
window.changeColor = changeColor;
window.increaseFont = increaseFont;
window.decreaseFont = decreaseFont;

loadHinos();
