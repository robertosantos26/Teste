const PASSWORD = "atos1";

let hinos = JSON.parse(localStorage.getItem("hinos")) || [
  {
    title: "Exemplo de Hino",
    lyrics: "Digite aqui a letra do hino..."
  }
];

let currentHinoIndex = null;
let fontSize = 20;

const homePage = document.getElementById("homePage");
const hinoPage = document.getElementById("hinoPage");
const hinosList = document.getElementById("hinosList");
const hinoTitle = document.getElementById("hinoTitle");
const hinoLyrics = document.getElementById("hinoLyrics");

function checkPassword() {
  const senha = prompt("Digite a senha para editar:");
  return senha === PASSWORD;
}

function saveToStorage() {
  localStorage.setItem("hinos", JSON.stringify(hinos));
}

function renderHinos() {
  hinosList.innerHTML = "";

  hinos.forEach((hino, index) => {
    const div = document.createElement("div");
    div.className = "hino-item";
    div.textContent = hino.title;
    div.onclick = () => openHino(index);
    hinosList.appendChild(div);
  });
}

function openHino(index) {
  currentHinoIndex = index;

  hinoTitle.textContent = hinos[index].title;
  hinoLyrics.value = hinos[index].lyrics;
  hinoLyrics.disabled = true;

  homePage.classList.add("hidden");
  hinoPage.classList.remove("hidden");
}

function goHome() {
  hinoPage.classList.add("hidden");
  homePage.classList.remove("hidden");
  renderHinos();
}

function addHino() {
  if (!checkPassword()) {
    alert("Senha incorreta.");
    return;
  }

  const title = prompt("Digite o título do novo hino:");

  if (!title || title.trim() === "") {
    alert("Título inválido.");
    return;
  }

  hinos.push({
    title: title.trim(),
    lyrics: "Digite aqui a letra do hino..."
  });

  saveToStorage();
  renderHinos();
}

function enableEdit() {
  if (!checkPassword()) {
    alert("Senha incorreta.");
    return;
  }

  hinoLyrics.disabled = false;
  hinoLyrics.focus();
}

function saveHino() {
  if (currentHinoIndex === null) return;

  if (!checkPassword()) {
    alert("Senha incorreta.");
    return;
  }

  hinos[currentHinoIndex].lyrics = hinoLyrics.value;
  saveToStorage();

  hinoLyrics.disabled = true;
  alert("Hino salvo com sucesso.");
}

function changeColor() {
  if (!checkPassword()) {
    alert("Senha incorreta.");
    return;
  }

  const color = prompt("Digite a cor da letra. Exemplo: red, blue, green ou #000000");

  if (color) {
    hinoLyrics.style.color = color;
  }
}

function increaseFont() {
  fontSize += 2;
  hinoLyrics.style.fontSize = fontSize + "px";
}

function decreaseFont() {
  if (fontSize > 12) {
    fontSize -= 2;
    hinoLyrics.style.fontSize = fontSize + "px";
  }
}

renderHinos();
