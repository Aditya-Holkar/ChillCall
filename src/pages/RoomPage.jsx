import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { usePeerRoom } from '../hooks/usePeerRoom'
import { useLiveKitRoom } from '../hooks/useLiveKitRoom'
import { useAIBot } from '../hooks/useAIBot'
import VideoGrid from '../components/VideoGrid'
import Controls from '../components/Controls'
import Chat from '../components/Chat'
import ParticipantsSidebar from '../components/ParticipantsSidebar'
import RecordingIndicator from '../components/RecordingIndicator'
import InterviewSetup from '../components/InterviewSetup'
import InterviewController from '../components/InterviewController'
import ThemeToggle from '../components/ThemeToggle'

function RoomContent({ mode, roomId, action, nickname }) {
  const room = mode === 'livekit' ? useLiveKitRoom() : usePeerRoom()
  const aiBot = useAIBot(room)
  const navigate = useNavigate()

  const [showChat, setShowChat] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [pushToTalk, setPushToTalk] = useState(false)
  const [recordingBlob, setRecordingBlob] = useState(null)
  const [joinStarted, setJoinStarted] = useState(false)
  const [initError, setInitError] = useState(null)
  const pttRef = useRef(false)
  const leftRef = useRef(false)

  useEffect(() => {
    if (joinStarted) return
    setJoinStarted(true)

    const init = async () => {
      try {
        if (action === 'create') {
          const id = await room.createRoom(nickname)
          window.history.replaceState(null, '', `/room/${mode}/${roomId === 'new' ? id : roomId}`)
        } else {
          await room.joinRoom(roomId, nickname)
        }
      } catch (err) {
        const errName = err.name ? `${err.name}: ` : ''
        setInitError(`${errName}${err.message || 'Failed to create or join room'}`)
      }
    }
    init()

    return () => {
      if (!leftRef.current) {
        room.leaveRoom()
      }
    }
  }, [])

  const handleHangup = () => {
    leftRef.current = true
    window.speechSynthesis?.cancel()
    room.leaveRoom()
    navigate('/', { replace: true })
  }

  const handleToggleRecording = async () => {
    if (room.isRecording) {
      const blob = await room.stopRecording()
      setRecordingBlob(blob)
    } else {
      setRecordingBlob(null)
      room.startRecording()
    }
  }

  const handleDownloadRecording = () => {
    if (recordingBlob) {
      const url = URL.createObjectURL(recordingBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chillcall-recording-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
      setRecordingBlob(null)
    }
  }

  const displayError = initError || room.error
  if (displayError) {
    const errLower = displayError.toLowerCase()
    let tip = ''
    if (errLower.startsWith('notallowederror')) {
      tip = 'Camera/microphone permission was denied. Check your browser/phone settings and ensure camera & mic are allowed for this site. Clear site permissions and try again, or restart your browser.'
    } else if (errLower.startsWith('notreadableerror')) {
      tip = 'Your camera or microphone is busy. On mobile: close other apps using the camera (like FaceTime, WhatsApp, camera app). Also try closing other browser tabs, restarting your browser, or granting the site camera/mic permissions again in settings.'
    } else if (errLower.startsWith('notfounderror')) {
      tip = 'No camera or microphone detected. Plug in a device and try again. On mobile, ensure your device has a working camera and mic.'
    } else if (errLower.startsWith('aborterror')) {
      tip = 'Something interrupted the connection. Please try again.'
    } else if (errLower.startsWith('securityerror')) {
      tip = 'Media access requires a secure connection (HTTPS). This site is using HTTPS, so try clearing site permissions in your browser settings and reloading.'
    } else if (errLower.includes('permission') || errLower.includes('denied')) {
      tip = 'Camera/microphone permission was denied. Check your browser settings and ensure camera & mic are allowed for this site.'
    } else if (errLower.includes('could not connect') || errLower.includes('peer') || errLower.includes('network')) {
      tip = 'Could not connect to the signaling server. Check your internet connection and try again.'
    } else if (mode === 'livekit' && (errLower.includes('token') || errLower.includes('env') || errLower.includes('key') || errLower.includes('livekit'))) {
      tip = 'LiveKit configuration is missing. Set VITE_LIVEKIT_URL, VITE_LIVEKIT_API_KEY, and VITE_LIVEKIT_API_SECRET during build, or try PeerJS mode.'
    } else {
      tip = mode === 'livekit'
        ? 'Check that VITE_LIVEKIT_URL, VITE_LIVEKIT_API_KEY, VITE_LIVEKIT_API_SECRET are set during build. Try PeerJS mode instead.'
        : 'Make sure camera/microphone permissions are granted in your browser settings. On mobile, also ensure no other app is using the camera/mic. Try clearing site data and reloading the page.'
    }

    return (
      <div className="min-h-screen bg-coral-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <p className="text-red-400 mb-2 font-semibold">Failed to connect</p>
          <p className="text-coral-200 text-sm mb-4 break-words">{displayError}</p>
          <div className="bg-coral-800/50 rounded-lg p-3 mb-4 text-left">
            <p className="text-coral-300 text-xs font-medium mb-1">Possible fix:</p>
            <p className="text-coral-100 text-sm">{tip}</p>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-coral-500 hover:bg-coral-400 text-coral-50 rounded-lg cursor-pointer text-sm transition">
              Retry
            </button>
            <button onClick={handleHangup} className="px-4 py-2 bg-coral-700 hover:bg-coral-600 text-coral-50 rounded-lg cursor-pointer text-sm transition">
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const sidebarOpen = showChat || showParticipants || showAI

  return (
    <div className="h-screen flex flex-col bg-coral-900">
      <div className="flex-1 flex overflow-hidden relative min-h-0 p-1 sm:p-3">
        <RecordingIndicator
          isRecording={room.isRecording}
          blob={recordingBlob}
          onDownload={handleDownloadRecording}
        />

        <VideoGrid
          participants={room.participants}
          speakerLayout={room.speakerLayout}
          spotlightId={room.spotlightId}
          onSpotlight={room.setSpotlightId}
          bot={aiBot.state !== 'idle' && aiBot.state !== 'setup' ? aiBot : null}
        />

        {showChat && (
          <div className="absolute inset-0 z-30 sm:relative sm:inset-auto animate-[slide-in-right_0.2s_ease-out]">
            <div className="absolute inset-0 bg-coral-900/60 sm:hidden" onClick={() => setShowChat(false)} />
            <Chat
              messages={room.messages}
              onSendMessage={room.sendMessage}
              onSendFile={room.sendFile}
              onSendReaction={room.sendReaction}
              onClose={() => setShowChat(false)}
            />
          </div>
        )}

        {showParticipants && (
          <div className="absolute inset-0 z-30 sm:relative sm:inset-auto animate-[slide-in-right_0.2s_ease-out]">
            <div className="absolute inset-0 bg-coral-900/60 sm:hidden" onClick={() => setShowParticipants(false)} />
            <ParticipantsSidebar
              participants={room.participants}
              onClose={() => setShowParticipants(false)}
              onMuteParticipant={room.muteParticipant}
              isHost={room.participants[0]?.isHost}
            />
          </div>
        )}

        {showAI && aiBot.state === 'idle' && (
          <div className="absolute inset-0 z-30 sm:relative sm:inset-auto animate-[slide-in-right_0.2s_ease-out]">
            <div className="absolute inset-0 bg-coral-900/60 sm:hidden" onClick={() => setShowAI(false)} />
            <InterviewSetup
              config={aiBot.config}
              setConfig={aiBot.setConfig}
              onStart={() => { aiBot.startInterview(); setShowAI(true) }}
              onClose={() => setShowAI(false)}
              participants={room.participants}
            />
          </div>
        )}

        {showAI && aiBot.state !== 'idle' && (
          <div className="absolute inset-0 z-30 sm:relative sm:inset-auto animate-[slide-in-right_0.2s_ease-out]">
            <div className="absolute inset-0 bg-coral-900/60 sm:hidden" onClick={() => setShowAI(false)} />
            <InterviewController bot={aiBot} onClose={() => setShowAI(false)} />
          </div>
        )}
      </div>

      <Controls
        isMicMuted={room.isMicMuted}
        isCamOff={room.isCamOff}
        isScreenSharing={room.isScreenSharing}
        isRecording={room.isRecording}
        onToggleMic={room.toggleMic}
        onToggleCam={room.toggleCam}
        onScreenShare={room.isScreenSharing ? room.stopScreenShare : room.startScreenShare}
        onHangup={handleHangup}
        onToggleChat={() => { setShowChat(c => !c); setShowParticipants(false); setShowAI(false) }}
        onToggleParticipants={() => { setShowParticipants(c => !c); setShowChat(false); setShowAI(false) }}
        onRaiseHand={room.raiseHand}
        onToggleRecording={handleToggleRecording}
        onToggleLayout={() => room.setSpeakerLayout(l => l === 'grid' ? 'speaker' : 'grid')}
        speakerLayout={room.speakerLayout}
        pushToTalk={pushToTalk}
        onTogglePTT={() => setPushToTalk(p => !p)}
        onToggleAI={() => { setShowAI(c => !c); setShowChat(false); setShowParticipants(false) }}
        aiActive={showAI}
        sidebarOpen={showChat || showParticipants || showAI}
      />
    </div>
  )
}

export default function RoomPage() {
  const { roomId, mode } = useParams()
  const location = useLocation()
  const state = location.state || {}
  const effectiveMode = state.mode || mode || 'peerjs'

  return (
    <RoomContent
      key={effectiveMode}
      mode={effectiveMode}
      roomId={roomId}
      action={state.action || 'join'}
      nickname={state.nickname || 'Guest'}
    />
  )
}
