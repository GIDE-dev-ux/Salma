const rateLimitMap = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  const now = Date.now();
  const windowTime = 10 * 1000; // 10 seconds
  const maxRequests = 8;

  const userData = rateLimitMap.get(ip) || {
    count: 0,
    startTime: now,
  };

  if (now - userData.startTime > windowTime) {
    userData.count = 1;
    userData.startTime = now;
  } else {
    userData.count++;
  }

  rateLimitMap.set(ip, userData);

  if (userData.count > maxRequests) {
    return res.status(429).json({
      reply: "Too many requests. Slow down.",
    });
  }

  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        reply: "Message is required.",
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: "You are BABI-Bot, a friendly AI assistant." },
            ...history,
            { role: "user", content: message },
          ],
        }),
      }
    );

    const data = await response.json();

if (!response.ok) {
  return res.status(response.status).json({
    reply: data.error?.message || "Groq API error"
  });
}

    return res.status(200).json({
      reply: data.choices[0].message.content,
    });

  } catch (error) {
    return res.status(500).json({
      reply: "Server error. Check API key.",
    });
  }
}
