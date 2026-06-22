import { useEffect, useRef } from 'react'
import { Camera, CameraOff, Mic, MicOff } from 'lucide-react'

export default function PreCallPreview({ stream, devices, selectedCam, setSelectedCam, selectedMic, setSelectedMic, micMuted, camOff, toggleMic, toggleCam }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="w-full max-w-md mx-auto bg-coral-900 rounded-xl overflow-hidden shadow-xl">
      <div className="relative aspect-video bg-coral-800">
        {stream ? (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-coral-500 text-sm">Camera preview</div>
        )}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <button onClick={toggleMic} className="p-2 rounded-full bg-coral-900/50 hover:bg-coral-900/70 text-coral-50 cursor-pointer">
            {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button onClick={toggleCam} className="p-2 rounded-full bg-coral-900/50 hover:bg-coral-900/70 text-coral-50 cursor-pointer">
            {camOff ? <CameraOff size={16} /> : <Camera size={16} />}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-coral-500 mb-1">Camera</label>
          <select
            value={selectedCam}
            onChange={e => setSelectedCam(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-coral-800 border border-coral-700 text-coral-50 text-sm focus:outline-none focus:ring-2 focus:ring-coral-300"
          >
            {devices.cameras.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 8)}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-coral-500 mb-1">Microphone</label>
          <select
            value={selectedMic}
            onChange={e => setSelectedMic(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-coral-800 border border-coral-700 text-coral-50 text-sm focus:outline-none focus:ring-2 focus:ring-coral-300"
          >
            {devices.mics.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 8)}`}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
