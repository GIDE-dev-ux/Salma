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
async function shouldSearchWeb(message) {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0,
          max_tokens: 5,
          messages: [
            {
              role: "system",
              content: `You decide whether a user's message requires current or real-time information.

Reply with ONLY one word:

YES = Needs current information from the web.
NO = Can be answered from general knowledge.

Do not explain your answer.`
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    const data = await response.json();

    const answer =
      data?.choices?.[0]?.message?.content
        ?.trim()
        ?.toUpperCase();

    return answer === "YES";

  } catch (err) {
    console.error("Search decision failed:", err);
    return false;
  }
}

async function extractPersonalMemory(message) {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0,
          max_tokens: 50,
          messages: [
            {
              role: "system",
              content: `You extract long-term personal facts from a user's message.

Return ONLY the important long-term fact.

Examples:

User: My name is John.
Output: User's name is John.

User: I use Kali Linux.
Output: User uses Kali Linux.

User: My favorite programming language is Python.
Output: User's favorite programming language is Python.

User: I'm building a chatbot.
Output: User is building a chatbot.

If the message contains no useful long-term information, reply with:

NONE

Do not explain your answer.`
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    const data = await response.json();

    const memory =
      data?.choices?.[0]?.message?.content?.trim();

    if (!memory || memory.toUpperCase() === "NONE") {
      return null;
    }

    return memory;

  } catch (err) {
    console.error("Memory extraction failed:", err);
    return null;
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

const lowerMessage = latestMessage.toLowerCase();

const webSearchTriggers = [
  "latest",
  "today",
  "current",
  "recent",
  "news",
  "breaking",
  "update",
  "updates",
  "cve",
  "cves",
  "vulnerability",
  "vulnerabilities",
  "exploit",
  "exploits",
  "zero-day",
  "advisory",
  "advisories",
  "patch",
  "patches",
  "ransomware",
  "breach",
  "security update",
  "weather",
  "forecast",
  "stock",
  "price",
  "bitcoin",
  "crypto",
  "release",
  "version"
];

let needsWebSearch = webSearchTriggers.some(trigger =>
  lowerMessage.includes(trigger)
);

if (!needsWebSearch) {
  needsWebSearch = await shouldSearchWeb(latestMessage);
}

console.log(
  `Web Search: ${needsWebSearch ? "YES" : "NO"}`
);

if (needsWebSearch) {
  console.log("Searching the web with Tavily...");
}

const memorySummary =
  req.body?.memorySummary || "";
  
  const personalMemory =
  req.body?.personalMemory || "";
  
  const extractedMemory =
  await extractPersonalMemory(latestMessage);

console.log("Extracted Memory:", extractedMemory);

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
You are BABI, a personal Cyber Assistant.

You are an intelligent AI assistant with cybersecurity expertise and web search capabilities.

Identity:
- Your name is BABI.
- You are a personal Cyber Assistant.
- If asked your name, answer "I'm BABI."
- If asked who created you, say you were created by your owner as a personal AI assistant.
- If asked what model powers you, explain that you use large language models through the Groq API.
- Never claim to be ChatGPT, Gemini, Claude, or another AI assistant.

Personal Memory:
${personalMemory || "No personal memory stored."}

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
Deliver high-quality, reliable, and context-aware assistance with a focus on cybersecurity, technology, and practical problem solving.
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

    return res.status(200).json({
  reply,
  newMemory: extractedMemory
});

  } catch (err) {
    console.error("Server error:", err);

    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Request timeout" });
    }

    return res.status(500).json({ error: "Internal server error"
   });
  }
      }
