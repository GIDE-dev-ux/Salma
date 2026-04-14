// ==================== BETTER MOBILE KEYBOARD HANDLING ====================
if ('visualViewport' in window) {
  const messagesContainer = document.getElementById('messages');
  
  window.visualViewport.addEventListener('resize', () => {
    const vh = window.visualViewport.height;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Auto-scroll to bottom when keyboard opens/closes
    setTimeout(() => {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  });
}

// Main Chat Logic
document.addEventListener('DOMContentLoaded', () => {
  const messagesDiv = document.getElementById('messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const countEl = document.getElementById('message-count');

  let messageCount = 0;

  // Welcome Message (Centered & Beautiful)
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

  // Scroll helper
  function scrollToBottom() {
    setTimeout(() => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 50);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = input.value.trim();
    if (!userMessage) return;

    // Add user message
    messagesDiv.innerHTML += `
      <div class="flex justify-end">
        <div class="message user-message">
          ${userMessage}
        </div>
      </div>
    `;
    scrollToBottom();

    input.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '…';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }] })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const aiReply = data.reply || "Sorry, I couldn't generate a response right now.";

      // Add bot message
      messagesDiv.innerHTML += `
        <div class="flex justify-start">
          <div class="message bot-message">
            ${aiReply}
          </div>
        </div>
      `;

    } catch (err) {
      messagesDiv.innerHTML += `
        <div class="flex justify-start">
          <div class="message bot-message bg-red-950 text-red-200">
            ⚠️ Sorry, something went wrong. Please try again.
          </div>
        </div>
      `;
    }

    scrollToBottom();
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';

    messageCount++;
    countEl.textContent = `${messageCount} messages`;
  });

  // Extra scroll when input is focused
  input.addEventListener('focus', () => {
    setTimeout(scrollToBottom, 200);
  });
});
