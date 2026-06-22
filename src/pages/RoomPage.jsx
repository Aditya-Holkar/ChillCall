import { useState, useEffect, useRef, useCallback } from 'react'
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
        navigate('/', { replace: true })
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

  if (room.error) {
    return (
      <div className="min-h-screen bg-coral-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to connect: {room.error}</p>
          <button onClick={handleHangup} className="px-4 py-2 bg-coral-300 text-coral-50 rounded-lg cursor-pointer">Go Back</button>
        </div>
      </div>
    )
  }

  const sidebarOpen = showChat || showParticipants || showAI

  return (
    <div className="h-screen flex flex-col bg-coral-900">
      <div className="flex-1 flex overflow-hidden relative">
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
          <Chat
            messages={room.messages}
            onSendMessage={room.sendMessage}
            onSendFile={room.sendFile}
            onSendReaction={room.sendReaction}
            onClose={() => setShowChat(false)}
          />
        )}

        {showParticipants && (
          <ParticipantsSidebar
            participants={room.participants}
            onClose={() => setShowParticipants(false)}
            onMuteParticipant={room.muteParticipant}
            isHost={room.participants[0]?.isHost}
          />
        )}

        {showAI && aiBot.state === 'idle' && (
          <InterviewSetup
            config={aiBot.config}
            setConfig={aiBot.setConfig}
            onStart={() => { aiBot.startInterview(); setShowAI(true) }}
            onClose={() => setShowAI(false)}
            participants={room.participants}
          />
        )}

        {showAI && aiBot.state !== 'idle' && (
          <InterviewController bot={aiBot} onClose={() => setShowAI(false)} />
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
