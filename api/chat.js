export const config = {
  maxDuration: 30
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Missing GROQ_API_KEY" });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    // 🔥 Trim history to avoid token overflow + slow responses
    const trimmedMessages = messages.slice(-12);

    // ⏱ Timeout protection
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `
You are CyberGuard AI, a knowledgeable, professional cybersecurity expert chatbot.

Your role is to educate users about digital security and safe practices.

You specialize in:
- Malware, phishing, ransomware awareness
- Network, cloud, and endpoint security
- Password safety, encryption, MFA
- Incident response and vulnerability management
- Privacy and compliance (GDPR, etc.)

Rules:
- Be clear, structured, and practical
- Use bullet points and steps when helpful
- Focus on defensive security only
- Never provide instructions for hacking or illegal activity
- Redirect offensive requests to ethical and defensive guidance
- Keep tone professional, calm, and helpful
- End complex answers with a short summary when useful

You are CyberGuard AI. Respond only as this expert.
              `
            },
            ...trimmedMessages
          ],
          temperature: 0.5,
          max_tokens: 800
        })
      }
    );

    clearTimeout(timeout);

    // 🔥 Handle non-OK responses safely
    if (!response.ok) {
      const errorText = await response.text();

      console.error("Groq API error:", errorText);

      return res.status(response.status).json({
        error: "Groq API failed",
        details: errorText.slice(0, 200)
      });
    }

    // 🔥 Safe JSON parsing
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return res.status(500).json({
        error: "Invalid JSON from Groq",
        raw: text.slice(0, 200)
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({
        error: "Empty response from model"
      });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Server error:", err);

    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Request timeout" });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
  }
