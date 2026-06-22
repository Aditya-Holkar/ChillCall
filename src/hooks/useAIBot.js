import { useState, useRef, useCallback } from 'react'
import {
  generateQuestion, evaluateAnswer, generateFollowUp,
  generateSummary, generateQuestionsFromContext,
  transcribeAudio, speakText,
} from '../lib/interview-api'

const STATES = {
  IDLE: 'idle', SETUP: 'setup', STARTING: 'starting',
  ASKING: 'asking', THINKING: 'thinking', LISTENING: 'listening',
  EVALUATING: 'evaluating', FEEDBACK: 'feedback', FOLLOW_UP: 'followup',
  SUMMARY: 'summary', PAUSED: 'paused', DONE: 'done',
}

export function useAIBot(room) {
  const [state, setState] = useState(STATES.IDLE)
  const [config, setConfig] = useState({
    scenario: '', documentText: '', documentName: '',
    sameQuestions: true, correctionFocus: 'both',
    thinkTime: 30, voiceURI: '', participants: [],
    questions: [], autoQuestions: true, questionCount: 5,
  })
  const [botStatus, setBotStatus] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentParticipant, setCurrentParticipant] = useState('')
  const [thinkSeconds, setThinkSeconds] = useState(0)
  const [notes, setNotes] = useState('')
  const [transcript, setTranscript] = useState('')
  const [participantsData, setParticipantsData] = useState([])
  const [summaryText, setSummaryText] = useState('')

  const cancelRef = useRef(false)
  const recorderRef = useRef(null)
  const audioCtxRef = useRef(null)
  const audioChunksRef = useRef([])
  const thinkTimerRef = useRef(null)
  const botRunningRef = useRef(false)
  const silenceTimerRef = useRef(null)

  const updateNotes = useCallback((text) => {
    setNotes(prev => prev + '\n---\n' + text)
  }, [])

  const findParticipantStream = useCallback((name) => {
    const p = room.participants?.find(p => p.displayName === name)
    if (p?.stream) return p.stream
    if (room.localStream) return room.localStream
    return null
  }, [room.participants, room.localStream])

  const startListening = useCallback((participantName) => {
    return new Promise((resolve) => {
      const stream = findParticipantStream(participantName)
      if (!stream) {
        setBotStatus('Waiting for audio...')
        setTimeout(() => resolve(''), 5000)
        return
      }

      const audioTrack = stream.getAudioTracks()[0]
      if (!audioTrack) {
        setTimeout(() => resolve(''), 5000)
        return
      }

      const listenStream = new MediaStream([audioTrack.clone()])
      audioChunksRef.current = []
      let done = false
      let consecutiveSilence = 0
      const SILENCE_THRESHOLD = 8

      try {
        const audioCtx = new AudioContext()
        audioCtxRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(listenStream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const recorder = new MediaRecorder(listenStream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 48000,
        })
        recorderRef.current = recorder

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }

        recorder.onstop = async () => {
          if (done) return
          done = true
          clearInterval(silenceTimerRef.current)
          if (audioCtxRef.current) {
            await audioCtxRef.current.close()
            audioCtxRef.current = null
          }
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          if (blob.size < 3000) { resolve(''); return }
          setBotStatus('Transcribing...')
          const text = await transcribeAudio(blob)
          resolve(text)
        }

        silenceTimerRef.current = setInterval(() => {
          if (done) return
          analyser.getByteTimeDomainData(dataArray)
          const max = Math.max(...dataArray)
          const normalized = (max - 128) / 128

          if (normalized < 0.05) {
            consecutiveSilence++
            if (consecutiveSilence >= SILENCE_THRESHOLD && audioChunksRef.current.length > 3) {
              if (recorder.state !== 'inactive') recorder.stop()
            }
          } else {
            consecutiveSilence = 0
          }
        }, 250)

        recorder.start(500)

        const maxListen = Math.max(45000, (config.thinkTime || 30) * 1500)
        setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop()
        }, maxListen)
      } catch {
        setTimeout(() => resolve(''), 3000)
      }
    })
  }, [findParticipantStream, config.thinkTime])

  const cleanText = useCallback((text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '\n')
      .trim()
  }, [])

  const speak = useCallback(async (text) => {
    const cleaned = cleanText(text)
    setBotStatus('...')
    setTranscript(cleaned)
    await speakText(cleaned, config.voiceURI, 0.88)
    await new Promise(r => setTimeout(r, 400))
  }, [config.voiceURI, cleanText])

  const pause = useCallback(() => {
    cancelRef.current = true
    clearInterval(thinkTimerRef.current)
    clearInterval(silenceTimerRef.current)
    window.speechSynthesis?.cancel()
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    setState(STATES.PAUSED)
    setBotStatus('Paused')
  }, [])

  const resume = useCallback(() => {
    cancelRef.current = false
    setState(STATES.STARTING)
    setBotStatus('Resuming...')
  }, [])

  const runBot = useCallback(async (cfg, participantList) => {
    if (botRunningRef.current) return
    botRunningRef.current = true
    cancelRef.current = false

    const DEFAULT_QUESTIONS = [
      'Tell me about yourself and your background.',
      'What are your greatest strengths and weaknesses?',
      'Describe a challenging project you worked on and how you handled it.',
      'Where do you see yourself in five years?',
      'Why are you interested in this role?',
      'Describe a time you worked in a team to achieve a goal.',
      'How do you handle pressure or stressful situations?',
      'What is your biggest professional achievement?',
      'Tell me about a time you failed and what you learned from it.',
      'What skills make you a good fit for this position?',
    ]

    let questions = cfg.questions.length > 0
      ? cfg.questions
      : await (async () => {
          const qText = await generateQuestionsFromContext(cfg, cfg.questionCount)
          const parsed = qText.split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+[. )]\s*/, ''))
          return parsed.length > 0 ? parsed : DEFAULT_QUESTIONS.slice(0, cfg.questionCount || 5)
        })()

    if (!questions || questions.length === 0) {
      questions = DEFAULT_QUESTIONS.slice(0, cfg.questionCount || 5)
    }

    const pData = participantList.map(name => ({ name, qAndA: [] }))
    setParticipantsData(pData)

    const interviewerState = {
      questionIndex: 0,
      allAskedQuestions: [],
    }

    if (participantList.length === 0) {
      setBotStatus('No participants found. Try again when connected.')
      await speak(`I see no participants in the room. Please make sure you are connected and try again.`)
      setState(STATES.DONE)
      botRunningRef.current = false
      return
    }

    setState(STATES.STARTING)
    setBotStatus('Starting interview...')
    await speak(`Welcome everyone. I will be your interviewer today. Let's begin.`)

    while (interviewerState.questionIndex < questions.length) {
      if (cancelRef.current) break

      const question = questions[interviewerState.questionIndex]
      interviewerState.allAskedQuestions.push(question)

      for (let pi = 0; pi < participantList.length; pi++) {
        if (cancelRef.current) break

        const pName = participantList[pi]
        setCurrentParticipant(pName)
        setCurrentQuestion(question)
        setBotStatus(`Asking ${pName}...`)
        setState(STATES.ASKING)

        if (cfg.sameQuestions) {
          await speak(`${pName}, here is your question. ${question}`)
        } else {
          const personalized = await generateQuestion({
            participantName: pName, sameQuestions: false,
            askedQuestions: interviewerState.allAskedQuestions,
            interviewContext: cfg,
          })
          await speak(`${pName}, ${personalized}`)
          interviewerState.allAskedQuestions.push(personalized)
        }

        setState(STATES.THINKING)
        setThinkSeconds(cfg.thinkTime)
        setBotStatus(`${pName}, you have ${cfg.thinkTime} seconds to think.`)

        await new Promise((resolve) => {
          let remaining = cfg.thinkTime
          thinkTimerRef.current = setInterval(() => {
            remaining--
            setThinkSeconds(remaining)
            if (remaining <= 0 || cancelRef.current) {
              clearInterval(thinkTimerRef.current)
              resolve()
            }
          }, 1000)
        })

        if (cancelRef.current) break

        setState(STATES.LISTENING)
        setBotStatus(`Listening to ${pName}...`)
        await speak(`${pName}, please give your answer now.`)

        const answer = await startListening(pName)
        if (cancelRef.current) break

        if (!answer.trim()) {
          setBotStatus('No answer detected.')
          await speak(`I did not catch that. Let's move on.`)
          continue
        }

        setState(STATES.EVALUATING)
        setBotStatus('Evaluating...')

        const evaluation = await evaluateAnswer({
          participantName: pName, question, answer, interviewContext: cfg,
        })

        const scoreMatch = evaluation.match(/(\d+)\s*\/\s*10/)
        const score = scoreMatch ? Math.min(parseInt(scoreMatch[1]), 10) : 0

        setState(STATES.FEEDBACK)
        const cleanFeedback = cleanText(evaluation)
        await speak(`Thank you, ${pName}. Here is my feedback. ${evaluation}`)

        const noteEntry = `${pName} (Q${interviewerState.questionIndex + 1}, Score: ${score}/10)\nQ: ${question}\nA: ${answer}\nFeedback: ${cleanFeedback}`
        updateNotes(noteEntry)

        const pIdx = pData.findIndex(p => p.name === pName)
        if (pIdx !== -1) {
          pData[pIdx].qAndA.push({ question, answer, score, feedback: cleanFeedback })
        }
        setParticipantsData([...pData])

        const shouldFollowUp = score < 6
        if (shouldFollowUp && !cancelRef.current) {
          setState(STATES.FOLLOW_UP)
          setBotStatus('Follow-up...')
          const followUp = await generateFollowUp({
            participantName: pName, question, answer,
            allAnswers: pData[pIdx]?.qAndA?.map(q => q.answer) || [],
            interviewContext: cfg,
          })
          await speak(`${pName}, one more question. ${followUp}`)

          setBotStatus('Listening...')
          const followAnswer = await startListening(pName)
          if (followAnswer.trim()) {
            const followEval = await evaluateAnswer({
              participantName: pName, question: followUp, answer: followAnswer, interviewContext: cfg,
            })
            updateNotes(`  Follow-up asked: ${followUp}\n  Follow-up answer: ${followAnswer}\n  Follow-up eval: ${cleanText(followEval)}`)
            if (pIdx !== -1) {
              pData[pIdx].qAndA.push({ question: followUp, answer: followAnswer, score: 0, feedback: followEval })
            }
            setParticipantsData([...pData])
          }
        }
      }

      interviewerState.questionIndex++
    }

    if (!cancelRef.current) {
      setState(STATES.SUMMARY)
      setBotStatus('Generating summary...')
      const summary = await generateSummary(pData, cfg)
      setSummaryText(summary)
      await speak(`Great session, everyone. Here is the summary. ${summary}`)
    }

    setState(STATES.DONE)
    setBotStatus('Interview complete')
    botRunningRef.current = false
  }, [startListening, speak, pause, resume, cleanText, updateNotes])

  const startInterview = useCallback(async () => {
    const participantNames = room.participants
      ?.map(p => p.displayName) || []

    runBot(config, participantNames)
  }, [config, room.participants, runBot])

  return {
    state, STATES, config, setConfig, botStatus,
    currentQuestion, currentParticipant, thinkSeconds,
    notes, transcript, participantsData, summaryText,
    startInterview, pause, resume,
    isRunning: state !== STATES.IDLE && state !== STATES.DONE && state !== STATES.PAUSED,
    isPaused: state === STATES.PAUSED,
  }
}
