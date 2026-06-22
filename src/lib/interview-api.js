const PROXY_CHAT = '/api/proxy?type=chat'
const PROXY_STT = '/api/proxy?type=stt'

const providerList = [
  'gemini', 'groq', 'deepseek', 'openrouter', 'together', 'mistral', 'nvidia',
]

function buildSystemPrompt(context) {
  const doc = context?.documentText ? `\n\nReference document:\n"""\n${context.documentText.slice(0, 8000)}\n"""` : ''
  const scenario = context?.scenario ? `\n\nInterview context/scenario:\n"""\n${context.scenario}\n"""` : ''
  const correction = context?.correctionFocus === 'language'
    ? 'language, grammar, and clarity'
    : context?.correctionFocus === 'domain'
      ? 'domain knowledge and technical accuracy'
      : 'language, clarity, domain knowledge, and structure'

  return `You are an AI interview bot conducting a group interview. You speak your responses aloud.

Rules:
- Ask interview questions one at a time based on the provided context
- Evaluate answers fairly with specific feedback
- Focus feedback on: ${correction}
- Keep notes on each participant
- Be professional, concise, and constructive
- Questions: 2-3 sentences. Feedback: 3-4 sentences.
- Output ONLY what you want to say aloud — no meta text, no JSON, no asterisks, no markdown
- Use plain natural speech. Write numbers as words (e.g. "seven out of ten" not "7/10")
- Do not use bullet points, dashes, or numbered lists in your output. Write in full paragraphs.
- When giving a score, say "I would rate this a seven out of ten" instead of "Score: 7/10"
- Your output is read aloud by text-to-speech, so it must flow naturally when spoken
${doc}
${scenario}`
}

async function callLLM(prompt, system = '') {
  const messages = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })

  for (const provider of providerList) {
    try {
      const res = await fetch(PROXY_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      })
      const data = await res.json()
      if (data.content) return data.content
    } catch (err) {
      console.warn(`${provider} proxy failed:`, err.message)
    }
  }
  console.error('All LLM providers failed')
  return ''
}

export async function generateQuestion({ topic, questionList, participantName, sameQuestions, askedQuestions, interviewContext }) {
  const sys = buildSystemPrompt(interviewContext)
  const prompt = sameQuestions
    ? `Current question #${askedQuestions.length + 1} from the list: "${questionList[askedQuestions.length] || questionList[0]}". Ask this question to ${participantName}. Be natural and conversational.`
    : `Generate a unique interview question for ${participantName}. Topic: ${topic || 'general'}. ${askedQuestions.length > 0 ? `Previous questions: ${askedQuestions.join(', ')}. Make this different.` : ''} Be natural and conversational.`
  return callLLM(prompt, sys)
}

export async function evaluateAnswer({ participantName, question, answer, interviewContext }) {
  const focus = interviewContext?.correctionFocus || 'both'
  const focusText = focus === 'language' ? 'language, grammar, and clarity'
    : focus === 'domain' ? 'domain knowledge and technical accuracy'
    : 'language, clarity, domain knowledge, and structure'

  const prompt = `${participantName} was asked: "${question}"
They answered: "${answer}"

Evaluate their response focusing on ${focusText}.
Speak your evaluation naturally. Write in full sentences. Do not use lists or numbering.
First give a brief evaluation in 2-3 sentences. Then give one specific improvement suggestion in 1-2 sentences.
End with a score out of ten written as words (e.g. "seven out of ten").
Be constructive and encouraging. Do not use asterisks or markdown.`

  return callLLM(prompt, buildSystemPrompt(interviewContext))
}

export async function generateFollowUp({ participantName, question, answer, allAnswers, interviewContext }) {
  const prompt = `${participantName} answered: "${question}" with "${answer}".
${allAnswers.length > 0 ? `Their previous answers: ${allAnswers.join(' | ')}` : ''}
Ask a follow-up question based on their answer. Make it natural — like a real interviewer probing deeper.`
  return callLLM(prompt, buildSystemPrompt(interviewContext))
}

export async function generateSummary(participantsData, interviewContext) {
  const data = participantsData.map(p =>
    `${p.name}: ${p.qAndA.map(q => `Q: "${q.question}" A: "${q.answer}" (${q.score}/10)`).join(' | ')}`
  ).join('\n')

  const prompt = `Interview session complete. Here's the data:
${data}

Generate a brief summary (3-4 sentences) for each participant highlighting strengths and areas to improve. End with overall advice for the group.`
  return callLLM(prompt, buildSystemPrompt(interviewContext))
}

export async function generateQuestionsFromContext(context, count) {
  const prompt = `Generate ${count} interview questions based on the provided context.
Return them as a simple numbered list, one question per line. No extra text.`
  return callLLM(prompt, buildSystemPrompt(context))
}

export async function transcribeAudio(audioBlob) {
  try {
    const buffer = await audioBlob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)

    const res = await fetch(PROXY_STT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: base64,
        model: 'whisper-large-v3-turbo',
        language: 'en',
      }),
    })
    const data = await res.json()
    return data?.text || ''
  } catch (err) {
    console.error('STT error:', err)
    return ''
  }
}

export async function parseDocumentFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'txt' || ext === 'md') {
    return await file.text()
  }

  if (ext === 'pdf') {
    try {
      const data = await file.arrayBuffer()
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''
      const pdf = await pdfjsLib.getDocument({ data }).promise
      let text = ''
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map(item => item.str).join(' ') + '\n'
      }
      return text.trim()
    } catch {
      return ''
    }
  }

  return ''
}

export function getVoices() {
  const voices = window.speechSynthesis?.getVoices() || []
  const en = voices.filter(v => v.lang.startsWith('en'))

  const premium = en.filter(v =>
    v.name.includes('Premium') || v.name.includes('Neural') || v.name.includes('Natural')
  )
  if (premium.length > 0) return premium

  const google = en.filter(v => v.name.includes('Google'))
  if (google.length > 0) return google

  return en
}

function cleanForSpeech(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\b(\d+)\s*\/\s*10\b/g, (m, d) => {
      const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
      const n = parseInt(d)
      return n >= 0 && n <= 10 ? `${words[n]} out of ten` : m
    })
    .replace(/([.!?])\s*/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function speakText(text, voiceURI, rate = 0.88) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return }
    window.speechSynthesis.cancel()

    const clean = cleanForSpeech(text)
    if (!clean) { resolve(); return }

    const voices = window.speechSynthesis.getVoices()
    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.rate = rate
    utterance.pitch = 1
    utterance.volume = 1

    let preferredVoice = null
    if (voiceURI) {
      preferredVoice = voices.find(v => v.voiceURI === voiceURI)
    }
    if (!preferredVoice) {
      preferredVoice = voices.find(v => v.name.includes('Premium') && v.lang.startsWith('en'))
        || voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
        || voices.find(v => v.lang.startsWith('en'))
    }
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onend = resolve
    utterance.onerror = resolve
    window.speechSynthesis.speak(utterance)
  })
}
