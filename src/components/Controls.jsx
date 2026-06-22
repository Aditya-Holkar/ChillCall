import { Mic, MicOff, Camera, CameraOff, MonitorUp, Monitor, MessageSquare, Hand, PhoneOff, Radio, RadioTower, Grid3X3, User as UserIcon, Bot } from 'lucide-react'

export default function Controls({
  isMicMuted, isCamOff, isScreenSharing, isRecording,
  onToggleMic, onToggleCam, onScreenShare, onHangup,
  onToggleChat, onToggleParticipants, onRaiseHand,
  onToggleRecording, onToggleLayout, speakerLayout,
  pushToTalk, onTogglePTT, onToggleAI, aiActive,
  sidebarOpen,
}) {
  return (
    <>
      {/* Mobile: vertical floating column */}
      <div className={`sm:hidden fixed right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 p-2 rounded-2xl bg-coral-50/90 dark:bg-coral-900/90 backdrop-blur-md shadow-xl transition-opacity duration-200 ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
        <div className="w-6 h-px bg-coral-300 dark:bg-coral-700" />
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
        <ControlButton icon={isScreenSharing ? Monitor : MonitorUp} active={isScreenSharing} label={isScreenSharing ? 'Stop Share' : 'Share'} onClick={onScreenShare} />
        <div className="w-6 h-px bg-coral-300 dark:bg-coral-700" />
        <ControlButton icon={Bot} active={aiActive} label="AI Interview" onClick={onToggleAI} />
        <ControlButton icon={pushToTalk ? RadioTower : RadioTower} active={pushToTalk} label="PTT" onClick={onTogglePTT} />
        <div className="w-6 h-px bg-coral-300 dark:bg-coral-700" />
        <button onClick={onHangup} className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition cursor-pointer shadow-lg" title="Leave call">
          <PhoneOff size={20} />
        </button>
      </div>

      {/* Desktop: horizontal bottom bar */}
      <div className="hidden sm:flex items-center justify-center gap-3 px-6 py-4 bg-coral-50 dark:bg-coral-900 border-t border-coral-200 dark:border-coral-800">
        <div className="flex items-center gap-2">
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

        <div className="w-px h-8 bg-coral-300 dark:bg-coral-700" />

        <div className="flex items-center gap-2">
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

        <div className="w-px h-8 bg-coral-300 dark:bg-coral-700" />

        <div className="flex items-center gap-2">
          <ControlButton icon={Bot} active={aiActive} label="AI Interview" onClick={onToggleAI} />
          <ControlButton icon={pushToTalk ? RadioTower : RadioTower} active={pushToTalk} label="PTT" onClick={onTogglePTT} />
          <button onClick={onHangup} className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition cursor-pointer" title="Leave call">
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </>
  )
}

function ControlButton({ icon: Icon, active, danger, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 sm:p-3 rounded-full transition cursor-pointer shrink-0 ${
        danger
          ? 'bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50'
          : active
            ? 'bg-coral-100 dark:bg-coral-800/30 text-coral-600 dark:text-coral-300 hover:bg-coral-200 dark:hover:bg-coral-800/50'
            : 'bg-coral-100 dark:bg-coral-800 text-coral-500 dark:text-coral-300 hover:bg-coral-200 dark:hover:bg-coral-700'
      }`}
      title={label}
    >
      <Icon size={20} />
    </button>
  )
}