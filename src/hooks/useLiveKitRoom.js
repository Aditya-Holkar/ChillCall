import { useState, useRef, useCallback, useEffect } from 'react'
import { Room, RoomEvent, RemoteParticipant, Track, createLocalTracks } from 'livekit-client'
import { createLiveKitToken, generateRoomId } from '../lib/livekit-token'
import { sleep } from '../lib/media'

export function useLiveKitRoom() {
  const roomRef = useRef(null)
  const localTracksRef = useRef([])
  const screenTrackRef = useRef(null)
  const participantsRef = useRef([])
  const messagesRef = useRef([])
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])

  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [speakerLayout, setSpeakerLayout] = useState('grid')
  const [spotlightId, setSpotlightId] = useState(null)

  const updateParticipants = useCallback(() => {
    setParticipants([...participantsRef.current])
  }, [])

  const findOrAddParticipant = useCallback((sid, identity) => {
    let p = participantsRef.current.find(x => x.id === sid)
    if (!p) {
      p = {
        id: sid,
        displayName: identity || sid,
        stream: null,
        isMuted: false,
        isVideoOff: false,
        isSpeaking: false,
        raisedHand: false,
        isHost: false, isLocal: false,
      }
      participantsRef.current.push(p)
    }
    return p
  }, [])

  const createRoom = useCallback(async (displayName) => {
    setError(null)
    localStorage.setItem('chillcall-nick', displayName)

    const roomId = generateRoomId()
    const identity = `${displayName}-${Math.random().toString(36).substring(2, 6)}`
    const token = await createLiveKitToken(identity, roomId)
    const url = import.meta.env.VITE_LIVEKIT_URL

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    })
    roomRef.current = room

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      const p = findOrAddParticipant(participant.sid, participant.identity)
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        const stream = new MediaStream([track.mediaStreamTrack])
        p.stream = stream
        if (track.kind === Track.Kind.Video) p.isVideoOff = false
        if (track.kind === Track.Kind.Audio) p.isMuted = track.isMuted
      }
      updateParticipants()
    })

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      const p = participantsRef.current.find(x => x.id === participant.sid)
      if (p) {
        p.isVideoOff = true
        updateParticipants()
      }
    })

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      participantsRef.current = participantsRef.current.filter(p => p.id !== participant.sid)
      updateParticipants()
    })

    room.on(RoomEvent.DataReceived, (payload, participant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        const senderId = participant?.sid || 'system'
        const senderName = participant?.identity || 'System'

        switch (msg.type) {
          case 'chat':
            messagesRef.current = [...messagesRef.current, {
              id: Date.now().toString(), sender: senderName, senderId, content: msg.content, type: 'text',
            }]
            setMessages([...messagesRef.current])
            break
          case 'reaction':
            messagesRef.current = [...messagesRef.current, {
              id: Date.now().toString(), sender: senderName, senderId, content: msg.emoji, type: 'reaction',
            }]
            setMessages([...messagesRef.current])
            break
          case 'hand_raise':
            participantsRef.current = participantsRef.current.map(p =>
              p.id === senderId ? { ...p, raisedHand: msg.raised } : p
            )
            updateParticipants()
            break
          case 'file':
            messagesRef.current = [...messagesRef.current, {
              id: Date.now().toString(), sender: senderName, senderId,
              content: msg.fileData, fileName: msg.fileName, fileType: msg.fileType, type: 'file',
            }]
            setMessages([...messagesRef.current])
            break
          case 'mute_participant':
            if (participant?.sid === room.localParticipant?.sid) {
              room.localParticipant?.setCameraEnabled(false)
              setIsCamOff(true)
            }
            break
        }
      } catch { /* ignore malformed messages */ }
    })

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      participantsRef.current = participantsRef.current.map(p => ({
        ...p,
        isSpeaking: speakers.some(s => s.sid === p.id),
      }))
      updateParticipants()
    })

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      findOrAddParticipant(participant.sid, participant.identity)
      updateParticipants()
    })

    room.on(RoomEvent.Disconnected, () => {
      setIsConnected(false)
      setParticipants([])
      participantsRef.current = []
    })

    try {
      await room.connect(url, token, { autoSubscribe: true })

      let tracks
      for (let attempt = 0; attempt <= 3; attempt++) {
        try {
          tracks = await createLocalTracks({ audio: true, video: true })
          break
        } catch (err) {
          if (attempt < 3 && err.name === 'NotReadableError') {
            await sleep(500 * (attempt + 1))
            continue
          }
          throw err
        }
      }
      if (!tracks) throw new Error('Could not start video source')
      localTracksRef.current = tracks
      tracks.forEach(track => {
        if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
          room.localParticipant?.publishTrack(track)
        }
      })

      const localStream = new MediaStream()
      tracks.forEach(t => localStream.addTrack(t))

      const localSid = room.localParticipant?.sid || identity
      participantsRef.current = [{
        id: localSid,
        displayName: displayName,
        stream: localStream,
        isMuted: false,
        isVideoOff: false,
        isSpeaking: false,
        raisedHand: false,
        isHost: true, isLocal: true,
      }]

      room.remoteParticipants.forEach((p, sid) => {
        findOrAddParticipant(sid, p.identity)
      })
      updateParticipants()
      setIsConnected(true)

      room.localParticipant?.on('trackMuted', (track) => {
        if (track.kind === Track.Kind.Audio) setIsMicMuted(true)
        if (track.kind === Track.Kind.Video) setIsCamOff(true)
      })
      room.localParticipant?.on('trackUnmuted', (track) => {
        if (track.kind === Track.Kind.Audio) setIsMicMuted(false)
        if (track.kind === Track.Kind.Video) setIsCamOff(false)
      })

      return roomId
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [findOrAddParticipant, updateParticipants])

  const joinRoom = useCallback(async (roomId, displayName) => {
    setError(null)
    localStorage.setItem('chillcall-nick', displayName)

    const identity = `${displayName}-${Math.random().toString(36).substring(2, 6)}`
    const token = await createLiveKitToken(identity, roomId)
    const url = import.meta.env.VITE_LIVEKIT_URL

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    })
    roomRef.current = room

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      const p = findOrAddParticipant(participant.sid, participant.identity)
      const stream = new MediaStream([track.mediaStreamTrack])
      p.stream = stream
      updateParticipants()
    })

    room.on(RoomEvent.TrackUnsubscribed, () => updateParticipants())
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      participantsRef.current = participantsRef.current.filter(p => p.id !== participant.sid)
      updateParticipants()
    })

    room.on(RoomEvent.DataReceived, (payload, participant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        const senderId = participant?.sid || 'system'
        const senderName = participant?.identity || 'System'
        switch (msg.type) {
          case 'chat':
            messagesRef.current = [...messagesRef.current, {
              id: Date.now().toString(), sender: senderName, senderId, content: msg.content, type: 'text',
            }]
            setMessages([...messagesRef.current])
            break
          case 'reaction':
            messagesRef.current = [...messagesRef.current, {
              id: Date.now().toString(), sender: senderName, senderId, content: msg.emoji, type: 'reaction',
            }]
            setMessages([...messagesRef.current])
            break
          case 'hand_raise':
            participantsRef.current = participantsRef.current.map(p =>
              p.id === senderId ? { ...p, raisedHand: msg.raised } : p
            )
            updateParticipants()
            break
          case 'file':
            messagesRef.current = [...messagesRef.current, {
              id: Date.now().toString(), sender: senderName, senderId,
              content: msg.fileData, fileName: msg.fileName, fileType: msg.fileType, type: 'file',
            }]
            setMessages([...messagesRef.current])
            break
        }
      } catch { /* ignore */ }
    })

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      participantsRef.current = participantsRef.current.map(p => ({
        ...p,
        isSpeaking: speakers.some(s => s.sid === p.id),
      }))
      updateParticipants()
    })

    room.on(RoomEvent.Disconnected, () => {
      setIsConnected(false)
      participantsRef.current = []
      setParticipants([])
    })

    try {
      await room.connect(url, token, { autoSubscribe: true })

      let tracks
      for (let attempt = 0; attempt <= 3; attempt++) {
        try {
          tracks = await createLocalTracks({ audio: true, video: true })
          break
        } catch (err) {
          if (attempt < 3 && err.name === 'NotReadableError') {
            await sleep(500 * (attempt + 1))
            continue
          }
          throw err
        }
      }
      if (!tracks) throw new Error('Could not start video source')
      localTracksRef.current = tracks
      tracks.forEach(track => {
        room.localParticipant?.publishTrack(track)
      })

      const localStream = new MediaStream()
      tracks.forEach(t => localStream.addTrack(t))

      const localSid = room.localParticipant?.sid || identity
      participantsRef.current = [{
        id: localSid,
        displayName,
        stream: localStream,
        isMuted: false, isVideoOff: false, isSpeaking: false,
        raisedHand: false, isHost: false, isLocal: true,
      }]

      room.remoteParticipants.forEach((p, sid) => {
        findOrAddParticipant(sid, p.identity)
      })
      updateParticipants()
      setIsConnected(true)

      room.localParticipant?.on('trackMuted', (track) => {
        if (track.kind === Track.Kind.Audio) setIsMicMuted(true)
        if (track.kind === Track.Kind.Video) setIsCamOff(true)
      })
      room.localParticipant?.on('trackUnmuted', (track) => {
        if (track.kind === Track.Kind.Audio) setIsMicMuted(false)
        if (track.kind === Track.Kind.Video) setIsCamOff(false)
      })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [findOrAddParticipant, updateParticipants])

  const leaveRoom = useCallback(() => {
    recordedChunksRef.current = []
    setIsRecording(false)
    if (screenTrackRef.current) {
      roomRef.current?.localParticipant?.unpublishTrack(screenTrackRef.current)
      screenTrackRef.current = null
    }
    localTracksRef.current.forEach(t => t.stop())
    localTracksRef.current = []
    roomRef.current?.disconnect()
    roomRef.current = null
    participantsRef.current = []
    messagesRef.current = []
    setParticipants([])
    setMessages([])
    setIsConnected(false)
    setIsScreenSharing(false)
    setIsMicMuted(false)
    setIsCamOff(false)
  }, [])

  const toggleMic = useCallback(() => {
    roomRef.current?.localParticipant?.setMicrophoneEnabled(
      !roomRef.current.localParticipant?.isMicrophoneEnabled
    )
  }, [])

  const toggleCam = useCallback(() => {
    roomRef.current?.localParticipant?.setCameraEnabled(
      !roomRef.current.localParticipant?.isCameraEnabled
    )
  }, [])

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      screenTrackRef.current = stream.getVideoTracks()[0]
      await roomRef.current?.localParticipant?.publishTrack(screenTrackRef.current)
      stream.getVideoTracks()[0].onended = () => stopScreenShare()
      setIsScreenSharing(true)
    } catch { /* user cancelled */ }
  }, [])

  const stopScreenShare = useCallback(() => {
    if (screenTrackRef.current) {
      roomRef.current?.localParticipant?.unpublishTrack(screenTrackRef.current)
      screenTrackRef.current.stop()
      screenTrackRef.current = null
    }
    setIsScreenSharing(false)
  }, [])

  const sendMessage = useCallback((text) => {
    const msg = { type: 'chat', content: text }
    const encoder = new TextEncoder()
    roomRef.current?.localParticipant?.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true })
    messagesRef.current = [...messagesRef.current, {
      id: Date.now().toString(), sender: 'You', content: text, type: 'text',
    }]
    setMessages([...messagesRef.current])
  }, [])

  const sendFile = useCallback(async (file) => {
    const reader = new FileReader()
    reader.onload = () => {
      const msg = { type: 'file', fileData: reader.result, fileName: file.name, fileType: file.type }
      const encoder = new TextEncoder()
      roomRef.current?.localParticipant?.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true })
      messagesRef.current = [...messagesRef.current, {
        id: Date.now().toString(), sender: 'You',
        content: reader.result, fileName: file.name, fileType: file.type, type: 'file',
      }]
      setMessages([...messagesRef.current])
    }
    reader.readAsDataURL(file)
  }, [])

  const sendReaction = useCallback((emoji) => {
    const msg = { type: 'reaction', emoji }
    const encoder = new TextEncoder()
    roomRef.current?.localParticipant?.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true })
    messagesRef.current = [...messagesRef.current, {
      id: Date.now().toString(), sender: 'You', content: emoji, type: 'reaction',
    }]
    setMessages([...messagesRef.current])
  }, [])

  const raiseHand = useCallback(() => {
    const me = participantsRef.current[0]
    const raised = !me?.raisedHand
    if (me) me.raisedHand = raised
    const msg = { type: 'hand_raise', raised }
    const encoder = new TextEncoder()
    roomRef.current?.localParticipant?.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true })
    updateParticipants()
  }, [updateParticipants])

  const muteParticipant = useCallback((participantId) => {
    const msg = { type: 'mute_participant' }
    const encoder = new TextEncoder()
    roomRef.current?.localParticipant?.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true })
  }, [])

  const startRecording = useCallback(() => {
    const localStream = participantsRef.current[0]?.stream
    if (!localStream) return
    recordedChunksRef.current = []

    const allTracks = [localStream]
    participantsRef.current.slice(1).forEach(p => {
      if (p.stream) allTracks.push(p.stream)
    })

    const combined = new MediaStream()
    allTracks.forEach(s => s.getTracks().forEach(t => combined.addTrack(t.clone())))

    try {
      const recorder = new MediaRecorder(combined, { mimeType: 'video/webm;codecs=vp9,opus' })
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.start(1000)
      setIsRecording(true)
    } catch {
      try {
        const recorder = new MediaRecorder(combined, { mimeType: 'video/webm;codecs=vp8,opus' })
        mediaRecorderRef.current = recorder
        recorder.ondataavailable = e => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data)
        }
        recorder.start(1000)
        setIsRecording(true)
      } catch { /* not supported */ }
    }
  }, [])

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) { resolve(null); return }
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        recordedChunksRef.current = []
        setIsRecording(false)
        resolve(blob)
      }
      mediaRecorderRef.current.stop()
    })
  }, [])

  useEffect(() => {
    return () => {
      localTracksRef.current.forEach(t => t.stop())
      localTracksRef.current = []
      roomRef.current?.disconnect()
    }
  }, [])

  return {
    localStream: participantsRef.current[0]?.stream || null,
    participants,
    messages,
    isConnected,
    error,
    isMicMuted,
    isCamOff,
    isScreenSharing,
    screenStream: null,
    isRecording,
    speakerLayout,
    setSpeakerLayout,
    spotlightId,
    setSpotlightId,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    sendFile,
    sendReaction,
    raiseHand,
    muteParticipant,
    startRecording,
    stopRecording,
  }
}
