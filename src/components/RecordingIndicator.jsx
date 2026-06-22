import { Download, X } from 'lucide-react'

export default function RecordingIndicator({ isRecording, onDownload, blob }) {
  if (!isRecording && !blob) return null

  return (
    <div className="absolute top-4 left-4 z-10">
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-medium shadow-lg">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Recording
        </div>
      )}
      {blob && (
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500 text-white text-sm font-medium shadow-lg hover:bg-green-600 cursor-pointer"
        >
          <Download size={14} />
          Download Recording
        </button>
      )}
    </div>
  )
}
