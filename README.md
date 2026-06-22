# ChillCall 🎥

> Zero-backend peer-to-peer video calling with an AI mock interviewer. Like FaceTime meets a career coach — no server, no setup, just chill.

## Features

- **Two connection modes** — PeerJS (mesh, no server) or LiveKit (SFU, better scaling)
- **AI Interviewer Bot** — Gemini → Groq → DeepSeek fallback chain with speech-to-text + text-to-speech
- **No backend** — LiveKit tokens generated client-side, API calls proxied through Vercel serverless
- **Everything you expect** — mute/cam toggle, screen share, chat, file share, emoji reactions, push-to-talk, recording, host controls, grid/speaker layout, dark/light theme, device selection

## Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Create or join a room — no signup needed.

## Architecture

```
                    ┌─────────────┐
                    │  Browser A   │◄──── PeerJS mesh / LiveKit SFU ────►│  Browser B   │
                    │  (React 19)  │                                      │  (React 19)  │
                    └──────┬──────┘                                      └──────┬──────┘
                           │                                                     │
                           └─────────── API calls via /api/proxy ────────────────┘
                                            │
                                   ┌────────┴────────┐
                                   │  api/proxy.mjs   │
                                   │  (Vercel edge)   │
                                   ├─────────────────┤
                                   │ Gemini / Groq /  │
                                   │ DeepSeek / etc   │
                                   └─────────────────┘
```

### Key Design Choices

| Decision | Why |
|----------|-----|
| **Text-over-data for bot** | Bot sends text via data channel → local SpeechSynthesis. Clear audio for everyone, no complex streaming. |
| **Key-based hook switching** | `key={mode}` on `RoomContent` so React cleanly unmounts PeerJS vs LiveKit hooks. |
| **Silence detection for STT** | `AudioContext` + `AnalyserNode` detects 2s silence → auto-stops recording → transcribes. |
| **LLM fallback chain** | Gemini → Groq → DeepSeek → OpenRouter → Together → Mistral → NVIDIA. First to respond wins. |
| **PDF parsing lazy-loaded** | `pdfjs-dist` dynamically imported only on PDF upload (separate 421KB chunk). |
| **Proxy for API keys** | All API calls go through `api/proxy.mjs` — keys never leave the server. |

## Deployment

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new)

Set these environment variables (without `VITE_` prefix) in Vercel dashboard:

```
GEMINI_API_KEY=
GROQ_API_KEY=
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=
TOGETHER_API_KEY=
MISTRAL_API_KEY=
NVIDIA_API_KEY=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

The proxy reads `process.env.GROQ_API_KEY` with fallback to `process.env.VITE_GROQ_API_KEY`.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | react-router-dom v7 |
| P2P | PeerJS 1.5 (mesh) |
| SFU | LiveKit 2.19 |
| AI | Gemini 2.5 / Groq / DeepSeek |
| STT | Groq Whisper |
| TTS | Web Speech API |
| Auth tokens | jose (client-side JWT) |
| Deployment | Vercel (static SPA + serverless) |

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Lint source
```

## License

MIT
