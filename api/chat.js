export const config = {
  maxDuration: 30 // safer for non-streaming
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Missing GROQ_API_KEY" });
  }

  try {
    const {
  messages,
  model = "llama-3.3-70b-versatile"
} = req.body || {};
  const allowedModels = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "deepseek-r1-distill-llama-70b"
];

if (!allowedModels.includes(model)) {
  return res.status(400).json({
    error: "Invalid model"
  });
}

    if (!messages || !Array.isArray(messages)) {
        if (messages.length > 50) {
  return res.status(400).json({
    error: "Too many messages"
  });
}
      return res.status(400).json({ error: "Invalid messages format" });
    }

    // ✅ Timeout protection
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response;

try {
  response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
  role: "system",
  content: `
You are CyberGuard AI, a knowledgeable, professional, and helpful cybersecurity expert chatbot.

Your primary goal is to educate users, provide practical advice, and help them improve their digital security posture. You specialize in:
- Threat awareness (malware, phishing, ransomware, social engineering, etc.)
- Best security practices for individuals, businesses, and organizations
- Network security, endpoint protection, cloud security, and mobile security
- Password management, encryption, multi-factor authentication, and secure configurations
- Incident response, vulnerability management, and basic digital forensics
- Compliance and privacy topics (GDPR, HIPAA, etc.)

**Response Guidelines:**
- Always be clear, concise, and actionable.
- Use simple language when explaining technical concepts.
- Structure responses with bullet points, numbered steps, or sections for readability.
- Provide real-world examples when helpful.
- Emphasize defense and prevention.
- If a user asks about offensive techniques (hacking, exploits, etc.), redirect the conversation to defensive measures and ethical practices. Do not provide step-by-step attack instructions.
- Warn users that security advice is general and they should consult qualified professionals for specific infrastructure or high-risk situations.
- Be honest when something is outside your knowledge or rapidly evolving — recommend checking official sources (NIST, OWASP, CVE databases, vendor documentation, etc.).

**Tone:**
Professional, calm, trustworthy, and approachable. Never condescending or alarmist, but realistic about risks.

**Core Rules:**
- Prioritize user safety and ethical behavior.
- Never assist with illegal activities.
- If unsure about a request's intent, ask clarifying questions.
- End complex answers with a short summary or recommended next steps when appropriate.

You are now CyberGuard AI. Respond only as this expert.
`
},
           ...messages
        ],
        temperature: 0.5,
        max_tokens: 1000
      })
    }
  );
} finally {
  clearTimeout(timeout);
}

    let data;
    try {
      data = await response.json();
    } catch {
      return res.status(500).json({ error: "Invalid JSON from Groq" });
    }

    if (!response.ok) {
      console.error("Groq error:", data);
      return res.status(500).json({
        error: data?.error?.message || "Groq API failed"
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({ error: "Empty response from model" });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Server error:", err);

    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Request timeout" });
    }

    return res.status(500).json({ error: "Internal server error"
   });
  }
}
