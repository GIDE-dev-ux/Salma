// ===================== STATE =====================
let chats = JSON.parse(localStorage.getItem("chats")) || {};
let currentChatId =
  localStorage.getItem("currentChatId") || null;

// ===================== ELEMENTS =====================
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');
const clearChatBtn = document.getElementById('clearChatBtn');

// ===================== UTILS =====================
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function saveChats() {
  localStorage.setItem("chats", JSON.stringify(chats));
  localStorage.setItem("currentChatId", currentChatId);
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
  chatContainer.innerHTML = '';

  const chat = chats[id] || [];

  if (chat.length === 0) {
    addMessage('assistant', "👋 Hi, I'm BABI-Bot.\nAsk me anything!");
  } else {
    chat.forEach(msg => {
      addMessage(msg.role, msg.content);
    });
  }

  saveChats();
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
function addMessage(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `message ${role}`;

  const content = role === "assistant"
    ? marked.parse(text)
    : `<p>${text}</p>`;

  bubble.innerHTML = `
    ${content}
    <div class="timestamp">${getCurrentTime()}</div>
  `;

  chatContainer.appendChild(bubble);

  // Highlight code blocks
  bubble.querySelectorAll('pre code').forEach((block) => {
  hljs.highlightElement(block);

  const pre = block.parentElement;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = 'Copy';

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(block.innerText);

    copyBtn.textContent = 'Copied!';

    setTimeout(() => {
      copyBtn.textContent = 'Copy';
    }, 2000);
  };

  pre.prepend(copyBtn);
});

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


// ===================== EVENTS =====================
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  sendBtn.disabled = true;
  userInput.disabled = true;

  if (!chats[currentChatId]) {
    chats[currentChatId] = [];
  }

  addMessage('user', text);

  chats[currentChatId].push({
    role: "user",
    content: text
  });

  userInput.value = '';
  addTypingIndicator();

  try {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: chats[currentChatId]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Server error');
  }

  removeTypingIndicator();

  addMessage('assistant', data.reply);

  chats[currentChatId].push({
    role: "assistant",
    content: data.reply
  });

  saveChats();

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
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

clearChatBtn.addEventListener('click', clearCurrentChat);


// ===================== INIT =====================
if (!currentChatId || !chats[currentChatId]) {
  createNewChat();
} else {
  loadChat(currentChatId);
}
