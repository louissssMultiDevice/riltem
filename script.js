const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Riwayat chat
let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];

// Render riwayat chat
function renderHistory() {
  chatBox.innerHTML = "";
  chatHistory.forEach(msg => appendMessage(msg.text, msg.sender, false));
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Tambah pesan
function appendMessage(message, sender, save = true) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", sender);
  msgDiv.textContent = message;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (save) {
    chatHistory.push({ text: message, sender });
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  }
}

// Kirim pesan
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  userInput.value = "";

  try {
    const res = await fetch(`https://anabot.my.id/api/ai/chat?question=${encodeURIComponent(text)}&model=gpt-4o&apikey=freeApikey`);
    const data = await res.json();
    const reply = data.answer || "Maaf, saya tidak mengerti.";
    appendMessage(reply, "ai");
  } catch (err) {
    console.error(err);
    appendMessage("Terjadi kesalahan, coba lagi nanti.", "ai");
  }
}

// Event button
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

// Render riwayat saat load
renderHistory();
