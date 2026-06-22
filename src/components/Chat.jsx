import { useState, useRef, useEffect } from 'react'
import { Send, X, Paperclip, Smile } from 'lucide-react'

const EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '🙌', '👏', '🔥', '💯', '🎊']

export default function Chat({ messages, onSendMessage, onSendFile, onSendReaction, onClose }) {
  const [text, setText] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onSendMessage(text.trim())
    setText('')
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (file) onSendFile(file)
    e.target.value = ''
  }

  return (
    <div className="w-full sm:w-80 flex flex-col bg-coral-50 dark:bg-coral-900 border-l border-coral-200 dark:border-coral-800 relative z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-coral-200 dark:border-coral-800">
        <h3 className="font-semibold text-coral-800 dark:text-coral-50 text-sm">Chat</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-coral-100 dark:hover:bg-coral-800 text-coral-500 cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-coral-500 text-xs text-center mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`${m.type === 'reaction' ? 'text-center text-2xl' : ''}`}>
            {m.type === 'text' && (
              <div>
                <span className="text-xs font-medium text-coral-500 dark:text-coral-300">{m.sender}</span>
                <p className="text-sm text-coral-700 dark:text-coral-100 bg-coral-100 dark:bg-coral-800 rounded-lg px-3 py-1.5 mt-0.5 inline-block">{m.content}</p>
              </div>
            )}
            {m.type === 'reaction' && <span>{m.content}</span>}
            {m.type === 'file' && (
              <div>
                <span className="text-xs font-medium text-coral-500 dark:text-coral-300">{m.sender}</span>
                {m.fileType?.startsWith('image/') ? (
                  <img src={m.content} alt={m.fileName} className="max-w-full rounded-lg mt-1 cursor-pointer" onClick={() => window.open(m.content)} />
                ) : (
                  <a href={m.content} download={m.fileName} className="block text-sm text-coral-300 hover:underline mt-0.5">{m.fileName}</a>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-coral-200 dark:border-coral-800">
        <div className="flex items-center gap-1">
          <label className="p-2 rounded hover:bg-coral-100 dark:hover:bg-coral-800 text-coral-500 cursor-pointer">
            <Paperclip size={16} />
            <input type="file" onChange={handleFile} className="hidden" />
          </label>
          <button
            type="button"
            onClick={() => setShowEmojis(!showEmojis)}
            className="p-2 rounded hover:bg-coral-100 dark:hover:bg-coral-800 text-coral-500 cursor-pointer"
          >
            <Smile size={16} />
          </button>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-coral-100 dark:bg-coral-800 border border-coral-200 dark:border-coral-700 text-coral-700 dark:text-coral-50 placeholder-coral-400 focus:outline-none focus:ring-1 focus:ring-coral-300"
          />
          <button type="submit" disabled={!text.trim()} className="p-2 rounded hover:bg-coral-100 dark:hover:bg-coral-800/30 text-coral-300 disabled:text-coral-200 cursor-pointer">
            <Send size={16} />
          </button>
        </div>
        {showEmojis && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => { onSendReaction(e); setShowEmojis(false) }}
                className="p-1 hover:bg-coral-100 dark:hover:bg-coral-800 rounded cursor-pointer text-lg"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  )
}
