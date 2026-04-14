// ==================== BETTER MOBILE KEYBOARD HANDLING ====================
if ('visualViewport' in window) {
  const messagesContainer = document.getElementById('messages');
  window.visualViewport.addEventListener('resize', () => {
    document.documentElement.style.setProperty('--vh', `${window.visualViewport.height}px`);
    setTimeout(() => messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' }), 100);
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

  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  const GROQ_API_KEY = "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; 
  // REPLACE WITH YOUR REAL GROQ KEY FROM https://console.groq.com/keys
  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

  function addWelcome() {
    messagesDiv.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center px-6 py-12">
        <div class="text-7xl mb-6">❤️</div>
        <h2 class="text-3xl font-light">Hi, I'm BABI-Bot</h2>
        <p class="text-gray-400 mt-4 text-lg">Your friendly AI assistant.<br>Ask me anything!</p>
      </div>
    `;
  }

  addWelcome();

  function scrollToBottom() {
    setTimeout(() => { messagesDiv.scrollTop = messagesDiv.scrollHeight; }, 80);
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
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are BABI-Bot, a friendly and helpful AI assistant." },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Groq API Error:", res.status, errorText);
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const aiReply = data.choices?.[0]?.message?.content || "I couldn't generate a reply.";

      addMessage(aiReply, false);

    } catch (err) {
      console.error("Full error:", err);
      addMessage("⚠️ Sorry, something went wrong.<br>Please check your API key and try again.", false);
    }

    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
    messageCount++;
    countEl.textContent = `${messageCount} messages`;
  });

  input.addEventListener('focus', () => setTimeout(scrollToBottom, 200));
});
