// Inside the form.addEventListener('submit'...

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
      console.error(err);
      addMessage("⚠️ Sorry, something went wrong. Please try again.", false);
    }
