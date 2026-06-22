import { useState, useRef, useCallback, useEffect } from 'react'
import Peer from 'peerjs'
import { getUserMediaWithRetry } from '../lib/media'

export function usePeerRoom() {
  const peerRef = useRef(null)
  const connectionsRef = useRef(new Map())
  const mediaCallsRef = useRef(new Map())
  const localStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const participantsRef = useRef([])
  const messagesRef = useRef([])

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

  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])

  const updateParticipants = useCallback(() => {
    setParticipants([...participantsRef.current])
  }, [])

  const getActiveSpeaker = useCallback(() => {
    const speaking = participantsRef.current.filter(p => p.isSpeaking)
    return speaking.length > 0 ? speaking[0] : null
  }, [])

  const connectToPeer = useCallback((remoteId, stream) => {
    if (connectionsRef.current.has(remoteId)) return

    const conn = peerRef.current.connect(remoteId, { reliable: true })
    conn.on('open', () => {
      connectionsRef.current.set(remoteId, conn)
      conn.send({ type: 'identity', id: peerRef.current.id, displayName: localStorage.getItem('chillcall-nick') || 'Guest' })
    })
    conn.on('data', handleDataMessage)
    conn.on('close', () => {
      connectionsRef.current.delete(remoteId)
      participantsRef.current = participantsRef.current.filter(p => p.id !== remoteId)
      updateParticipants()
    })

    const call = peerRef.current.call(remoteId, stream)
    mediaCallsRef.current.set(remoteId, call)
    call.on('stream', remoteStream => {
      const existing = participantsRef.current.find(p => p.id === remoteId)
      if (existing) {
        existing.stream = remoteStream
      } else {
        participantsRef.current.push({
          id: remoteId,
          stream: remoteStream,
          displayName: 'Connecting...',
          isMuted: false,
          isVideoOff: false,
          isSpeaking: false,
          raisedHand: false,
          isHost: false, isLocal: false,
        })
      }
      updateParticipants()
    })
    call.on('close', () => {
      const idx = participantsRef.current.findIndex(p => p.id === remoteId)
      if (idx !== -1) {
        participantsRef.current[idx].stream = null
        updateParticipants()
      }
    })
  }, [updateParticipants])

  const handleDataMessage = useCallback((data) => {
    const msg = typeof data === 'string' ? JSON.parse(data) : data
    const senderId = msg.senderId || 'unknown'

    switch (msg.type) {
      case 'identity':
        participantsRef.current = participantsRef.current.map(p =>
          p.id === senderId ? { ...p, displayName: msg.displayName } : p
        )
        updateParticipants()
        break
      case 'participant_list':
        const existingIds = participantsRef.current.map(p => p.id)
        msg.peers.forEach(pid => {
          if (pid !== peerRef.current.id && !existingIds.includes(pid)) {
            connectToPeer(pid, localStreamRef.current)
          }
        })
        break
      case 'chat':
        messagesRef.current = [...messagesRef.current, {
          id: Date.now().toString(),
          sender: msg.displayName,
          senderId,
          content: msg.content,
          type: 'text',
        }]
        setMessages([...messagesRef.current])
        break
      case 'reaction':
        messagesRef.current = [...messagesRef.current, {
          id: Date.now().toString(),
          sender: msg.displayName,
          senderId,
          content: msg.emoji,
          type: 'reaction',
        }]
        setMessages([...messagesRef.current])
        break
      case 'hand_raise':
        participantsRef.current = participantsRef.current.map(p =>
          p.id === senderId ? { ...p, raisedHand: msg.raised } : p
        )
        updateParticipants()
        break
      case 'mute_participant':
        if (senderId === peerRef.current.id) {
          const localVideo = localStreamRef.current?.getVideoTracks()[0]
          if (localVideo) localVideo.enabled = false
          setIsCamOff(true)
        }
        break
      case 'participant_joined':
        if (msg.peerId !== peerRef.current.id) {
          connectToPeer(msg.peerId, localStreamRef.current)
        }
        break
      case 'file':
        messagesRef.current = [...messagesRef.current, {
          id: Date.now().toString(),
          sender: msg.displayName,
          senderId,
          content: msg.fileData,
          fileName: msg.fileName,
          fileType: msg.fileType,
          type: 'file',
        }]
        setMessages([...messagesRef.current])
        break
    }
  }, [connectToPeer, updateParticipants])

  const createRoom = useCallback(async (displayName) => {
    setError(null)
    localStorage.setItem('chillcall-nick', displayName)

    const stream = await getUserMediaWithRetry({ video: true, audio: true })
    localStreamRef.current = stream

    const roomId = Math.random().toString(36).substring(2, 8)
    peerRef.current = new Peer(roomId)

    return new Promise((resolve, reject) => {
      peerRef.current.on('open', () => {
        try {
          participantsRef.current = [{
            id: peerRef.current.id,
            stream,
            displayName,
            isMuted: false, isVideoOff: false, isSpeaking: false,
            raisedHand: false, isHost: true, isLocal: true,
          }]
          updateParticipants()

          peerRef.current.on('connection', conn => {
            conn.on('open', () => {
              connectionsRef.current.set(conn.peer, conn)
              conn.send({
                type: 'participant_list',
                peers: Array.from(connectionsRef.current.keys()).concat(peerRef.current.id),
              })
            })
            conn.on('data', handleDataMessage)
          })

          peerRef.current.on('call', call => {
            call.answer(stream)
            mediaCallsRef.current.set(call.peer, call)
            call.on('stream', remoteStream => {
              const p = participantsRef.current.find(x => x.id === call.peer)
              if (p) p.stream = remoteStream
              else {
                participantsRef.current.push({
                  id: call.peer,
                  stream: remoteStream,
                  displayName: 'Connecting...',
                  isMuted: false, isVideoOff: false, isSpeaking: false,
                  raisedHand: false, isHost: false,
                })
              }
              updateParticipants()
            })
          })

          setIsConnected(true)
          resolve(roomId)
        } catch (err) {
          reject(err)
        }
      })
      peerRef.current.on('error', err => {
        reject(err)
      })
    })
  }, [handleDataMessage, updateParticipants])

  const joinRoom = useCallback(async (roomId, displayName) => {
    setError(null)
    localStorage.setItem('chillcall-nick', displayName)

    const stream = await getUserMediaWithRetry({ video: true, audio: true })
    localStreamRef.current = stream

    const myId = Math.random().toString(36).substring(2, 12)
    peerRef.current = new Peer(myId)

    return new Promise((resolve, reject) => {
      peerRef.current.on('open', () => {
        try {
          participantsRef.current = [{
            id: myId,
            stream,
            displayName,
            isMuted: false, isVideoOff: false, isSpeaking: false,
            raisedHand: false, isHost: false, isLocal: true,
          }]
          updateParticipants()

          const conn = peerRef.current.connect(roomId, { reliable: true })
          conn.on('open', () => {
            connectionsRef.current.set(roomId, conn)
            conn.send({ type: 'identity', id: myId, displayName })
          })
          conn.on('data', handleDataMessage)

          peerRef.current.on('call', call => {
            call.answer(stream)
            mediaCallsRef.current.set(call.peer, call)
            call.on('stream', remoteStream => {
              const p = participantsRef.current.find(x => x.id === call.peer)
              if (p) p.stream = remoteStream
              else {
                participantsRef.current.push({
                  id: call.peer, stream: remoteStream, displayName: 'Connecting...',
                  isMuted: false, isVideoOff: false, isSpeaking: false,
                  raisedHand: false, isHost: false, isLocal: false,
                })
              }
              updateParticipants()
            })
          })

          peerRef.current.on('connection', conn => {
            conn.on('open', () => {
              connectionsRef.current.set(conn.peer, conn)
              conn.send({ type: 'identity', id: myId, displayName })
            })
            conn.on('data', handleDataMessage)
          })

          setIsConnected(true)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
      peerRef.current.on('error', reject)
    })
  }, [handleDataMessage, updateParticipants])

  const leaveRoom = useCallback(() => {
    recordedChunksRef.current = []
    setIsRecording(false)

    mediaCallsRef.current.forEach(call => call.close())
    mediaCallsRef.current.clear()
    connectionsRef.current.forEach(conn => conn.close())
    connectionsRef.current.clear()

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    peerRef.current?.destroy()
    peerRef.current = null
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
    const audio = localStreamRef.current?.getAudioTracks()[0]
    if (audio) {
      audio.enabled = !audio.enabled
      setIsMicMuted(!audio.enabled)
    }
  }, [])

  const toggleCam = useCallback(() => {
    const video = localStreamRef.current?.getVideoTracks()[0]
    if (video) {
      video.enabled = !video.enabled
      setIsCamOff(!video.enabled)
    }
  }, [])

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      screenStreamRef.current = stream

      mediaCallsRef.current.forEach((call, peerId) => {
        const newCall = peerRef.current.call(peerId, stream)
        mediaCallsRef.current.set(peerId, newCall)
      })

      stream.getVideoTracks()[0].onended = () => stopScreenShare()
      setIsScreenSharing(true)
    } catch { /* user cancelled */ }
  }, [])

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
    }
    setIsScreenSharing(false)
  }, [])

  const sendMessage = useCallback((text) => {
    const msg = { type: 'chat', content: text, senderId: peerRef.current?.id, displayName: localStorage.getItem('chillcall-nick') || 'Guest' }
    connectionsRef.current.forEach(conn => conn.send(msg))
    messagesRef.current = [...messagesRef.current, {
      id: Date.now().toString(), sender: 'You', content: text, type: 'text',
    }]
    setMessages([...messagesRef.current])
  }, [])

  const sendFile = useCallback(async (file) => {
    const reader = new FileReader()
    reader.onload = () => {
      const data = reader.result
      const msg = { type: 'file', fileData: data, fileName: file.name, fileType: file.type, senderId: peerRef.current?.id, displayName: localStorage.getItem('chillcall-nick') || 'Guest' }
      connectionsRef.current.forEach(conn => conn.send(msg))
      messagesRef.current = [...messagesRef.current, {
        id: Date.now().toString(), sender: 'You', content: data, fileName: file.name, fileType: file.type, type: 'file',
      }]
      setMessages([...messagesRef.current])
    }
    reader.readAsDataURL(file)
  }, [])

  const sendReaction = useCallback((emoji) => {
    const msg = { type: 'reaction', emoji, senderId: peerRef.current?.id, displayName: localStorage.getItem('chillcall-nick') || 'Guest' }
    connectionsRef.current.forEach(conn => conn.send(msg))
    messagesRef.current = [...messagesRef.current, {
      id: Date.now().toString(), sender: 'You', content: emoji, type: 'reaction',
    }]
    setMessages([...messagesRef.current])
  }, [])

  const raiseHand = useCallback(() => {
    const me = participantsRef.current.find(p => p.id === peerRef.current?.id)
    const raised = !me?.raisedHand
    if (me) me.raisedHand = raised
    const msg = { type: 'hand_raise', raised, senderId: peerRef.current?.id }
    connectionsRef.current.forEach(conn => conn.send(msg))
    updateParticipants()
  }, [updateParticipants])

  const muteParticipant = useCallback((participantId) => {
    const msg = { type: 'mute_participant', senderId: participantId }
    connectionsRef.current.forEach(conn => conn.send(msg))
  }, [])

  const startRecording = useCallback(() => {
    if (!localStreamRef.current) return
    recordedChunksRef.current = []

    const allTracks = [localStreamRef.current]
    participantsRef.current.forEach(p => {
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
      } catch { /* recording not supported */ }
    }
  }, [])

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null)
        return
      }
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  return {
    localStream: localStreamRef.current,
    participants,
    messages,
    isConnected,
    error,
    isMicMuted,
    isCamOff,
    isScreenSharing,
    screenStream: screenStreamRef.current,
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
    getActiveSpeaker,
  }
}
