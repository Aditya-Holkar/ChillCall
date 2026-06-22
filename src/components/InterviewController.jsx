import { Bot, Pause, Play, FileText, X, Timer, User, MessageSquare, Lightbulb, CheckCircle } from 'lucide-react'

const STATUS_ICONS = {
  idle: null,
  setup: null,
  starting: Bot,
  asking: MessageSquare,
  thinking: Timer,
  listening: User,
  evaluating: Lightbulb,
  feedback: MessageSquare,
  followup: MessageSquare,
  summary: FileText,
  paused: Pause,
  done: CheckCircle,
}

export default function InterviewController({ bot, onClose }) {
  const StatusIcon = STATUS_ICONS[bot.state] || Bot
  const isActive = bot.state !== 'idle' && bot.state !== 'done'

  return (
    <div className="w-96 flex flex-col bg-coral-50 dark:bg-coral-900 border-l border-coral-200 dark:border-coral-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-coral-200 dark:border-coral-800">
        <h3 className="font-semibold text-coral-800 dark:text-coral-50 text-sm flex items-center gap-2">
          <Bot size={16} className="text-coral-300" /> AI Interviewer
        </h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-coral-100 dark:hover:bg-coral-800 text-coral-500 cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isActive && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-coral-100 dark:bg-coral-800/20 border border-coral-200 dark:border-coral-600">
            <div className="w-10 h-10 rounded-full bg-coral-300 flex items-center justify-center shrink-0">
              <StatusIcon size={20} className="text-coral-50" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-coral-700 dark:text-coral-200 capitalize">
                {bot.state.replace('_', ' ')}
              </p>
              <p className="text-xs text-coral-500 dark:text-coral-300 truncate">{bot.botStatus}</p>
            </div>
          </div>
        )}

        {bot.state === 'paused' && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-center">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">Interview paused</p>
          </div>
        )}

        {bot.state === 'thinking' && bot.thinkSeconds > 0 && (
          <div className="text-center">
            <div className="text-4xl font-bold text-coral-300 mb-1">{bot.thinkSeconds}s</div>
            <p className="text-xs text-coral-500">Think time remaining</p>
          </div>
        )}

        {bot.currentQuestion && (
          <div>
            <p className="text-xs font-medium text-coral-500 mb-1 flex items-center gap-1">
              <MessageSquare size={12} /> Current Question
            </p>
            <p className="text-sm text-coral-700 dark:text-coral-100 bg-coral-50 dark:bg-coral-800 rounded-lg p-3">
              {bot.currentQuestion}
            </p>
          </div>
        )}

        {bot.currentParticipant && (
          <div>
            <p className="text-xs font-medium text-coral-500 mb-1 flex items-center gap-1">
              <User size={12} /> Speaking
            </p>
            <p className="text-sm font-medium text-coral-700 dark:text-coral-100">{bot.currentParticipant}</p>
          </div>
        )}

        {bot.transcript && (
          <div>
            <p className="text-xs font-medium text-coral-500 mb-1">Bot Says</p>
            <p className="text-sm text-coral-500 dark:text-coral-300 italic bg-coral-50 dark:bg-coral-800 rounded-lg p-3">
              "{bot.transcript}"
            </p>
          </div>
        )}

        {bot.notes && (
          <div>
            <p className="text-xs font-medium text-coral-500 mb-1 flex items-center gap-1">
              <FileText size={12} /> Notes
            </p>
            <div className="text-xs text-coral-500 dark:text-coral-300 bg-coral-50 dark:bg-coral-800 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {bot.notes}
            </div>
          </div>
        )}

        {bot.state === 'done' && bot.summaryText && (
          <div>
            <p className="text-xs font-medium text-coral-500 mb-1 flex items-center gap-1">
              <CheckCircle size={12} /> Summary
            </p>
            <div className="text-xs text-coral-500 dark:text-coral-300 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 whitespace-pre-wrap">
              {bot.summaryText}
            </div>
          </div>
        )}

        {bot.participantsData.length > 0 && (
          <div>
            <p className="text-xs font-medium text-coral-500 mb-2">Scores</p>
            <div className="space-y-1">
              {bot.participantsData.map(p => {
                const avg = p.qAndA.length > 0
                  ? Math.round(p.qAndA.reduce((s, q) => s + q.score, 0) / p.qAndA.length)
                  : 0
                return (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <span className="text-coral-700 dark:text-coral-200">{p.name}</span>
                    <span className={`font-medium ${
                      avg >= 7 ? 'text-green-500' : avg >= 4 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {p.qAndA.length > 0 ? `${avg}/10 (${p.qAndA.length} Q)` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {isActive && (
        <div className="p-4 border-t border-coral-200 dark:border-coral-800 flex gap-2">
          {bot.isPaused ? (
            <button
              onClick={bot.resume}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium text-sm cursor-pointer"
            >
              <Play size={16} /> Resume
            </button>
          ) : (
            <button
              onClick={bot.pause}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-medium text-sm cursor-pointer"
            >
              <Pause size={16} /> Pause
            </button>
          )}
        </div>
      )}

      {bot.state === 'done' && (
        <div className="p-4 border-t border-coral-200 dark:border-coral-800">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-coral-300 hover:bg-coral-400 text-coral-50 font-medium text-sm cursor-pointer"
          >
            <X size={16} /> Close Interview
          </button>
        </div>
      )}
    </div>
  )
}
