// ===================== STATE =====================
let chats = JSON.parse(localStorage.getItem("chats")) || {};
let currentChatId =
  localStorage.getItem("currentChatId") || null;

let selectedModel =
  localStorage.getItem("selectedModel") ||
  "llama-3.3-70b-versatile";

let memorySummary =
  localStorage.getItem("memorySummary") || "";
  let personalMemory =
  localStorage.getItem("personalMemory") || "";
// ===================== ELEMENTS =====================
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');
const clearChatBtn = document.getElementById('clearChatBtn');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');
const newChatBtn = document.getElementById('newChatBtn');
const chatList = document.getElementById('chatList');
const modelSelector = document.getElementById('modelSelector');
const exportBtn = document.getElementById('exportBtn');

// ===================== UTILS =====================
function scrollToBottom() {
  chatContainer.lastElementChild?.scrollIntoView({
    behavior: "smooth",
    block: "end"
  });
}

function saveChats() {
  localStorage.setItem("chats", JSON.stringify(chats));
  localStorage.setItem("currentChatId", currentChatId);
}

// ===================== CHAT SYSTEM =====================
function createNewChat() {
  const id = crypto.randomUUID
  ? crypto.randomUUID()
  : Date.now().toString();

  chats[id] = [];
  currentChatId = id;

  saveChats();
  loadChat(id);
  renderChatList();
}

function loadChat(id) {
  currentChatId = id;
  chatContainer.innerHTML = '';

  const chat = chats[id] || [];

  chat.forEach(msg => {
    addMessage(
      msg.role,
      msg.content,
      msg.timestamp
    );
  });

  saveChats();
  renderChatList();
}

// ===================== CLEAR CHAT =====================
function clearCurrentChat() {
  if (!currentChatId) return;

  const confirmClear = confirm("Start a new conversation?");
  if (!confirmClear) return;

  chats[currentChatId] = []; // clear messages
  saveChats();
  loadChat(currentChatId); // reload empty chat
}

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ===================== MESSAGE =====================
function addMessage(role, text, timestamp = Date.now()) {
  const bubble = document.createElement('div');
  
  bubble.className = `message ${role}`;

  const content = role === "assistant"
  ? DOMPurify.sanitize(
      marked.parse(text || '')
    )
  : `<p>${text}</p>`;
bubble.innerHTML = `
  ${content}

  <div class="timestamp">
    ${new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })}
  </div>
`;
  chatContainer.appendChild(bubble);

// Copy button for code blocks
bubble.querySelectorAll("pre").forEach((pre) => {
  if (pre.querySelector(".copy-code-btn")) return;
  const btn = document.createElement("button");

  btn.className = "copy-code-btn";
  btn.textContent = "📋 Copy";

  btn.addEventListener("click", async () => {
    const code =
      pre.querySelector("code")?.innerText || "";

    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = "✅ Copied";
    } catch {
      btn.textContent = "❌ Failed";
    }

    setTimeout(() => {
      btn.textContent = "📋 Copy";
    }, 2000);
  });

  pre.style.position = "relative";
  pre.appendChild(btn);
});


if (window.hljs) {
  bubble
    .querySelectorAll("pre code")
    .forEach((block) => {
      hljs.highlightElement(block);
    });
}

scrollToBottom();
}

// ===================== TYPING INDICATOR =====================
function addTypingIndicator() {
  const typing = document.createElement('div');

  typing.className = 'message assistant';
  typing.id = 'typingIndicator';

  typing.innerHTML = `
<div class="typing">
  <span></span>
  <span></span>
  <span></span>
</div>
`;

  chatContainer.appendChild(typing);
  scrollToBottom();
}

function removeTypingIndicator() {
  const typing = document.getElementById('typingIndicator');

  if (typing) {
    typing.remove();
  }
}

function renderChatList() {
  if (!chatList) return;

  chatList.innerHTML = "";

  Object.keys(chats)
    .reverse()
    .forEach(id => {

      const div = document.createElement("div");

      div.className =
        "chat-item" +
        (id === currentChatId ? " active" : "");

      const firstUserMessage =
        chats[id]?.find(
          msg => msg.role === "user"
        );

      const title =
  firstUserMessage?.content?.slice(0, 30) ||
  "New Chat";

div.innerHTML = `
  <span>${title}</span>
  <button class="delete-btn">🗑️</button>
`;

const deleteBtn =
  div.querySelector(".delete-btn");
  

deleteBtn.addEventListener("click", (e) => {
  e.stopPropagation();

  if (!confirm("Delete this chat?")) return;

  delete chats[id];
  saveChats();

  if (currentChatId === id) {
    const remainingChats =
      Object.keys(chats);

    if (remainingChats.length > 0) {
      currentChatId = remainingChats[0];
loadChat(currentChatId);
    } else {
      createNewChat();
    }
  }

  saveChats();
  renderChatList();
});

      div.onclick = () => {
        loadChat(id);
      };

      chatList.appendChild(div);
    });
}


