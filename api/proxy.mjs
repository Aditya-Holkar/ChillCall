const ALLOWED_PROVIDERS = {
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    envKey: 'GEMINI_API_KEY',
    format: 'gemini',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    envKey: 'GROQ_API_KEY',
    format: 'openai',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    envKey: 'DEEPSEEK_API_KEY',
    format: 'openai',
    defaultModel: 'deepseek-chat',
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    envKey: 'OPENROUTER_API_KEY',
    format: 'openai',
    defaultModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
  },
  together: {
    url: 'https://api.together.xyz/v1/chat/completions',
    envKey: 'TOGETHER_API_KEY',
    format: 'openai',
    defaultModel: 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    envKey: 'MISTRAL_API_KEY',
    format: 'openai',
    defaultModel: 'mistral-large-latest',
  },
  nvidia: {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    envKey: 'NVIDIA_API_KEY',
    format: 'openai',
    defaultModel: 'meta/llama-3.1-70b-instruct',
  },
}

const STT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

function getEnvKey(name) {
  return process.env[name] || process.env[`VITE_${name}`] || ''
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type } = req.query

  if (type === 'chat') {
    return handleChat(req, res)
  }

  if (type === 'stt') {
    return handleSTT(req, res)
  }

  return res.status(400).json({ error: 'Missing type parameter (chat or stt)' })
}

async function handleChat(req, res) {
  const { provider, messages, model, temperature, max_tokens } = req.body

  if (!provider || !ALLOWED_PROVIDERS[provider]) {
    return res.status(400).json({ error: `Unknown provider: ${provider}` })
  }

  const config = ALLOWED_PROVIDERS[provider]
  const apiKey = getEnvKey(config.envKey)

  if (!apiKey) {
    return res.status(500).json({ error: `Missing API key for ${provider}` })
  }

  try {
    let text

    if (config.format === 'gemini') {
      const geminiBody = {
        contents: (messages || []).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: temperature ?? 0.7,
          maxOutputTokens: max_tokens ?? 1024,
        },
      }

      const url = `${config.url}?key=${apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      })
      const data = await response.json()
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else {
      const openaiBody = {
        model: model || config.defaultModel,
        messages: messages || [],
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 1024,
      }

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(openaiBody),
      })
      const data = await response.json()
      text = data?.choices?.[0]?.message?.content || ''
    }

    return res.json({ content: text })
  } catch (err) {
    return res.status(502).json({ error: `${provider} upstream error: ${err.message}` })
  }
}

async function handleSTT(req, res) {
  const apiKey = getEnvKey('GROQ_API_KEY')

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing Groq API key' })
  }

  try {
    const { audio, model, language } = req.body

    if (!audio) {
      return res.status(400).json({ error: 'Missing audio data' })
    }

    const audioBuffer = Buffer.from(audio, 'base64')

    const formData = new FormData()
    formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm')
    formData.append('model', model || 'whisper-large-v3-turbo')
    formData.append('language', language || 'en')

    const response = await fetch(STT_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    })
    const data = await response.json()

    return res.json({ text: data?.text || '' })
  } catch (err) {
    return res.status(502).json({ error: `STT upstream error: ${err.message}` })
  }
}
