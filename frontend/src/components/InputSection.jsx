import { useState } from 'react';

export default function InputSection({ theme, onDownload, isLoading }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onDownload(url);
    }
  };

  // Colore dinamico per il bottone: blu scuro (video) o blu elettrico (musica)
  const buttonColor = theme === 'video' 
    ? 'bg-theme-primary-video hover:brightness-110 focus:ring-theme-primary-video'
    : 'bg-theme-primary-music hover:brightness-110 focus:ring-theme-primary-music';

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-4">
      <input
        type="url"
        placeholder="Incolla qui l'URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isLoading}
        required
        className="w-full px-5 py-4 rounded-xl shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-800 disabled:bg-gray-100 disabled:text-gray-500 transition-all text-lg"
      />
      <button
        type="submit"
        disabled={isLoading || !url.trim()}
        className={`w-full flex items-center justify-center py-4 px-6 rounded-xl text-white font-bold text-lg shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${buttonColor}`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Scaricamento...
          </>
        ) : (
          'Download'
        )}
      </button>
    </form>
  );
}
