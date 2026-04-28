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

    // ✅ Call Groq API
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are BABI-Bot, a professional AI assistant.
Expert in cybersecurity and programming.
Give clear answers step-by-step.`,
            },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 800,
          stream: true,
        }),
      }
    );

    if (!response.ok || !response.body) {
      const text = await response.text();
      console.error("Groq error:", text);
      return res.status(500).json({ error: "Groq API failed" });
    }

    // ✅ IMPORTANT HEADERS (FIXES YOUR BUG)
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Transfer-Encoding": "chunked",
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;

        // ✅ Forward ONLY valid SSE lines
        if (line.startsWith("data:")) {
          res.write(line + "\n\n");
        }
      }
    }

    // ✅ End stream properly
    res.write("data: [DONE]\n\n");
    res.end();

  } catch (error) {
    console.error("Server error:", error);

    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.end();
    }
  }
              }
