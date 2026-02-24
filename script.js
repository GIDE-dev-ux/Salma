// get elements
const messages = document.getElementById("messages");
const input = document.getElementById("input");


// add message to chat
function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.innerText = text;
  messages.appendChild(div);

  messages.scrollTop = messages.scrollHeight;
}


// send message to server
async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  // show user message
  addMessage(text, "user");
  input.value = "";

  // show typing
  addMessage("Typing...", "bot");

  try {
    const res = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();

    // remove typing
    messages.lastChild.remove();

    // show bot reply
    addMessage(data.reply, "bot");

  } catch (err) {
    messages.lastChild.remove();
    addMessage("Server error. Try again.", "bot");
  }
}


// press Enter to send
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});