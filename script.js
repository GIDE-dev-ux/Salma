// ===================== STATE =====================
let chats = {};
let memory = {
  name: null,
  facts: []
};

try {
  chats = JSON.parse(localStorage.getItem("chats")) || {};
} catch (e) {
  chats = {};
}

try {
  memory = JSON.parse(localStorage.getItem("memory")) || {
    name: null,
    facts: []
  };
} catch (e) {
  memory = { name: null, facts: [] };
}

let currentChatId = localStorage.getItem("currentChatId");

// ===================== ELEMENTS =====================
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatContainer = document.getElementById("chatContainer");
const clearChatBtn = document.getElementById("clearChatBtn");

// ===================== SAVE =====================
function saveChats() {
  localStorage.setItem("chats", JSON.stringify(chats));
  localStorage.setItem("currentChatId", currentChatId);
}

function saveMemory() {
  localStorage.setItem("memory", JSON.stringify(memory));
}

// ===================== UTILS =====================
function scrollToBottom() {
  chatContainer.scrollTo({
    top: chatContainer.scrollHeight,
    behavior: "smooth"
  });
}

// ===================== MEMORY ENGINE =====================
function updateMemory(text) {
  const lower = text.toLowerCase();

  if (lower.includes("my name is")) {
    const name = text.split("my name is")[1]?.trim();
    if (name) memory.name = name;
  }

  if (
    lower.includes("i like") ||
    lower.includes("i love") ||
    lower.includes("i prefer")
  ) {
    memory.facts.push(text);
  }

  if (memory.facts.length > 10) {
    memory.facts.shift();
  }

  saveMemory();
}

// ===================== CHAT SYSTEM =====================
function createNewChat() {
  const id = Date.now().toString();
  chats[id] = [];
  currentChatId = id;

  saveChats();
  loadChat(id);
}

function loadChat(id) {
  currentChatId = id;
  chatContainer.innerHTML = "";

  const chat = chats[id] || [];

  if (chat.length === 0) {
    addMessage(
      "assistant",
      "👋 Hi" + (memory.name ? ` ${memory.name}` : "") + ", I'm BABI-Bot."
    );
  } else {
    chat.forEach(msg => addMessage(msg.role, msg.content));
  }

  saveChats();
}

// ===================== CLEAR CHAT =====================
function clearCurrentChat() {
  if (!currentChatId) return;

  if (!confirm("Start a new conversation?")) return;

  chats[currentChatId] = [];
  saveChats();
  loadChat(currentChatId);
}

// ===================== TIME =====================
function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ===================== MESSAGE =====================
function addMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;

  const content =
    role === "assistant"
      ? marked.parse(text || "")
      : `<p>${text}</p>`;

  bubble.innerHTML = `
    ${content}
    <div class="timestamp">${getCurrentTime()}</div>
  `;

  chatContainer.appendChild(bubble);
  scrollToBottom();
}

// ===================== STREAM MESSAGE =====================
function createStreamingMessage() {
  const bubble = document.createElement("div");
  bubble.className = "message assistant";
  bubble.innerHTML = "<p></p>";
  chatContainer.appendChild(bubble);
  scrollToBottom();
  return bubble;
}

// ===================== SEND MESSAGE =====================
async function sendMessage() {
  if (sendBtn.disabled) return;

  const text = userInput.value.trim();
  if (!text) return;

  sendBtn.disabled = true;
  userInput.disabled = true;

  if (!chats[currentChatId]) chats[currentChatId] = [];

  addMessage("user", text);

  chats[currentChatId].push({
    role: "user",
    content: text
  });

  updateMemory(text);

  userInput.value = "";

  const bubble = createStreamingMessage();
  let fullText = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: chats[currentChatId],
        memory: memory
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (let line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = line.replace("data: ", "");

        if (data === "[DONE]") break;

        try {
          const token = JSON.parse(data);
          fullText += token;

          bubble.innerHTML = marked.parse(fullText);
          scrollToBottom();
        } catch {}
      }
    }

    chats[currentChatId].push({
      role: "assistant",
      content: fullText
    });

    saveChats();
  } catch (err) {
    console.error(err);
    bubble.innerHTML = "⚠️ Error generating response";
  } finally {
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.blur();
  }
}

// ===================== EVENTS =====================
sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

clearChatBtn.addEventListener("click", clearCurrentChat);

// ===================== INIT =====================
if (!currentChatId || !chats[currentChatId]) {
  createNewChat();
} else {
  loadChat(currentChatId);
}

// ===================== PWA REGISTER =====================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("PWA ready"))
      .catch(err => console.log(err));
  });
      }
