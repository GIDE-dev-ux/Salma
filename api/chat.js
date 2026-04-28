export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are BABI-Bot, a professional AI assistant.`
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 800,
        stream: false   // ✅ DISABLED
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Groq API error:", text);
      return res.status(500).json({ error: "Groq API failed" });
    }

    const data = await response.json();

    res.status(200).json(data);

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
      }
