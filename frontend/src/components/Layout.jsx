import { useState } from 'react';
import ThemeToggle from './ThemeToggle';
import InputSection from './InputSection';

export default function Layout() {
  const [theme, setTheme] = useState('video');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDownload = async (url) => {
    setIsLoading(true);
    setMessage('');
    
    // TODO: Questa logica verrà in seguito collegata all'endpoint reale di FastAPI
    try {
      // Simuliamo un'attesa di rete
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMessage('Download simulato con successo per: ' + url);
    } catch (error) {
      console.error('Errore durante il download:', error);
      setMessage('Si è verificato un errore.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sfondo dinamico con transizione fluida
  const bgClass = theme === 'video' ? 'bg-gray-50' : 'bg-[#E0F7FA]';

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
        {/* Main Card */}
        <div className="w-full max-w-lg bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-8 sm:p-10 text-center space-y-8 mb-20">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Scarica {theme === 'video' ? 'Video' : 'Musica'}
            </h2>
            <p className="text-gray-500 text-base">
              Veloce, facile e senza limiti. Incolla il link qui sotto.
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
      </main>
    </div>
  );
}
