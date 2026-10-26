export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { history, modelSelection, systemPrompt } = req.body;

  try {
    if (modelSelection === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'Gemini API key missing on server.' });

      const contents = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      if (systemPrompt && contents.length > 0) {
        contents[0].parts[0].text = `[Instructions: ${systemPrompt}]\n\n${contents[0].parts[0].text}`;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const reply = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ reply });

    } else if (modelSelection === 'openrouter') {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'OpenRouter API key missing on server.' });

      const messages = [
        { role: 'system', content: systemPrompt || 'You are an expert study tutor.' },
        ...history.map(msg => ({ role: msg.role, content: msg.text }))
      ];

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://vercel.com',
          'X-Title': 'AI Study Tutor'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: messages
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message?.message || data.error.message || JSON.stringify(data.error));

      const reply = data.choices[0].message.content;
      return res.status(200).json({ reply });

    } else {
      return res.status(400).json({ error: 'Invalid model selection.' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to process AI request.' });
  }
}
