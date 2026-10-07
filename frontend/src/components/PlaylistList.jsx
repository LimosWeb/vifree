import React from 'react';

export default function PlaylistList({ items = [] }) {
  if (!items || items.length === 0) return null;

  // Calcoliamo i contatori per la barra di progresso dell'header
  const completedCount = items.filter(item => item.status === 'completed').length;
  const totalCount = items.length;
  const overallProgress = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  // Utility per formattare la durata in MM:SS in modo pulito
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full mt-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-inner overflow-hidden flex flex-col animate-fade-in text-left">
      
      {/* --- HEADER STATISTICHE COMPLESSIVE --- */}
      <div className="p-4 bg-gray-50/90 border-b border-gray-200 flex flex-col space-y-3 z-10">
        <div className="flex justify-between items-center text-sm font-semibold text-gray-700">
          <span>Avanzamento Playlist</span>
          <span className="text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm">
            {completedCount} / {totalCount} brani
          </span>
        </div>
        
        {/* Barra Progresso Totale */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* --- LISTA SCROLLABILE DEI BRANI --- */}
      <div className="max-h-64 overflow-y-auto p-2 space-y-1 relative">
        {items.map((item, idx) => {
          // Ricaviamo lo stato corrente (default: waiting)
          const status = item.status || 'waiting';
          const isDownloading = status === 'downloading';
          const isCompleted = status === 'completed';
          const isWaiting = status === 'waiting';
          const isError = status === 'error';

          return (
            <div 
              key={item.id || idx}
              className={`flex items-center p-2 rounded-xl transition-all duration-300 ease-in-out ${
                isDownloading ? 'bg-blue-50 border border-blue-200 shadow-sm scale-[1.02] transform' : 'hover:bg-gray-50 border border-transparent'
              } ${isCompleted ? 'opacity-75' : ''}`}
            >
              {/* Thumbnail (48x48) */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-200 relative shadow-sm">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="thumb" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                     {/* Placeholder se l'immagine manca */}
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03A3.003 3.003 0 0111 18c-1.66 0-3-1.34-3-3z"/></svg>
                  </div>
                )}
                
                {/* Velo opaco se completato */}
                {isCompleted && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px]" />}
              </div>

              {/* Info Testo (Titolo Troncato + Durata) */}
              <div className="ml-3 flex-1 min-w-0 flex flex-col justify-center">
                <p className={`text-[15px] font-semibold truncate transition-colors duration-300 ${
                  isCompleted ? 'text-gray-500 line-through' : isDownloading ? 'text-blue-800' : 'text-gray-800'
                }`}>
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {formatDuration(item.duration)}
                </p>
              </div>

              {/* Feedback Grafico di Stato a destra */}
              <div className="ml-3 flex-shrink-0 w-8 h-8 flex justify-center items-center">
                {isWaiting && (
                  <span className="text-lg opacity-50 grayscale select-none" title="In attesa">⏳</span>
                )}
                {isDownloading && (
                  <svg className="w-6 h-6 text-blue-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                )}
                {isCompleted && (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                )}
                {isError && (
                  <span className="text-lg text-red-500 select-none" title="Errore">❌</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
