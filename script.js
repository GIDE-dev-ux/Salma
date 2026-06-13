// ===================== STATE =====================
let chats = JSON.parse(localStorage.getItem("chats")) || {};
let currentChatId = localStorage.getItem("currentChatId") || null;
let searchQuery = "";

// ===================== ELEMENTS =====================
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');
const newChatBtn = document.getElementById('newChatBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const searchChats = document.getElementById('searchChats')
const chatList = document.getElementById('chatList');

// ===================== UTILS =====================
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function saveChats() {
  localStorage.setItem("chats", JSON.stringify(chats));
  localStorage.setItem("currentChatId", currentChatId);
}
function renderChatList() {
  if (!chatList) return;

  chatList.innerHTML = "";
  chatList.innerHTML = "<div class='chat-item'>TEST CHAT</div>";

  console.log("Chats:", chats);
  console.log("Chat IDs:", Object.keys(chats));

  const filteredChats = Object.keys(chats).filter(id => {
    return id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  filteredChats.reverse().forEach(id => {
    const item = document.createElement("div");

    item.className =
      "chat-item" +
      (id === currentChatId ? " active" : "");

    item.textContent = `Chat ${id.slice(-4)}`;

    item.addEventListener("click", () => {
      loadChat(id);
      renderChatList();
    });

    chatList.appendChild(item);
  });
}

// ===================== CHAT SYSTEM =====================
function createNewChat() {
  const id = Date.now().toString();
  chats[id] = [];
  currentChatId = id;

  saveChats();
renderChatList();
loadChat(id);
}

function loadChat(id) {
  currentChatId = id;
  chatContainer.innerHTML = '';

  const chat = chats[id] || [];

  if (chat.length === 0) {
    addMessage('assistant', "👋 Hi, I'm BABI-Bot.\nAsk me anything!");
  } else {
    chat.forEach(msg => {
      addMessage(msg.role, msg.content);
    });
  }

// Refresh sidebar
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

// ===================== MESSAGE =====================
function addMessage(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `message ${role}`;

  bubble.innerHTML = role === "assistant"
    ? marked.parse(text)
    : `<p>${text}</p>`;

  chatContainer.appendChild(bubble);
  scrollToBottom();
}

// ===================== SEND =====================
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage('user', text);

  chats[currentChatId].push({
    role: "user",
    content: text
  });

  userInput.value = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chats[currentChatId]
      })
    });

    const data = await response.json();

    addMessage('assistant', data.reply);

    chats[currentChatId].push({
      role: "assistant",
      content: data.reply
    });

    saveChats();

  } catch (err) {
    console.error(err);
    addMessage('assistant', '⚠️ Error occurred');
  }
}

// ===================== EVENTS =====================
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

newChatBtn.addEventListener('click', createNewChat);
clearChatBtn.addEventListener('click', clearCurrentChat);
if (searchChats) {
  searchChats.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderChatList();
  });
}

// ===================== INIT =====================
if (!currentChatId || !chats[currentChatId]) {
  createNewChat();
} else {
  loadChat(currentChatId);
}

renderChatList();
