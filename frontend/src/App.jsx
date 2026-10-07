import { useState } from 'react'
import ThemeToggle from './components/ThemeToggle'
import InputSection from './components/InputSection'

function App() {
  const [theme, setTheme] = useState('video')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleDownload = async (url) => {
    setIsLoading(true)
    setMessage('')
    
    // TODO: Questa logica verrà in seguito collegata all'endpoint reale di FastAPI
    try {
      // Per ora simuliamo un'attesa di rete
      await new Promise(resolve => setTimeout(resolve, 2000))
      setMessage('Download simulato con successo per: ' + url)
    } catch (error) {
      console.error('Errore durante il download:', error)
      setMessage('Si è verificato un errore.')
    } finally {
      setIsLoading(false)
    }
  }

  // Selezione della classe di background in base al tema
  const bgClass = theme === 'video' ? 'bg-gray-50' : 'bg-[#E0F7FA]'

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300 p-4 w-full ${bgClass}`}>
      
      {/* Contenitore per il toggle del tema posizionato in alto */}
      <div className="absolute top-8">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-6 sm:p-8 text-center space-y-8 mt-16">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 mb-2">
            Vifree
          </h1>
          <p className="text-gray-500 text-sm">
            Scarica {theme === 'video' ? 'video' : 'musica'} velocemente e senza limiti.
          </p>
        </div>

        <InputSection 
          theme={theme} 
          onDownload={handleDownload} 
          isLoading={isLoading} 
        />
        
        {message && (
          <div className={`p-4 rounded-xl font-medium border shadow-inner ${message.includes('errore') ? 'bg-red-50 text-red-800 border-red-100' : 'bg-green-50 text-green-800 border-green-100'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
