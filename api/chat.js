import { getMemoryUpdatePrompt } from "./lib/prompts/memoryUpdatePrompt.js";
import { getSearchPrompt } from "./lib/prompts/searchPrompt.js";
import { getMemoryPrompt } from "./lib/prompts/memoryPrompt.js";
import { getSystemPrompt } from "./lib/prompts/systemPrompt.js";
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

console.log(`Tavily results: ${data.results?.length || 0}`);

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
              content: getSearchPrompt()
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
               content: getMemoryPrompt()
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

async function updatePersonalMemory(existingMemory, newMemory) {
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
          max_tokens: 200,
          messages: [
  {
    role: "system",
    content: getMemoryUpdatePrompt(
      existingMemory,
      newMemory
    )
  }
]
        })
      }
    );

    const data = await response.json();

    return (
      data?.choices?.[0]?.message?.content?.trim() ||
      existingMemory
    );

  } catch (err) {
    console.error("Memory update failed:", err);
    return existingMemory;
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

let updatedPersonalMemory = personalMemory;

if (extractedMemory) {
  updatedPersonalMemory = await updatePersonalMemory(
    personalMemory,
    extractedMemory
  );

  console.log(
    "Updated Personal Memory:",
    updatedPersonalMemory
  );
}

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
  "openai/gpt-oss-120b"
];

if (!allowedModels.includes(model)) {
  return res.status(400).json({
    error: "Invalid model"
  });
}

if (messages.length > 500) {
  return res.status(400).json({
    error: "Too many messages"
  });
}

    // ✅ Timeout protection
    const controller = new AbortController();
    const recentMessages = messages.slice(-20);
    const timeout = setTimeout(() => controller.abort(), 28000);

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
  content: getSystemPrompt({
    personalMemory: updatedPersonalMemory,
    memorySummary,
    webContext
  })
},
           ...recentMessages
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
  newMemory: extractedMemory,
  updatedPersonalMemory
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
