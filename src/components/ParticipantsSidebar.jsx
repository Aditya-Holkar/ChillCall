import { X, MicOff, CameraOff, VolumeX, Crown } from 'lucide-react'

export default function ParticipantsSidebar({ participants, onClose, onMuteParticipant, isHost }) {
  return (
    <div className="w-full sm:w-64 flex flex-col bg-coral-50 dark:bg-coral-900 border-l border-coral-200 dark:border-coral-800 relative z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-coral-200 dark:border-coral-800">
        <h3 className="font-semibold text-coral-800 dark:text-coral-50 text-sm">
          Participants ({participants.length})
        </h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-coral-100 dark:hover:bg-coral-800 text-coral-500 cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {participants.map(p => (
          <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-coral-100 dark:hover:bg-coral-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-coral-50 shrink-0 ${p.isHost ? 'bg-coral-300' : 'bg-coral-500'}`}>
                {p.displayName?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-coral-800 dark:text-coral-50 truncate flex items-center gap-1">
                  {p.displayName}
                  {p.isHost && <Crown size={12} className="text-yellow-500 shrink-0" />}
                </p>
                <div className="flex items-center gap-1 text-xs text-coral-500">
                  {p.isMuted && <MicOff size={10} />}
                  {p.isVideoOff && <CameraOff size={10} />}
                  {p.isSpeaking && <span className="text-green-400">Speaking</span>}
                  {p.raisedHand && <span className="text-yellow-400">✋</span>}
                </div>
              </div>
            </div>
            {isHost && !p.isHost && (
              <button
                onClick={() => onMuteParticipant(p.id)}
                className="p-1.5 rounded hover:bg-coral-200 dark:hover:bg-coral-700 text-coral-500 cursor-pointer"
                title="Mute participant"
              >
                <VolumeX size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
