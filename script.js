const messages = document.getElementById("messages");
const input = document.getElementById("input");
const imageUpload = document.getElementById("imageInput");
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

// Image preview
imageUpload.addEventListener("change", function () {

  const file = imageUpload.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {

    const div = document.createElement("div");
    div.className = "msg user";

    const img = document.createElement("img");
    img.src = e.target.result;

    div.appendChild(img);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;

  };

  reader.readAsDataURL(file);
});

async function sendMessage() {

  const text = input.value.trim();
  const file = imageUpload.files[0];

  let imageData = null;

  if (file) {
    imageData = await convertImage(file);
  }

  if (!text && !file) return;

  if (text) {
    addMessage(text, "user");
  }

  conversationHistory.push({
    role: "user",
    content: [
      { type: "text", text: text }
    ]
  });

  input.value = "";

  stats.messages++;
  localStorage.setItem("chatStats", JSON.stringify(stats));
  msgCount.innerText = stats.messages;

  const typingDiv = document.createElement("div");
  typingDiv.className = "msg bot";
  typingDiv.innerText = "BABI-Bot is typing...";
  messages.appendChild(typingDiv);

  try {

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text,
        history: conversationHistory,
        image: imageData
      })
    });

    const data = await res.json();

    imageUpload.value = "";

    typingDiv.remove();

    typeMessage(data.reply);

    conversationHistory.push({
      role: "assistant",
      content: [
        { type: "text", text: data.reply }
      ]
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

function convertImage(file) {

  return new Promise((resolve) => {

    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);

  });

}

function typeMessage(text) {

  const div = document.createElement("div");
  div.className = "msg bot";
  messages.appendChild(div);

  let i = 0;

  const interval = setInterval(() => {

    div.textContent += text.charAt(i);
    i++;

    messages.scrollTop = messages.scrollHeight;

    if (i >= text.length) {
      clearInterval(interval);
    }

  }, 20);

      }
