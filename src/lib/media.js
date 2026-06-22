export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export async function getUserMediaWithRetry(constraints, maxRetries = 5, delay = 300) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      return stream
    } catch (err) {
      if (attempt < maxRetries && err.name === 'NotReadableError') {
        await sleep(delay * (attempt + 1))
        continue
      }
      throw err
    }
  }
  throw new Error('Could not start video source')
}

export async function getUserMediaBestEffort() {
  try {
    const stream = await getUserMediaWithRetry({ video: true, audio: true })
    return { stream, hasVideo: true }
  } catch {
    try {
      const stream = await getUserMediaWithRetry({ audio: true })
      return { stream, hasVideo: false }
    } catch (err) {
      return { stream: null, hasVideo: false, error: err }
    }
  }
}
