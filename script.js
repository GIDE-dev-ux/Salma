// ===================== STATE =====================
let chats = JSON.parse(localStorage.getItem("chats")) || {};
let currentChatId = localStorage.getItem("currentChatId") || null;
let isLoading = false;

// ===================== ELEMENTS =====================
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');
const newChatBtn = document.getElementById('newChatBtn');
const chatList = document.getElementById('chatList');

// ===================== UTILS =====================
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function saveChats() {
  try {
    localStorage.setItem("chats", JSON.stringify(chats));
    localStorage.setItem("currentChatId", currentChatId);
  } catch (e) {
    console.warn("Storage full, clearing...");
    localStorage.clear();
  }
}

// ===================== CHAT SYSTEM =====================
function createNewChat() {
  const id = Date.now().toString();

  chats[id] = {
    title: "New Chat",
    messages: []
  };

  currentChatId = id;

  saveChats();
  renderChatList();
  loadChat(id);
}

function loadChat(id) {
  currentChatId = id;
  chatContainer.innerHTML = '';

  const chat = chats[id];

  if (!chat || chat.messages.length === 0) {
    addMessage('assistant', "👋 Hi, I'm BABI-Bot.\nAsk me anything!");
  } else {
    chat.messages.forEach(msg => {
      addMessage(msg.role, msg.content);
    });
  }

  saveChats();
  renderChatList();
}

function deleteChat(id) {
  if (!confirm("Delete this chat?")) return;

  delete chats[id];

  const remaining = Object.keys(chats);

  if (remaining.length === 0) {
    createNewChat();
    return;
  }

  currentChatId = remaining[0];

  saveChats();
  renderChatList();
  loadChat(currentChatId);
}

// ===================== SIDEBAR =====================
function renderChatList() {
  if (!chatList) return;

  chatList.innerHTML = '';

  Object.keys(chats).forEach(id => {
    const chat = chats[id];

    const div = document.createElement("div");
    div.className = "chat-item" + (id === currentChatId ? " active" : "");

    div.innerHTML = `
      <span class="chat-title">${chat.title}</span>
      <button class="delete-btn">🗑️</button>
    `;

    div.onclick = () => loadChat(id);

    div.querySelector(".delete-btn").onclick = (e) => {
      e.stopPropagation();
      deleteChat(id);
    };

    chatList.appendChild(div);
  });
}

// ===================== MESSAGE =====================
function addMessage(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `message ${role}`;

  bubble.innerHTML = role === "assistant"
    ? marked.parse(text || "⚠️ No response")
    : `<p>${text}</p>`;

  chatContainer.appendChild(bubble);
  scrollToBottom();

  return bubble;
}

// ===================== TYPING =====================
function createTyping() {
  const bubble = document.createElement('div');
  bubble.className = 'message assistant';

  bubble.innerHTML = `
    <div class="typing">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  chatContainer.appendChild(bubble);
  scrollToBottom();

  return bubble;
}

// ===================== SEND =====================
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;

  let typingBubble = null;

  try {
    const chat = chats[currentChatId];
    if (!chat) throw new Error("Chat missing");

    addMessage('user', text);

    chat.messages.push({
      role: "user",
      content: text
    });

    // title
    if (chat.messages.length === 1) {
      chat.title = text.length > 25 ? text.slice(0, 25) + "..." : text;
    }

    // limit history
    if (chat.messages.length > 20) {
      chat.messages = chat.messages.slice(-20);
    }

    userInput.value = '';
    userInput.focus();

    typingBubble = createTyping();

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chat.messages })
    });

    if (!response.ok) throw new Error("API failed");

    const data = await response.json();

    if (typingBubble) typingBubble.remove();

    const reply = (data.reply && data.reply.trim())
      ? data.reply
      : "⚠️ No response from AI";

    addMessage('assistant', reply);

    chat.messages.push({
      role: "assistant",
      content: reply
    });

    saveChats();
    renderChatList();

  } catch (err) {
    console.error(err);

    if (typingBubble) typingBubble.remove();

    addMessage('assistant', '⚠️ Something went wrong. Try again.');
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
  }
}

// ===================== EVENTS =====================
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
    sendMessage();
  }
});

newChatBtn.addEventListener('click', createNewChat);

// ===================== INIT =====================
if (!currentChatId || !chats[currentChatId]) {
  createNewChat();
} else {
  loadChat(currentChatId);
}

renderChatList();
