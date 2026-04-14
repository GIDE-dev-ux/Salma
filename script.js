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
    }, 100);
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

  // === PUT YOUR GROQ API KEY HERE ===
  const GROQ_API_KEY = "gsk_YourActualKeyHere1234567890";   // ← CHANGE THIS

  // Welcome Message
  function addWelcome() {
    messagesDiv.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center px-6 py-12">
        <div class="text-7xl mb-6">❤️</div>
        <h2 class="text-3xl font-light text-white">Hi, I'm BABI-Bot</h2>
        <p class="text-gray-400 mt-4 text-lg max-w-[280px]">
          Your friendly AI assistant. Ask me anything!
        </p>
      </div>
    `;
  }

  addWelcome();

  function scrollToBottom() {
    setTimeout(() => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 80);
  }

  // Add a message to the chat
  function addMessage(content, isUser) {
    const div = document.createElement('div');
    div.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
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

    // Add user message
    addMessage(userMessage, true);

    input.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '…';

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",   // Fast & high quality model
          messages: [
            { role: "system", content: "You are BABI-Bot, a friendly and helpful AI assistant." },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content || 
                     "Sorry, I couldn't generate a response right now.";

      addMessage(aiReply, false);

    } catch (err) {
      console.error(err);
      addMessage("⚠️ Sorry, something went wrong. Please check your API key and try again.", false);
    }

    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';

    messageCount++;
    countEl.textContent = `${messageCount} messages`;
  });

  // Extra scroll when focusing input
  input.addEventListener('focus', () => {
    setTimeout(scrollToBottom, 200);
  });
});
