// ===================== STATE =====================
let selectedImages = [];
let chats = JSON.parse(localStorage.getItem("chats")) || {};
let currentChatId = localStorage.getItem("currentChatId") || null;

const MAX_HISTORY = 10;

// ===================== ELEMENTS =====================
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');
const clearBtn = document.getElementById('clearBtn');
const newChatBtn = document.getElementById('newChatBtn');

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
  renderChatList();
  loadChat(id);
}

function loadChat(id) {
  currentChatId = id;
  chatContainer.innerHTML = '';

  const chat = chats[id] || [];

  if (chat.length === 0) {
    addWelcome();
  } else {
    chat.forEach(msg => {
      addMessage(msg.role, msg.content, msg.images || []);
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

function renderChatList() {
  const list = document.getElementById("chatList");
  list.innerHTML = '';

  Object.keys(chats).forEach(id => {
    const div = document.createElement("div");
    div.className = "chat-item" + (id === currentChatId ? " active" : "");

    const title = chats[id][0]?.content?.slice(0, 20) || "New Chat";

    div.innerHTML = `
      <span class="chat-title">${title}</span>
      <button class="delete-btn">🗑️</button>
    `;

    div.querySelector(".chat-title").onclick = () => loadChat(id);
    div.querySelector(".delete-btn").onclick = (e) => {
      e.stopPropagation();
      deleteChat(id);
    };

    list.appendChild(div);
  });
}

// ===================== WELCOME =====================
function addWelcome() {
  const welcome = document.createElement('div');
  welcome.className = 'message assistant';
  welcome.innerHTML = `
    <p>👋 Hi, I'm BABI-Bot.<br>
    Ask me anything about coding or cybersecurity.</p>
  `;
  chatContainer.appendChild(welcome);
}

// ===================== IMAGE =====================
imageUpload.addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        selectedImages.push(ev.target.result);
        renderPreviews();
      };
      reader.readAsDataURL(file);
    }
  });
});

function renderPreviews() {
  imagePreview.innerHTML = '';

  selectedImages.forEach((base64, index) => {
    const div = document.createElement('div');
    div.style.position = 'relative';

    div.innerHTML = `
      <img src="${base64}" style="height:80px;border-radius:10px;">
      <button style="position:absolute;top:-6px;right:-6px;background:red;color:white;border:none;border-radius:50%;width:20px;height:20px;">×</button>
    `;

    div.querySelector('button').onclick = () => {
      selectedImages.splice(index, 1);
      renderPreviews();
    };

    imagePreview.appendChild(div);
  });
}

// ===================== MESSAGE =====================
function addMessage(role, text, images = []) {
  const bubble = document.createElement('div');
  bubble.className = `message ${role}`;

  let html = role === "assistant" && window.marked
    ? marked.parse(text)
    : `<p>${text}</p>`;

  images.forEach(src => {
    html += `<img src="${src}" style="max-width:100%;margin-top:8px;">`;
  });

  bubble.innerHTML = html;
  chatContainer.appendChild(bubble);
  scrollToBottom();

  return bubble;
}

// ===================== STREAM =====================
function createStreamingBubble() {
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
  if (!text && selectedImages.length === 0) return;

  addMessage('user', text || '📸 Image', selectedImages);

  chats[currentChatId].push({
    role: "user",
    content: text,
    images: selectedImages
  });

  const currentImages = [...selectedImages];

  userInput.value = '';
  selectedImages = [];
  renderPreviews();

  const bubble = createStreamingBubble();
  let streamingEl = null;
  let fullResponse = '';

  try {
    const trimmed = chats[currentChatId].slice(-MAX_HISTORY);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: trimmed })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (let line of lines) {
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;

          if (delta) {
            fullResponse += delta;

            if (!streamingEl) {
              bubble.innerHTML = `<p class="streaming-text"></p>`;
              streamingEl = bubble.querySelector('.streaming-text');
            }

            streamingEl.innerHTML = marked.parse(fullResponse);
            scrollToBottom();
          }
        } catch {}
      }
    }

    chats[currentChatId].push({
      role: "assistant",
      content: fullResponse
    });

    saveChats();
    renderChatList();

  } catch (err) {
    console.error(err);
    bubble.innerHTML = `<p>⚠️ Error occurred.</p>`;
  }
}

// ===================== EVENTS =====================
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});
newChatBtn.addEventListener('click', createNewChat);

clearBtn.addEventListener('click', () => {
  if (confirm("Clear this chat?")) {
    chats[currentChatId] = [];
    saveChats();
    loadChat(currentChatId);
  }
});

// ===================== INIT =====================
if (!currentChatId || !chats[currentChatId]) {
  createNewChat();
} else {
  loadChat(currentChatId);
}

renderChatList();