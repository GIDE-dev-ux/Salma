export const config = {
  maxDuration: 60, // ✅ allow longer streaming on Vercel
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

    // ✅ Abort controller with timeout safety
    const controller = new AbortController();
    const signal = controller.signal;

    const timeout = setTimeout(() => {
      controller.abort();
      console.log("Request timeout → aborted");
    }, 60000); // 60s safety

    // ✅ Handle disconnect (both req + res)
    const abortHandler = () => {
      controller.abort();
      console.log("Client disconnected → aborted");
    };

    req.on("close", abortHandler);
    res.on("close", abortHandler);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are BABI-Bot, a professional AI assistant.
Expert in cybersecurity, programming, and software development.
Give clear, concise answers and explain step-by-step when needed.
Never assist with illegal or harmful activities.`
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 800,
        stream: true
      })
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      console.error("Groq API error:", text);
      clearTimeout(timeout);
      return res.status(500).json({ error: "Groq API failed" });
    }

    // ✅ SSE HEADERS
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } catch (err) {
      console.error("Streaming error:", err);
    } finally {
      clearTimeout(timeout);
      res.end();
    }

  } catch (error) {
    console.error("Server error:", error);

    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.end();
    }
  }
}