// ===================== EVENTS =====================
async function sendMessage() {
    if (sendBtn.disabled) return;
    
  const text = userInput.value.trim();
  if (!text) return;
  
  const lowerText = text.toLowerCase().trim();

// Show personal memory
if (
  lowerText === "what do you remember about me?" ||
  lowerText === "show my memory" ||
  lowerText === "show memory"
) {
  if (!personalMemory.trim()) {
    addMessage(
      "assistant",
      "I don't have any personal memories stored yet."
    );
  } else {
    addMessage(
      "assistant",
      `Here's what I currently remember about you:\n\n${personalMemory}`
    );
  }

  return;
}

// Forget memory command
if (lowerText.startsWith("forget ")) {

  const memoryToForget = text.substring(7).trim();

  const memories = personalMemory
    ? personalMemory.split("\n")
    : [];

  const updatedMemories = memories.filter(memory =>
    !memory.toLowerCase().includes(memoryToForget.toLowerCase())
  );

  if (updatedMemories.length === memories.length) {

    addMessage(
      "assistant",
      "I couldn't find a matching memory to forget."
    );

  } else {

    personalMemory = updatedMemories.join("\n");

    localStorage.setItem(
      "personalMemory",
      personalMemory
    );

    addMessage(
      "assistant",
      "I've forgotten that information."
    );
  }

  return;
}

  sendBtn.disabled = true;
  userInput.disabled = true;

  if (!chats[currentChatId]) {
    chats[currentChatId] = [];
  }

  addMessage('user', text);

  chats[currentChatId].push({
  role: "user",
  content: text,
  timestamp: Date.now()
});

  userInput.value = '';
userInput.style.height = 'auto';
  addTypingIndicator();

  try {
  const recentMessages =
  chats[currentChatId].slice(-60);

const apiMessages = recentMessages.map(msg => ({
  role: msg.role,
  content: msg.content
}));

const controller = new AbortController();

const timeout = setTimeout(() => {
  controller.abort();
}, 30000);

const response = await fetch("/api/chat", {
  method: "POST",
  signal: controller.signal,
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    messages: apiMessages,
    model: selectedModel,
    memorySummary,
    personalMemory
  })
});

  let data;

try {
  data = await response.json();
  clearTimeout(timeout);
  
  if (data.updatedPersonalMemory) {

  personalMemory = data.updatedPersonalMemory;

  localStorage.setItem(
    "personalMemory",
    personalMemory
  );

  console.log(
    "Updated Personal Memory:",
    personalMemory
  );

} else if (data.newMemory) {

  // Fallback for older backend versions
  const memories = personalMemory
    ? personalMemory.split("\n")
    : [];

  if (!memories.includes(data.newMemory)) {

    memories.push(data.newMemory);

    personalMemory = memories.join("\n");

    localStorage.setItem(
      "personalMemory",
      personalMemory
    );
  }
}

} catch {
  throw new Error("Invalid server response");
}

  if (!response.ok) {
    throw new Error(data.error || 'Server error');
  }

  removeTypingIndicator();

  addMessage('assistant', data.reply);

  chats[currentChatId].push({
  role: "assistant",
  content: data.reply,
  timestamp: Date.now()
});
  const MAX_MESSAGES = 60;

if (
  chats[currentChatId].length >
  MAX_MESSAGES
) {

  const oldMessages =
    chats[currentChatId].slice(0, 30);

  const textToSummarize =
    oldMessages
      .map(msg =>
        `${msg.role}: ${msg.content}`
      )
      .join("\n");

  try {

    const summaryResponse =
      await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          text: textToSummarize,
          existingMemory: memorySummary
        })
      });

    const summaryData =
      await summaryResponse.json();

    memorySummary =
      summaryData.summary ||
      memorySummary;

    localStorage.setItem(
      "memorySummary",
      memorySummary
    );

  } catch (err) {
    console.error(
      "Memory summary failed",
      err
    );
  }

  chats[currentChatId] =
    chats[currentChatId].slice(-30);
}

  saveChats()
  renderChatList();

} catch (err) {
  console.error(err);

  removeTypingIndicator();

  addMessage(
    'assistant',
    `⚠️ ${err.message || 'Error occurred'}`
  );

} finally {
  sendBtn.disabled = false;
  userInput.disabled = false;
  userInput.blur(); // prevent automatic focus
}
} // Function closes here

sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height =
    userInput.scrollHeight + "px";
});

clearChatBtn.addEventListener('click', clearCurrentChat);

// ===================== SIDEBAR =====================
const sidebarOverlay =
  document.getElementById("sidebarOverlay");

function closeSidebar() {
  sidebar.classList.remove("open");

  if (sidebarOverlay) {
    sidebarOverlay.classList.remove("show");
  }
}

menuBtn?.addEventListener("click", () => {
  sidebar.classList.toggle("open");

  if (sidebarOverlay) {
    sidebarOverlay.classList.toggle("show");
  }
});

sidebarOverlay?.addEventListener("click", () => {
  closeSidebar();
});

document.addEventListener("click", (e) => {
  if (
    sidebar.classList.contains("open") &&
    !sidebar.contains(e.target) &&
    e.target !== menuBtn &&
    !menuBtn.contains(e.target)
  ) {
    closeSidebar();
  }
});

newChatBtn?.addEventListener("click", () => {
  createNewChat();

  if (window.innerWidth < 769) {
    closeSidebar();
  }
});


if (modelSelector) {
  modelSelector.value = selectedModel;

  modelSelector.addEventListener('change', () => {
    selectedModel = modelSelector.value;

    localStorage.setItem(
      'selectedModel',
      selectedModel
    );
  });
}

// ===================== INIT =====================
 exportBtn?.addEventListener("click", () => {
  if (!currentChatId) return;

  let md = "# Chat Export\n\n";

  chats[currentChatId].forEach(msg => {
    md += `## ${msg.role}\n\n`;
    md += `${msg.content}\n\n`;
  });

  const blob = new Blob(
    [md],
    { type: "text/markdown" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "chat.md";
  a.click();

  URL.revokeObjectURL(url);
});

  if (!currentChatId || !chats[currentChatId]) {
  createNewChat();
} else {
  loadChat(currentChatId);
}

renderChatList();
