import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import HomePage from './pages/HomePage'
import RoomPage from './pages/RoomPage'

function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('chillcall-mode') || 'peerjs')

  const handleModeChange = (newMode) => {
    setMode(newMode)
    localStorage.setItem('chillcall-mode', newMode)
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage mode={mode} onModeChange={handleModeChange} />} />
          <Route path="/room/:mode/:roomId" element={<RoomPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
