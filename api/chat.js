export const config = {
  maxDuration: 30 // safer for non-streaming
};

async function searchWeb(query) {
  try {
    const response = await fetch(
      "https://api.tavily.com/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: "advanced",
          max_results: 8
        })
      }
    );

    const data = await response.json();
    console.log("Tavily response:", JSON.stringify(data));

    return data.results || [];
  } catch (err) {
    console.error("Tavily error:", err);
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Missing GROQ_API_KEY" });
  }
  
  if (!process.env.TAVILY_API_KEY) {
  console.warn("Missing TAVILY_API_KEY");
}

  try {
    const {
  messages,
  model = "llama-3.3-70b-versatile"
} = req.body || {};

// Validate messages FIRST
if (!messages || !Array.isArray(messages)) {
  return res.status(400).json({
    error: "Invalid messages format"
  });
}

// Get latest user message
const latestMessage =
  messages[messages.length - 1]?.content || "";

const webSearchKeywords = [
  "latest",
  "today",
  "current",
  "recent",
  "news",
  "cve",
  "cves",
  "vulnerability",
  "vulnerabilities",
  "exploit",
  "exploits",
  "advisory",
  "advisories",
  "patch",
  "patches",
  "zero-day",
  "ransomware",
  "breach",
  "security update"
];

const needsWebSearch =
  webSearchKeywords.some(keyword =>
    latestMessage.toLowerCase().includes(keyword)
  );

console.log(
  `Web Search: ${needsWebSearch ? "YES" : "NO"}`
);

const memorySummary =
  req.body?.memorySummary || "";

// ADD THIS
let webContext = "";

if (needsWebSearch) {
  const results = await searchWeb(latestMessage);

  console.log(`Tavily results: ${results.length}`);

  webContext = results
    .map(
      r =>
        `Title: ${r.title}
Content: ${r.content}
URL: ${r.url}`
    )
    .join("\n\n");
}

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

if (messages.length > 100) {
  return res.status(400).json({
    error: "Too many messages"
  });
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
You are CyberGuard AI, a highly intelligent AI assistant.

Conversation Memory:
${memorySummary || "No previous conversation memory."}
Web Search Results:
${webContext || "No web search used."}

Instructions:
- Treat Conversation Memory as long-term context.
- Use it when relevant.
- Do not repeat memory unless useful.
- Prioritize recent messages if they conflict with old memory.
- If Web Search Results are provided:
- Use them as the primary source of truth.
- Do not rely on model memory.
- Summarize the search results.
- Cite the URLs found in Web Search Results.
- Prefer Web Search Results for current events, CVEs, advisories, and recent cybersecurity news.
- Cite URLs when using web results.
- If no web results exist, answer normally.

Rules:

- Understand the user's real intent before answering.
- Use previous conversation context when relevant.
- Give accurate and truthful information.
- Never invent facts.
- If unsure, clearly say so.
- Explain complex topics step-by-step.
- Use markdown formatting.
- Use tables when comparing things.
- Use code blocks for code.
- Be concise for simple questions.
- Be detailed for technical questions.

Cybersecurity Mode:
- Explain threats clearly.
- Provide risk analysis.
- Recommend mitigations.
- Include best practices.
- Focus on defensive and ethical security.

Coding Mode:
- Prefer complete working examples.
- Explain why the solution works.
- Mention potential issues and improvements.

Goal:
Provide answers at ChatGPT-quality level while maintaining accuracy and context.
`
},
           ...messages
        ],
        temperature: 0.3,
        max_tokens: 2000
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
