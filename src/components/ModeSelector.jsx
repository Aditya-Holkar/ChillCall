import { Wifi, Server } from 'lucide-react'

const modes = [
  {
    id: 'peerjs',
    label: 'PeerJS (P2P)',
    desc: 'Pure peer-to-peer mesh. No servers needed. Best for 2-4 people.',
    icon: Wifi,
    color: 'bg-coral-300 hover:bg-coral-400',
  },
  {
    id: 'livekit',
    label: 'LiveKit (SFU)',
    desc: 'Server-relayed for smooth group calls. Best for 5-10 people. Free tier.',
    icon: Server,
    color: 'bg-coral-300 hover:bg-coral-400',
  },
]

export default function ModeSelector({ onSelect, defaultMode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl mx-auto">
      {modes.map(m => {
        const Icon = m.icon
        const isDefault = m.id === defaultMode
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`flex-1 p-6 rounded-xl text-coral-50 transition-all cursor-pointer ${m.color} ${isDefault ? 'ring-4 ring-coral-50/50 scale-[1.02]' : 'opacity-85 hover:opacity-100'}`}
          >
            <Icon size={32} className="mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1">{m.label}</h3>
            <p className="text-sm text-coral-50/80">{m.desc}</p>
          </button>
        )
      })}
    </div>
  )
}
