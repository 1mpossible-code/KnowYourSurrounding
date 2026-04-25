const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODELS_URL = 'https://api.anthropic.com/v1/models';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

let cachedClaudeModel: string | null = null;

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

function getClaudeHeaders() {
  const apiKey = process.env.CLAUDE;
  if (!apiKey) {
    throw new Error('Missing CLAUDE in environment.');
  }

  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  };
}

async function listClaudeModels() {
  const response = await fetch(CLAUDE_MODELS_URL, {
    method: 'GET',
    headers: getClaudeHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'no body');
    throw new Error(`Claude models request failed with ${response.status}: ${errorBody}`);
  }

  const json = (await response.json()) as {
    data?: Array<{ id?: string }>;
  };

  return (json.data ?? []).flatMap((model) => (model.id ? [model.id] : []));
}

function pickClaudeModel(models: string[], exclude: string[] = []) {
  const blocked = new Set(exclude.filter(Boolean));
  const preferred = [
    process.env.CLAUDE_HAIKU?.trim(),
    DEFAULT_CLAUDE_MODEL,
    ...models.filter((model) => model.startsWith('claude-haiku')).sort().reverse(),
    ...models.filter((model) => model.startsWith('claude-sonnet')).sort().reverse(),
    ...models.filter((model) => model.startsWith('claude-opus')).sort().reverse(),
  ].filter((model): model is string => Boolean(model));

  for (const model of preferred) {
    if (!blocked.has(model) && models.includes(model)) {
      return model;
    }
  }

  return models.find((model) => !blocked.has(model)) ?? null;
}

async function resolveClaudeModel(exclude: string[] = []) {
  if (cachedClaudeModel && !exclude.includes(cachedClaudeModel)) {
    return cachedClaudeModel;
  }

  const configuredModel = process.env.CLAUDE_HAIKU?.trim();
  if (configuredModel && !exclude.includes(configuredModel)) {
    cachedClaudeModel = configuredModel;
    return configuredModel;
  }

  const models = await listClaudeModels();
  const selectedModel = pickClaudeModel(models, exclude);
  if (!selectedModel) {
    throw new Error('No Claude models are available for this API key.');
  }

  cachedClaudeModel = selectedModel;
  console.log(`Claude fallback: discovered model "${selectedModel}"`);
  return selectedModel;
}

async function createClaudeResponse(prompt: string, system: string, stream: boolean, temperature: number) {
  let model = await resolveClaudeModel();
  let response = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: getClaudeHeaders(),
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream,
      temperature,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (response.status !== 404) {
    return { model, response };
  }

  const errorBody = await response.text().catch(() => 'no body');
  console.warn(`Claude model unavailable: model="${model}", status=404, body=${errorBody}`);

  const fallbackModel = await resolveClaudeModel([model]);
  console.warn(`Claude fallback: retrying with model "${fallbackModel}"`);

  model = fallbackModel;
  response = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: getClaudeHeaders(),
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream,
      temperature,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  return { model, response };
}

function parseClaudeJson<T>(content: string): T {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const objectMatch = (() => {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    return start >= 0 && end > start ? trimmed.slice(start, end + 1) : null;
  })();
  const arrayMatch = (() => {
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    return start >= 0 && end > start ? trimmed.slice(start, end + 1) : null;
  })();

  const candidates = [trimmed, fenceMatch, objectMatch, arrayMatch].filter(
    (candidate): candidate is string => Boolean(candidate),
  );

  for (const candidate of Array.from(new Set(candidates))) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  throw new Error(`Claude JSON parse failed. Raw response: ${trimmed.slice(0, 500)}`);
}

async function streamMarkdownFromClaude(prompt: string, onToken: (chunk: string) => void) {
  const { model, response } = await createClaudeResponse(
    prompt,
    'You write clear, practical, culturally sensitive cultural orientation modules in markdown. Do not output reasoning, chain-of-thought, or <think> tags.',
    true,
    0.7,
  );

  if (!response.ok || !response.body) {
    const errorBody = await response.text().catch(() => 'no body');
    console.error(`Claude streaming error: status=${response.status}, model="${model}", body=${errorBody}`);
    throw new Error(`Claude streaming request failed with ${response.status}.`);
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

      try {
        const json = JSON.parse(payload) as {
          type?: string;
          delta?: { type?: string; text?: string };
        };

        if (json.type === 'content_block_delta' && json.delta?.text) {
          output += json.delta.text;
          onToken(json.delta.text);
        }
      } catch {
        continue;
      }
    }
  }

  return output;
}

async function getJsonFromClaude<T>(prompt: string): Promise<T> {
  const { model, response } = await createClaudeResponse(
    prompt,
    'Return valid JSON only. Do not output markdown fences, reasoning, chain-of-thought, or <think> tags.',
    false,
    0,
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'no body');
    console.error(`Claude JSON error: status=${response.status}, model="${model}", body=${errorBody}`);
    throw new Error(`Claude JSON request failed with ${response.status}.`);
  }

  const json = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const content = (json.content ?? [])
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text)
    .join('')
    .trim();

  if (!content) {
    throw new Error('Claude JSON response was empty.');
  }

  return parseClaudeJson<T>(content);
}

export async function streamMarkdownFromGroq(prompt: string, onToken: (chunk: string) => void) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: getGroqHeaders(),
    body: JSON.stringify({
      model: process.env.MODEL || DEFAULT_MODEL,
      temperature: 0.7,
      stream: true,
      messages: [
        {
          role: 'system',
          content:
            'You write clear, practical, culturally sensitive cultural orientation modules in markdown. Do not output reasoning, chain-of-thought, or <think> tags.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (response.status === 429) {
    console.warn('Groq rate limited (429), falling back to Claude');
    return streamMarkdownFromClaude(prompt, onToken);
  }

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

export async function getJsonFromGroq<T>(prompt: string): Promise<T> {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: getGroqHeaders(),
    body: JSON.stringify({
      model: process.env.MODEL || DEFAULT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Return valid JSON only. Do not output reasoning, chain-of-thought, or <think> tags.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (response.status === 429) {
    console.warn('Groq rate limited (429), falling back to Claude');
    return getJsonFromClaude<T>(prompt);
  }

  if (!response.ok) {
    throw new Error(`Groq JSON request failed with ${response.status}.`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq JSON response was empty.');
  }

  return JSON.parse(content) as T;
}
