import { useEffect, useRef } from 'react'
import { MicOff, Volume2, Hand, Wifi, WifiOff } from 'lucide-react'

export default function VideoTile({ participant, isLocal, isSpotlight, onSpotlight }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream
    }
  }, [participant.stream])

  const initials = participant.displayName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div
      className={`relative w-full h-full rounded-xl overflow-hidden bg-coral-800 group ${
        participant.isSpeaking ? 'ring-2 ring-green-400' : ''
      } ${isSpotlight ? 'col-span-2 row-span-2' : ''}`}
    >
      {participant.stream && !participant.isVideoOff ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="w-16 h-16 rounded-full bg-coral-600 flex items-center justify-center text-xl font-bold text-coral-50">
            {initials}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-coral-900/60 to-transparent p-3 pt-8">
        <div className="flex items-center gap-2">
          <span className="text-coral-50 text-sm font-medium truncate">
            {participant.displayName} {isLocal && '(You)'}
          </span>
          {participant.isMuted && <MicOff size={14} className="text-red-400" />}
          {participant.isSpeaking && <Volume2 size={14} className="text-green-400" />}
          {participant.raisedHand && <Hand size={14} className="text-yellow-400" />}
        </div>
      </div>

      {!isLocal && onSpotlight && (
        <button
          onClick={() => onSpotlight(participant.id)}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-coral-900/50 opacity-0 group-hover:opacity-100 hover:bg-coral-900/70 text-coral-50 text-xs transition cursor-pointer"
        >
          Pin
        </button>
      )}
    </div>
  )
}
