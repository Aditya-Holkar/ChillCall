import { useState, useEffect } from 'react'
import { Upload, FileText, X, Bot, Sparkles } from 'lucide-react'
import { parseDocumentFile, getVoices, generateQuestionsFromContext } from '../lib/interview-api'

export default function InterviewSetup({ config, setConfig, onStart, onClose, participants }) {
  const [voices, setVoices] = useState([])
  const [parsing, setParsing] = useState(false)
  const [scenario, setScenario] = useState(config.scenario || '')
  const [docName, setDocName] = useState(config.documentName || '')
  const [docText, setDocText] = useState(config.documentText || '')
  const [questionsText, setQuestionsText] = useState((config.questions || []).join('\n'))

  useEffect(() => {
    const v = getVoices()
    if (v.length > 0) setVoices(v)
    else {
      const timer = setTimeout(() => setVoices(getVoices()), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const maleVoices = voices.filter(v => v.name.toLowerCase().includes('male'))
  const femaleVoices = voices.filter(v => v.name.toLowerCase().includes('female'))
  const otherVoices = voices.filter(v =>
    !v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female')
  )

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setDocName(file.name)
    const text = await parseDocumentFile(file)
    setDocText(text)
    setParsing(false)
    e.target.value = ''
  }

  const handleStart = async () => {
    const questions = questionsText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !/^\d+[. )]*$/.test(l))
      .map(l => l.replace(/^\d+[. )]\s*/, ''))

    setConfig(prev => ({
      ...prev,
      scenario,
      documentText: docText,
      documentName: docName,
      questions,
      autoQuestions: questions.length === 0,
      participants: participants.map(p => p.displayName).filter(Boolean),
    }))

    setTimeout(() => onStart(), 100)
  }

  return (
    <div className="w-full sm:w-96 flex flex-col bg-coral-50 dark:bg-coral-900 border-l border-coral-200 dark:border-coral-800 relative z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-coral-200 dark:border-coral-800">
        <h3 className="font-semibold text-coral-800 dark:text-coral-50 text-sm flex items-center gap-2">
          <Bot size={16} className="text-coral-300" /> AI Interview Setup
        </h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-coral-100 dark:hover:bg-coral-800 text-coral-500 cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-coral-500 mb-1">Participants</label>
            <div className="flex flex-wrap gap-1">
              {participants.map(p => (
                <span key={p.id} className="px-2 py-0.5 text-xs rounded-full bg-coral-100 dark:bg-coral-800/30 text-coral-600 dark:text-coral-300">
                  {p.displayName} {p.isLocal && '(You)'}
                </span>
              ))}
            </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-coral-500 mb-1">Interview Context / Scenario</label>
          <textarea
            value={scenario}
            onChange={e => setScenario(e.target.value)}
            placeholder="e.g. Senior React developer position, focus on hooks, state management, and performance..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg bg-coral-50 dark:bg-coral-800 border border-coral-200 dark:border-coral-700 text-coral-800 dark:text-coral-50 placeholder-coral-400 focus:outline-none focus:ring-1 focus:ring-coral-300 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-coral-500 mb-1">
            Upload Document (resume, JD, etc.)
          </label>
          <label className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-dashed border-coral-300 dark:border-coral-600 text-coral-500 hover:border-coral-200 cursor-pointer">
            <Upload size={14} />
            {docName || 'Choose .txt, .md, or .pdf'}
            <input type="file" accept=".txt,.md,.pdf" onChange={handleFile} className="hidden" />
          </label>
          {parsing && <p className="text-xs text-coral-500 mt-1">Parsing document...</p>}
          {docName && !parsing && (
            <div className="flex items-center gap-1 mt-1 text-xs text-coral-400">
              <FileText size={12} /> {docName} loaded
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-coral-500 mb-1">
            Questions (one per line — leave empty for auto-generate)
          </label>
          <textarea
            value={questionsText}
            onChange={e => setQuestionsText(e.target.value)}
            placeholder="What is your experience with React hooks?&#10;Describe a challenging project..."
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-lg bg-coral-50 dark:bg-coral-800 border border-coral-200 dark:border-coral-700 text-coral-800 dark:text-coral-50 placeholder-coral-400 focus:outline-none focus:ring-1 focus:ring-coral-300 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-coral-500 mb-1">Questions Mode</label>
            <select
              value={config.sameQuestions ? 'same' : 'different'}
              onChange={e => setConfig(prev => ({ ...prev, sameQuestions: e.target.value === 'same' }))}
              className="w-full px-2 py-1.5 text-sm rounded-lg bg-coral-50 dark:bg-coral-800 border border-coral-200 dark:border-coral-700 text-coral-800 dark:text-coral-50 focus:outline-none focus:ring-1 focus:ring-coral-300"
            >
              <option value="same">Same for all</option>
              <option value="different">Different per person</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-coral-500 mb-1">Correction Focus</label>
            <select
              value={config.correctionFocus}
              onChange={e => setConfig(prev => ({ ...prev, correctionFocus: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm rounded-lg bg-coral-50 dark:bg-coral-800 border border-coral-200 dark:border-coral-700 text-coral-800 dark:text-coral-50 focus:outline-none focus:ring-1 focus:ring-coral-300"
            >
              <option value="both">Language + Domain</option>
              <option value="language">Language Only</option>
              <option value="domain">Domain Only</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-coral-500 mb-1">Think Time (sec)</label>
            <input
              type="number"
              min={5}
              max={120}
              value={config.thinkTime}
              onChange={e => setConfig(prev => ({ ...prev, thinkTime: parseInt(e.target.value) || 30 }))}
              className="w-full px-2 py-1.5 text-sm rounded-lg bg-coral-50 dark:bg-coral-800 border border-coral-200 dark:border-coral-700 text-coral-800 dark:text-coral-50 focus:outline-none focus:ring-1 focus:ring-coral-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-coral-500 mb-1">Bot Voice</label>
            <select
              value={config.voiceURI}
              onChange={e => setConfig(prev => ({ ...prev, voiceURI: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm rounded-lg bg-coral-50 dark:bg-coral-800 border border-coral-200 dark:border-coral-700 text-coral-800 dark:text-coral-50 focus:outline-none focus:ring-1 focus:ring-coral-300"
            >
              <option value="">Default</option>
              {maleVoices.length > 0 && (
                <optgroup label="Male">
                  {maleVoices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                  ))}
                </optgroup>
              )}
              {femaleVoices.length > 0 && (
                <optgroup label="Female">
                  {femaleVoices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                  ))}
                </optgroup>
              )}
              {otherVoices.length > 0 && (
                <optgroup label="Other">
                  {otherVoices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-coral-200 dark:border-coral-800">
        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-coral-300 hover:bg-coral-400 text-coral-50 font-medium transition cursor-pointer"
        >
          <Sparkles size={18} />
          Start AI Interview
        </button>
      </div>
    </div>
  )
}
