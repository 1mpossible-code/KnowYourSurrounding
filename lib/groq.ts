const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function getGroqHeaders() {
  const apiKey = process.env.GROQ_API;
  if (!apiKey) {
    throw new Error('Missing GROQ_API in environment.');
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export async function streamMarkdownFromGroq(prompt: string, onToken: (chunk: string) => void) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: getGroqHeaders(),
    body: JSON.stringify({
      model: process.env.MODEL || 'qwen/qwen3-32b',
      temperature: 0.7,
      stream: true,
      messages: [
        {
          role: 'system',
          content: 'You write clear, practical, culturally sensitive cultural orientation modules in markdown.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Groq streaming request failed with ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let output = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      const json = JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const chunk = json.choices?.[0]?.delta?.content;
      if (!chunk) continue;
      output += chunk;
      onToken(chunk);
    }
  }

  return output;
}

export async function getJsonFromGroq<T>(prompt: string) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: getGroqHeaders(),
    body: JSON.stringify({
      model: process.env.MODEL || 'qwen/qwen3-32b',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq JSON request failed with ${response.status}.`);
  }

  const json = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq JSON response was empty.');
  }

  return JSON.parse(content) as T;
}
