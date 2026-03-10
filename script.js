const messages = document.getElementById("messages");
const input = document.getElementById("input");
const imageUpload = document.getElementById("imageUpload");
const msgCount = document.getElementById("msgCount");

let conversationHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
let stats = JSON.parse(localStorage.getItem("chatStats")) || { messages: 0 };

msgCount.innerText = stats.messages;

// Load previous messages
conversationHistory.forEach(msg => {
  addMessage(msg.content, msg.role === "user" ? "user" : "bot");
});

function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.innerText = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  conversationHistory.push({ role: "user", content: text });
  input.value = "";
  stats.messages++;
  localStorage.setItem("chatStats", JSON.stringify(stats));
  msgCount.innerText = stats.messages;

  const typingDiv = document.createElement("div");
  typingDiv.className = "msg bot";
  typingDiv.innerText = "BABI-Bot is typing...";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  message: text,
  history: conversationHistory
})
});

    const data = await res.json();
imageUpload.value = "";
    typingDiv.remove();
    addMessage(data.reply, "bot");

    conversationHistory.push({
      role: "assistant",
      content: data.reply
    });

    localStorage.setItem("chatHistory", JSON.stringify(conversationHistory));

  } catch (err) {
    typingDiv.remove();
    addMessage("Server error. Try again.", "bot");
  }
}

function clearChat() {
  localStorage.removeItem("chatHistory");
  conversationHistory = [];
  messages.innerHTML = "";
}

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});
