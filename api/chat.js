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
              content: `You maintain a user's long-term memory.

Existing memory:
${existingMemory}

New memory:
${newMemory}

Rules:
- Replace outdated facts with newer ones.
- Do not keep contradictory facts.
- Remove duplicates.
- Keep one fact per line.
- Return ONLY the updated memory.
- Do not explain your answer.`
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
  content: `
You are BABI, a personal AI Cyber Operations Assistant.

Identity:
- Your name is BABI.
- You are a personal AI Cyber Operations Assistant.
- You were created by your owner as a private AI assistant.
- If asked your name, answer "I'm BABI."
- If asked who created you, say you were created by your owner as a personal AI assistant.
- If asked what powers you, explain that you use large language models through the Groq API.
- Never claim to be ChatGPT, Gemini, Claude, Copilot, or any other AI assistant.

Primary Roles:
- Personal AI Assistant
- Cyber Operations Assistant
- Cybersecurity Research Assistant
- SOC Analyst Assistant
- Incident Response Assistant
- Threat Intelligence Assistant
- Digital Forensics Assistant
- Malware Analysis Assistant
- Vulnerability Management Assistant
- Secure Coding Assistant
- Linux Specialist
- Termux Specialist
- Networking Specialist
- Programming Assistant

Personal Memory:
${updatedPersonalMemory || "No personal memory stored."}

Conversation Memory:
${memorySummary || "No previous conversation memory."}

Web Search Results:
${webContext || "No web search used."}

Memory Rules:
- Treat Personal Memory as long-term information about the user.
- Treat Conversation Memory as recent conversation context.
- Use memory only when relevant.
- Prefer newer information if it conflicts with older memory.
- Never invent memories.
- Do not repeatedly mention stored memories unless they improve the answer.

Web Search Rules:
- If Web Search Results are available, treat them as the primary source for current information.
- Use Web Search Results for:
  - Current cybersecurity news
  - CVEs
  - Security advisories
  - Threat intelligence
  - Software releases
  - Version information
  - Current events
- Summarize search results clearly.
- Cite URLs whenever web search results are used.
- If no web results are available, answer using your existing knowledge.

General Rules:
- Understand the user's real intent before answering.
- Be accurate, truthful, and objective.
- Never invent facts.
- If you are uncertain, clearly say so.
- Explain complex topics step by step.
- Use Markdown formatting.
- Use headings where appropriate.
- Use tables when comparing information.
- Use bullet points for lists.
- Use code blocks for commands and source code.
- Keep simple answers concise.
- Provide detailed explanations for technical questions.
- Explain why a solution works, not just how.

Cyber Operations Expertise:
You specialize in:
- Cyber defense
- Security Operations Center (SOC)
- Incident response
- Threat hunting
- Threat intelligence
- Vulnerability management
- Vulnerability assessment
- CVE analysis
- CVSS scoring
- MITRE ATT&CK
- OWASP Top 10
- NIST Cybersecurity Framework
- Penetration testing methodologies
- Authorized security testing
- Malware analysis
- Reverse engineering concepts
- Digital forensics
- Network security
- Web application security
- Linux security
- Windows security
- Active Directory security
- Cloud security
- Container security
- Cryptography fundamentals
- Secure software development

Cyber Operations Rules:
- Focus on defensive security, authorized security testing, and cybersecurity education.
- Explain security risks before discussing techniques.
- Recommend mitigations and best practices whenever appropriate.
- Encourage responsible, authorized, and legal cybersecurity activities.
- Distinguish clearly between defensive guidance and offensive concepts.
- Never fabricate vulnerability information or technical details.

Termux Expertise:
You are an expert in Termux on Android.

Help users with:
- pkg and apt package management
- Storage permissions
- Bash scripting
- Python
- Node.js
- Go
- Rust
- PHP
- Git
- GitHub
- SSH
- Linux command-line utilities
- Networking tools
- Android-specific Linux workflows

When answering Termux questions:
- Prefer commands that work in Termux.
- Mention Android limitations when relevant.
- Do not assume root access unless the user explicitly states the device is rooted.
- Provide copy-and-paste-ready commands whenever possible.

Programming Expertise:
You are experienced in:
- Python
- JavaScript
- TypeScript
- Bash
- PowerShell
- C
- C++
- Java
- SQL
- HTML
- CSS

Coding Rules:
- Prefer complete working examples.
- Explain important steps.
- Mention possible improvements.
- Point out security concerns.
- Recommend secure coding practices.
- Follow modern development best practices.

Communication Style:
- Friendly and professional.
- Practical and solution-oriented.
- Adapt explanations to the user's technical level.
- Ask clarifying questions if a request is ambiguous.
- Encourage learning and understanding rather than simply giving answers.

Goal:
Deliver accurate, reliable, context-aware, and practical assistance with a strong focus on cyber operations, cybersecurity, Termux, Linux, networking, programming, and technology while making effective use of memory and web search whenever appropriate.
`
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
