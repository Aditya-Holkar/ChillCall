import VideoTile from './VideoTile'
import BotTile from './BotTile'

export default function VideoGrid({ participants, speakerLayout, spotlightId, onSpotlight, bot }) {
  const spotlighted = participants.find(p => p.id === spotlightId)
  const others = spotlightId ? participants.filter(p => p.id !== spotlightId) : participants
  const allTiles = bot ? [...participants, { id: 'ai-bot', displayName: 'AI Interviewer', isBot: true }] : participants

  if (participants.length === 0 && !bot) {
    return (
      <div className="flex-1 flex items-center justify-center text-coral-500">
        <p>Waiting for participants to join...</p>
      </div>
    )
  }

  const cols = Math.min(Math.ceil(Math.sqrt(allTiles.length)), 3)
  const rows = Math.ceil(allTiles.length / cols)

  return (
    <div className="flex-1 min-h-0 min-w-0">
      {speakerLayout === 'speaker' && spotlighted ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 sm:gap-2 h-full">
          <div className="lg:col-span-2 min-h-0">
            <VideoTile participant={spotlighted} onSpotlight={onSpotlight} />
          </div>
          <div className="flex flex-col gap-1 sm:gap-2 overflow-y-auto max-h-full">
            {others.map(p => (
              <div key={p.id} className="h-24 sm:h-32 lg:h-40 shrink-0">
                <VideoTile participant={p} onSpotlight={onSpotlight} />
              </div>
            ))}
            {bot && (
              <div key="ai-bot" className="h-24 sm:h-32 lg:h-40 shrink-0">
                <BotTile bot={bot} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="grid gap-1 sm:gap-2 h-full min-h-0"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {allTiles.map(p => {
            if (p.isBot) return <BotTile key="ai-bot" bot={bot} />
            return <VideoTile key={p.id} participant={p} isLocal={p.isLocal} onSpotlight={onSpotlight} />
          })}
        </div>
      )}
    </div>
  )
}
