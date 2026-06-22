import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Video, LogIn } from 'lucide-react'
import ModeSelector from '../components/ModeSelector'
import PreCallPreview from '../components/PreCallPreview'
import ThemeToggle from '../components/ThemeToggle'
import { useMediaDevices } from '../hooks/useMediaDevices'

export default function HomePage({ mode, onModeChange }) {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState(() => localStorage.getItem('chillcall-nick') || '')
  const [roomId, setRoomId] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [micMuted, setMicMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const media = useMediaDevices()

  useEffect(() => {
    if (showPreview) media.startPreview()
    else media.stopPreview()
  }, [showPreview])

  const handleCreate = async () => {
    if (!nickname.trim()) return
    navigate(`/room/${mode}/${roomId || 'new'}`, { state: { mode, nickname: nickname.trim(), action: 'create' } })
  }

  const handleJoin = async () => {
    if (!nickname.trim() || !roomId.trim()) return
    navigate(`/room/${mode}/${roomId.trim()}`, { state: { mode, nickname: nickname.trim(), action: 'join' } })
  }

  const toggleMic = () => {
    const audio = media.previewStream?.getAudioTracks()[0]
    if (audio) { audio.enabled = !audio.enabled; setMicMuted(!audio.enabled) }
  }

  const toggleCam = () => {
    const video = media.previewStream?.getVideoTracks()[0]
    if (video) { video.enabled = !video.enabled; setCamOff(!video.enabled) }
  }

  return (
    <div className="min-h-screen bg-coral-50 dark:bg-coral-800 flex flex-col items-center justify-center p-4">
      <ThemeToggle />

      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <Video size={40} className="mx-auto text-coral-300 mb-3" />
          <h1 className="text-3xl font-bold text-coral-800 dark:text-coral-50">ChillCall</h1>
          <p className="text-coral-500 dark:text-coral-300 mt-1">Peer-to-peer video calls. No backend required.</p>
        </div>

        <ModeSelector onSelect={onModeChange} defaultMode={mode} />

        <div className="bg-coral-50 dark:bg-coral-900 rounded-xl shadow-sm border border-coral-200 dark:border-coral-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-coral-800 dark:text-coral-50">Join or Create a Room</h2>

          <div>
            <label className="block text-sm font-medium text-coral-500 dark:text-coral-300 mb-1">Your Name</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-2.5 rounded-lg bg-coral-50 dark:bg-coral-800 border border-coral-200 dark:border-coral-700 text-coral-700 dark:text-coral-50 placeholder-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleCreate}
              disabled={!nickname.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-coral-300 hover:bg-coral-400 disabled:bg-coral-200 dark:disabled:bg-coral-700 text-coral-50 font-medium transition cursor-pointer disabled:cursor-not-allowed"
            >
              <Video size={18} />
              Create Room
            </button>
            <div className="flex gap-2">
              <input
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                placeholder="Room ID..."
                className="flex-1 px-3 py-2.5 rounded-lg bg-coral-50 dark:bg-coral-800 border border-coral-200 dark:border-coral-700 text-coral-700 dark:text-coral-50 placeholder-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-300 text-sm"
              />
              <button
                onClick={handleJoin}
                disabled={!nickname.trim() || !roomId.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-coral-300 hover:bg-coral-400 disabled:bg-coral-200 dark:disabled:bg-coral-700 text-coral-50 font-medium transition cursor-pointer disabled:cursor-not-allowed"
              >
                <LogIn size={18} />
                Join
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-coral-500">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-coral-300 hover:text-coral-400 cursor-pointer"
            >
              {showPreview ? 'Hide' : 'Preview'} camera & mic
            </button>
          </div>

          {showPreview && (
            <PreCallPreview
              stream={media.previewStream}
              devices={media.devices}
              selectedCam={media.selectedCam}
              setSelectedCam={media.setSelectedCam}
              selectedMic={media.selectedMic}
              setSelectedMic={media.setSelectedMic}
              micMuted={micMuted}
              camOff={camOff}
              toggleMic={toggleMic}
              toggleCam={toggleCam}
            />
          )}
        </div>
      </div>
    </div>
  )
}
