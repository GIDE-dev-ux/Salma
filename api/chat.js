// api/chat.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { messages } = req.body;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "You are BABI-Bot, a friendly and helpful AI assistant. Add light Naija flavor when it fits naturally." 
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!groqResponse.ok) {
      throw new Error('Groq API returned error');
    }

    const data = await groqResponse.json();
    const aiReply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    res.status(200).json({ reply: aiReply });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      reply: "⚠️ Sorry, something went wrong. Please try again." 
    });
  }
        }
