import { useState, useEffect, useCallback } from 'react'

export function useMediaDevices() {
  const [devices, setDevices] = useState({ cameras: [], mics: [] })
  const [selectedCam, setSelectedCam] = useState('')
  const [selectedMic, setSelectedMic] = useState('')
  const [previewStream, setPreviewStream] = useState(null)

  const enumerate = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      const cameras = all.filter(d => d.kind === 'videoinput')
      const mics = all.filter(d => d.kind === 'audioinput')
      setDevices({ cameras, mics })
      if (cameras.length && !selectedCam) setSelectedCam(cameras[0].deviceId)
      if (mics.length && !selectedMic) setSelectedMic(mics[0].deviceId)
    } catch { /* permission not granted yet */ }
  }, [selectedCam, selectedMic])

  useEffect(() => {
    navigator.mediaDevices.addEventListener('devicechange', enumerate)
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerate)
  }, [enumerate])

  const startPreview = useCallback(async () => {
    stopPreview()
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: selectedCam ? { deviceId: { exact: selectedCam } } : true,
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
      })
      setPreviewStream(s)
      await enumerate()
      return s
    } catch (err) {
      console.error('Preview error:', err)
      return null
    }
  }, [selectedCam, selectedMic, enumerate])

  const stopPreview = useCallback(() => {
    if (previewStream) {
      previewStream.getTracks().forEach(t => t.stop())
      setPreviewStream(null)
    }
  }, [previewStream])

  useEffect(() => {
    return () => {
      if (previewStream) previewStream.getTracks().forEach(t => t.stop())
    }
  }, [])

  return {
    devices,
    selectedCam,
    setSelectedCam,
    selectedMic,
    setSelectedMic,
    previewStream,
    startPreview,
    stopPreview,
    enumerate,
  }
}
