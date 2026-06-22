import { Mic, MicOff, Camera, CameraOff, MonitorUp, Monitor, MessageSquare, Hand, PhoneOff, Radio, RadioTower, Grid3X3, User as UserIcon, Bot } from 'lucide-react'

export default function Controls({
  isMicMuted, isCamOff, isScreenSharing, isRecording,
  onToggleMic, onToggleCam, onScreenShare, onHangup,
  onToggleChat, onToggleParticipants, onRaiseHand,
  onToggleRecording, onToggleLayout, speakerLayout,
  pushToTalk, onTogglePTT, onToggleAI, aiActive,
}) {
  return (
    <div className="flex items-center justify-center gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-coral-50 dark:bg-coral-900 border-t border-coral-200 dark:border-coral-800 overflow-x-auto">
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <ControlButton
          icon={isMicMuted ? MicOff : Mic}
          active={!isMicMuted}
          danger={isMicMuted}
          label={isMicMuted ? 'Unmute' : 'Mute'}
          onClick={onToggleMic}
        />
        <ControlButton
          icon={isCamOff ? CameraOff : Camera}
          active={!isCamOff}
          danger={isCamOff}
          label={isCamOff ? 'Cam On' : 'Cam Off'}
          onClick={onToggleCam}
        />
        <ControlButton
          icon={isScreenSharing ? Monitor : MonitorUp}
          active={isScreenSharing}
          label={isScreenSharing ? 'Stop Share' : 'Share'}
          onClick={onScreenShare}
        />
      </div>

      <div className="w-px h-6 sm:h-8 bg-coral-300 dark:bg-coral-700 mx-1 shrink-0" />

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <ControlButton icon={MessageSquare} label="Chat" onClick={onToggleChat} />
        <ControlButton icon={UserIcon} label="People" onClick={onToggleParticipants} />
        <ControlButton icon={Hand} label="Raise Hand" onClick={onRaiseHand} />
        <ControlButton
          icon={Grid3X3}
          label={speakerLayout === 'grid' ? 'Speaker' : 'Grid'}
          onClick={onToggleLayout}
          active={speakerLayout === 'speaker'}
        />
        <ControlButton icon={Radio} active={isRecording} label={isRecording ? 'Stop' : 'Record'} onClick={onToggleRecording} danger={isRecording} />
      </div>

      <div className="w-px h-6 sm:h-8 bg-coral-300 dark:bg-coral-700 mx-1 shrink-0" />

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <ControlButton icon={Bot} active={aiActive} label="AI Interview" onClick={onToggleAI} />
        <ControlButton icon={pushToTalk ? RadioTower : RadioTower} active={pushToTalk} label="PTT" onClick={onTogglePTT} />
        <button onClick={onHangup} className="p-2 sm:p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition cursor-pointer shrink-0" title="Leave call">
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  )
}

function ControlButton({ icon: Icon, active, danger, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 sm:p-3 rounded-full transition cursor-pointer shrink-0 ${
        danger
          ? 'bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50'
          : active
            ? 'bg-coral-100 dark:bg-coral-800/30 text-coral-600 dark:text-coral-300 hover:bg-coral-200 dark:hover:bg-coral-800/50'
            : 'bg-coral-100 dark:bg-coral-800 text-coral-500 dark:text-coral-300 hover:bg-coral-200 dark:hover:bg-coral-700'
      }`}
      title={label}
    >
      <Icon size={18} />
    </button>
  )
}