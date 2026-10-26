export async function onRequestPost(context) {
  try {
    const { history, modelSelection, systemPrompt } = await context.request.json();

    if (modelSelection === 'gemini') {
      const apiKey = context.env.GEMINI_API_KEY;
      if (!apiKey) return Response.json({ error: 'Gemini API key missing on server.' }, { status: 500 });

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
      return Response.json({ reply });

    } else if (modelSelection === 'openrouter') {
      const apiKey = context.env.OPENROUTER_API_KEY;
      if (!apiKey) return Response.json({ error: 'OpenRouter API key missing on server.' }, { status: 500 });

      const messages = [
        { role: 'system', content: systemPrompt || 'You are an expert study tutor.' },
        ...history.map(msg => ({ role: msg.role, content: msg.text }))
      ];

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://pages.cloudflare.com',
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
      return Response.json({ reply });

    } else {
      return Response.json({ error: 'Invalid model selection.' }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to process AI request.' }, { status: 500 });
  }
}
