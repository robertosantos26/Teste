const SUPABASE_URL = "https://xqwzeznbznopmupigfuz.supabase.co";

const SUPABASE_ANON_KEY = "CeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxd3plem5iem5vcG11cGlnZnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODMxOTAsImV4cCI6MjA5NDQ1OTE5MH0.wr7B1BClyxhN0IrmlcGycN5vatE51311LNYvTwLEY_I";

const PASSWORD = "atos1";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let hinos = [];
let currentHino = null;

const homePage = document.getElementById("homePage");
const hinoPage = document.getElementById("hinoPage");
const hinosList = document.getElementById("hinosList");
const hinoTitle = document.getElementById("hinoTitle");
const hinoLyrics = document.getElementById("hinoLyrics");

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
  hinoLyrics.disabled = true;

  homePage.classList.add("hidden");
  hinoPage.classList.remove("hidden");
}

function goHome() {
  hinoPage.classList.add("hidden");
  homePage.classList.remove("hidden");
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
  if (!checkPassword()) {
    alert("Senha incorreta.");
    return;
  }

  hinoLyrics.disabled = false;
  hinoLyrics.focus();
}

async function saveHino() {
  if (!currentHino) return;

  if (!checkPassword()) {
    alert("Senha incorreta.");
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

  hinoLyrics.disabled = true;
  alert("Hino salvo com sucesso.");
}

function changeColor() {
  if (!checkPassword()) {
    alert("Senha incorreta.");
    return;
  }

  const color = prompt("Digite a cor. Exemplo: red, blue, green ou #000000");

  if (color) {
    hinoLyrics.style.color = color;
  }
}

function increaseFont() {
  const currentSize = parseInt(hinoLyrics.style.fontSize) || 20;
  hinoLyrics.style.fontSize = currentSize + 2 + "px";
}

function decreaseFont() {
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
