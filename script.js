// ==================== BETTER MOBILE KEYBOARD HANDLING ====================
if ('visualViewport' in window) {
  const messagesContainer = document.getElementById('messages');
  
  window.visualViewport.addEventListener('resize', () => {
    const vh = window.visualViewport.height;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    setTimeout(() => {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    }, 150);
  });
}

// ==================== MAIN CHAT LOGIC ====================
document.addEventListener('DOMContentLoaded', () => {
  const messagesDiv = document.getElementById('messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const countEl = document.getElementById('message-count');

  let messageCount = 0;

  // Smaller Welcome Message (matches your current smaller design)
  function addWelcome() {
    messagesDiv.innerHTML = `
      <div>
        <div class="heart">❤️</div>
        <h2>Hi, I'm BABI-Bot</h2>
        <p>Your friendly AI assistant.<br>Ask me anything!</p>
      </div>
    `;
  }

  addWelcome();

  function scrollToBottom() {
    setTimeout(() => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 100);
  }

  function addMessage(content, isUser) {
    const div = document.createElement('div');
    div.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`;
    div.innerHTML = `
      <div class="message ${isUser ? 'user-message' : 'bot-message'}">
        ${content}
      </div>
    `;
    messagesDiv.appendChild(div);
    scrollToBottom();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = input.value.trim();
    if (!userMessage) return;

    addMessage(userMessage, true);

    input.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '…';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: userMessage }] 
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const aiReply = data.reply || "Sorry, I couldn't generate a response right now.";

      addMessage(aiReply, false);

    } catch (err) {
      console.error('Chat error:', err);
      addMessage("⚠️ Sorry, something went wrong. Please try again.", false);
    }

    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';

    messageCount++;
    countEl.textContent = `${messageCount} messages`;
  });

  // Extra scroll for keyboard on Tecno Pop 7 Pro
  input.addEventListener('focus', () => {
    setTimeout(scrollToBottom, 300);
  });
});
