import { SignJWT } from 'jose'

export async function createLiveKitToken(identity, roomName) {
  const apiKey = import.meta.env.VITE_LIVEKIT_API_KEY
  const apiSecret = import.meta.env.VITE_LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit API key or secret not configured')
  }

  const secret = new TextEncoder().encode(apiSecret)

  const token = await new SignJWT({
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(apiKey)
    .setSubject(identity)
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(secret)

  return token
}

export function generateRoomId() {
  return Math.random().toString(36).substring(2, 8)
}
