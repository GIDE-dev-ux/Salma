export default async function handler(req, res) {

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { message, history } = req.body;

    // Limit conversation history
    const trimmedHistory = (history || []).slice(-10);

    // Call Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: "You are BABI-Bot, a friendly AI assistant."
          },
          ...trimmedHistory,
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await response.json();

    const reply = data.choices?.[0]?.message?.content || "No response";

    res.status(200).json({
      reply: reply
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Server error"
    });

  }
      }
