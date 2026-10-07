import { useState, useEffect, useRef } from 'react';
import ThemeToggle from './ThemeToggle';
import InputSection from './InputSection';
import ProgressBar from './ProgressBar';
import useDownloadProgress from '../hooks/useDownloadProgress';

// Generatore di ID casuale per sessione
const generateClientId = () => Math.random().toString(36).substring(2, 15);

export default function Layout() {
  const [theme, setTheme] = useState('video');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Il clientId rimane costante per l'intera vita del componente Layout
  const clientIdRef = useRef(generateClientId());
  const clientId = clientIdRef.current;

  // Inizializza l'hook passando il client_id
  const { isConnected, progress, error: wsError, reset } = useDownloadProgress(clientId);

  const handleDownload = async (url) => {
    setIsLoading(true);
    setMessage('');
    reset(); // Resetta lo stato di eventuali progressi precedenti
    
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          type: theme,
          client_id: clientId // Inviamo il client_id al backend
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.detail || 'Errore imprevisto durante il download');
      }

      // Se non abbiamo ancora ricevuto 'completed' dal WS, impostiamo noi il messaggio
      if (!progress || progress.status !== 'completed') {
         setMessage(data.message);
      }
    } catch (error) {
      console.error('Errore durante il download:', error);
      setMessage(error.message || 'Si è verificato un errore.');
      setIsLoading(false);
    }
  };

  // Osserva lo stato di completamento in tempo reale dal WebSocket
  useEffect(() => {
    if (progress?.status === 'completed') {
      setMessage('Download completato con successo!');
      const timer = setTimeout(() => {
        setIsLoading(false);
        reset(); // Ripulisce e chiude
      }, 2000);
      return () => clearTimeout(timer);
    } else if (progress?.status === 'error' || wsError) {
      setIsLoading(false);
      setMessage(wsError || 'Errore critico durante il download dal server.');
      reset();
    }
  }, [progress?.status, wsError, reset]);

  // Sfondo dinamico con transizione fluida
  const bgClass = theme === 'video' ? 'bg-theme-video-bg' : 'bg-theme-music-bg';

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-300 ${bgClass}`}>
      
      {/* Header */}
      <header className="w-full p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 tracking-tighter">
          Vifree
        </h1>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-8 sm:p-10 text-center mb-20 relative">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Scarica {theme === 'video' ? 'Video' : 'Musica'}
              </h2>
              <p className="text-gray-500 text-base">
                Veloce, facile e senza limiti. Incolla il link qui sotto.
              </p>
            </div>

            {/* Il form viene disabilitato tramite la prop isLoading passata ad InputSection */}
            <InputSection 
              theme={theme} 
              onDownload={handleDownload} 
              isLoading={isLoading} 
            />
            
            {/* Contenitore a scomparsa per la ProgressBar */}
            <div 
              className="transition-all duration-500 ease-in-out" 
              style={{ 
                maxHeight: isLoading ? '200px' : '0px', 
                opacity: isLoading ? 1 : 0,
                marginTop: isLoading ? '1.5rem' : '0px'
              }}
            >
               {/* Passiamo un oggetto finto inizialmente per evitare flicker mentre il server si collega */}
               <ProgressBar progressData={progress || {
                 status: 'downloading', 
                 progress: 0, 
                 speed: 'Connessione...', 
                 total_size: '0.00', 
                 eta: null
               }} />
            </div>
            
            {/* Messaggio di Esito (visibile solo quando isLoading è false e abbiamo un message) */}
            {message && !isLoading && (
              <div className={`p-4 mt-6 rounded-xl font-medium border shadow-inner transition-opacity ${message.toLowerCase().includes('errore') ? 'bg-red-50 text-red-800 border-red-100' : 'bg-green-50 text-green-800 border-green-100'}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
