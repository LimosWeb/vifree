import { useState } from 'react'
import ThemeToggle from './components/ThemeToggle'

function App() {
  const [theme, setTheme] = useState('video')
  const [message, setMessage] = useState('')

  const testConnection = async () => {
    try {
      const response = await fetch('/api/test')
      const data = await response.json()
      setMessage(data.message)
    } catch (error) {
      console.error('Errore durante la chiamata API:', error)
      setMessage('Errore di connessione al backend')
    }
  }

  // Selezione della classe di background in base al tema
  // bg-gray-50 corrisponde a #F9FAFB, mentre bg-[#E0F7FA] è l'azzurro richiesto.
  // transition-colors duration-300 applica la transizione fluida di 0.3s.
  const bgClass = theme === 'video' ? 'bg-gray-50' : 'bg-[#E0F7FA]'

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300 p-4 ${bgClass}`}>
      
      {/* Contenitore per il toggle del tema posizionato in alto */}
      <div className="absolute top-8">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>

      <div className="max-w-md w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 text-center space-y-6 mt-16">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
          Vifree
        </h1>
        <p className="text-gray-600 font-medium">
          Modalità attiva: <span className="font-bold text-gray-800 capitalize">{theme}</span>
        </p>
        <p className="text-gray-500 text-sm">
          Premi il pulsante qui sotto per testare la connessione al backend via proxy.
        </p>
        
        <button 
          onClick={testConnection}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl shadow-md hover:opacity-90 hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
        >
          Testa Connessione
        </button>
        
        {message && (
          <div className="mt-4 p-4 rounded-xl bg-blue-50 text-blue-800 font-medium border border-blue-100 shadow-inner">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
