import { useState, useEffect, useRef, useCallback } from 'react';
import ThemeToggle from './ThemeToggle';
import InputSection from './InputSection';
import ProgressBar from './ProgressBar';
import Toast from './Toast';
import useDownloadProgress from '../hooks/useDownloadProgress';
import { requestNotificationPermission, showDownloadCompleteNotification } from '../utils/notifications';

const generateClientId = () => Math.random().toString(36).substring(2, 15);

export default function Layout() {
  const [theme, setTheme] = useState('video');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(''); // Contiene messaggi di errore (il successo va nel Toast)
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Usato per forzare il re-render e pulire il campo di InputSection
  const [formKey, setFormKey] = useState(0);

  const clientIdRef = useRef(generateClientId());
  const clientId = clientIdRef.current;

  const { isConnected, progress, error: wsError, reset } = useDownloadProgress(clientId);

  // Funzione condivisa per gestire l'esito positivo
  const handleSuccess = useCallback(() => {
    setToastMessage('✅ Download completato!');
    setShowToast(true);
    
    // Feedback tattile
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
    
    setIsLoading(false);
    setFormKey(prev => prev + 1); // Rende inesistente l'input precedente, svuotandolo!
    reset(); // Resetta l'hook e nasconde la ProgressBar immediatamente
  }, [reset]);

  const handleDownload = async (url) => {
    setIsLoading(true);
    setMessage('');
    setShowToast(false);
    reset(); 
    
    await requestNotificationPermission();
    
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          type: theme,
          client_id: clientId
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.detail || 'Errore imprevisto durante il download');
      }

      showDownloadCompleteNotification(data.title || 'Contenuto');

      // Se non abbiamo ancora ricevuto 'completed' dal WebSocket (raro, ma fallback sicuro)
      if (!progress || progress.status !== 'completed') {
         handleSuccess();
      }
    } catch (error) {
      console.error('Errore durante il download:', error);
      setMessage(error.message || 'Si è verificato un errore.');
      setIsLoading(false);
    }
  };

  // Osserva gli aggiornamenti in tempo reale dal WebSocket
  useEffect(() => {
    if (progress?.status === 'completed') {
      handleSuccess();
    } else if (progress?.status === 'error' || wsError) {
      setIsLoading(false);
      setMessage(wsError || 'Errore critico durante il download dal server.');
      reset();
    }
  }, [progress?.status, wsError, reset, handleSuccess]);

  const bgClass = theme === 'video' ? 'bg-theme-video-bg' : 'bg-theme-music-bg';

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-300 ${bgClass}`}>
      <header className="w-full p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 tracking-tighter">
          Vifree
        </h1>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </header>

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

            <InputSection 
              key={formKey}
              theme={theme} 
              onDownload={handleDownload} 
              isLoading={isLoading} 
            />
            
            <div 
              className="transition-all duration-500 ease-in-out" 
              style={{ 
                maxHeight: isLoading ? '200px' : '0px', 
                opacity: isLoading ? 1 : 0,
                marginTop: isLoading ? '1.5rem' : '0px'
              }}
            >
               <ProgressBar progressData={progress || {
                 status: 'downloading', 
                 progress: 0, 
                 speed: 'Connessione...', 
                 total_size: '0.00', 
                 eta: null
               }} />
            </div>
            
            {message && !isLoading && (
              <div className="p-4 mt-6 rounded-xl font-medium border shadow-inner bg-red-50 text-red-800 border-red-100 transition-opacity">
                {message}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Toast fluttuante */}
      <Toast 
        show={showToast} 
        message={toastMessage} 
        onClose={() => setShowToast(false)} 
        duration={3000} 
      />
    </div>
  );
}
