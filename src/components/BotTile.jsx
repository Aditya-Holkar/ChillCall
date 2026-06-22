import { Bot, MessageSquare, Timer, User, CheckCircle, Pause } from 'lucide-react'

const STATE_CONFIG = {
  idle: { label: 'Idle', icon: Bot, color: 'bg-coral-500' },
  setup: { label: 'Setup', icon: Bot, color: 'bg-coral-300' },
  starting: { label: 'Starting...', icon: Bot, color: 'bg-coral-300' },
  asking: { label: 'Asking...', icon: MessageSquare, color: 'bg-coral-400' },
  thinking: { label: 'Thinking...', icon: Timer, color: 'bg-yellow-500' },
  listening: { label: 'Listening...', icon: User, color: 'bg-green-500' },
  evaluating: { label: 'Evaluating...', icon: Bot, color: 'bg-coral-300' },
  feedback: { label: 'Feedback', icon: MessageSquare, color: 'bg-coral-300' },
  followup: { label: 'Follow-up', icon: MessageSquare, color: 'bg-coral-400' },
  summary: { label: 'Summary', icon: Bot, color: 'bg-green-500' },
  paused: { label: 'Paused', icon: Pause, color: 'bg-yellow-500' },
  done: { label: 'Complete', icon: CheckCircle, color: 'bg-green-500' },
}

export default function BotTile({ bot }) {
  const cfg = STATE_CONFIG[bot.state] || STATE_CONFIG.idle
  const Icon = cfg.icon

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-coral-800 to-coral-900 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className={`w-16 h-16 rounded-full ${cfg.color} flex items-center justify-center shadow-lg`}>
          <Icon size={28} className="text-coral-50" />
        </div>
        <span className="text-coral-50 text-sm font-medium">AI Interviewer</span>
        <span className={`px-2 py-0.5 rounded-full text-xs text-coral-50 ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {bot.thinkSeconds > 0 && bot.state === 'thinking' && (
        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-black/50 rounded-lg px-3 py-2 text-center">
            <div className="text-coral-50 font-bold text-lg">{bot.thinkSeconds}s</div>
            <div className="text-coral-200 text-xs">Think time</div>
          </div>
        </div>
      )}

      {bot.currentParticipant && (
        <div className="absolute top-3 left-3 bg-coral-900/50 rounded-lg px-2 py-1 text-xs text-coral-50">
          {bot.currentParticipant}
        </div>
      )}
    </div>
  )
}
