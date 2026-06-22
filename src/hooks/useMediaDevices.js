import { useState, useEffect, useCallback, useRef } from 'react'
import { getUserMediaBestEffort } from '../lib/media'

export function useMediaDevices() {
  const [devices, setDevices] = useState({ cameras: [], mics: [] })
  const [selectedCam, setSelectedCam] = useState('')
  const [selectedMic, setSelectedMic] = useState('')
  const [previewStream, setPreviewStream] = useState(null)
  const streamRef = useRef(null)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setPreviewStream(null)
    }
  }, [])

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
    stopStream()
    try {
      const { stream: s } = await getUserMediaBestEffort()
      streamRef.current = s
      setPreviewStream(s)
      await enumerate()
      return s
    } catch (err) {
      console.error('Preview error:', err)
      return null
    }
  }, [selectedCam, selectedMic, enumerate, stopStream])

  const stopPreview = useCallback(() => {
    stopStream()
  }, [stopStream])

  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [stopStream])

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
