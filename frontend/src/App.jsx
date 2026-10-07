import { useState } from 'react'

function App() {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
          Vifree
        </h1>
        <p className="text-gray-500">
          Premi il pulsante qui sotto per testare la connessione al backend via proxy.
        </p>
        
        <button 
          onClick={testConnection}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
        >
          Testa Connessione
        </button>
        
        {message && (
          <div className="mt-4 p-4 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
