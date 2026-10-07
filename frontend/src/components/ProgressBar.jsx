export default function ProgressBar({ progressData }) {
  if (!progressData) return null;

  const { status, progress, speed, total_size, eta } = progressData;
  const isCompleted = status === 'completed';

  // Calcoliamo i MB scaricati estraendo il numero da total_size (es. "45.00 MB" -> 45.00)
  let totalNum = parseFloat(total_size);
  if (isNaN(totalNum)) totalNum = 0;

  const downloadedStr = totalNum ? ((totalNum * progress) / 100).toFixed(2) : '0.00';
  const totalStr = totalNum ? totalNum.toFixed(2) : '0.00';

  return (
    <div className="w-full mt-6 space-y-3 animate-fade-in">
      {/* Header Barra */}
      <div className="flex justify-between items-center text-sm font-semibold">
        <span className="flex items-center space-x-2">
          {isCompleted ? (
            <>
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-green-600 font-bold">Download Completato!</span>
            </>
          ) : (
            <span className="text-gray-700">In download...</span>
          )}
        </span>
        <span className={isCompleted ? 'text-green-600' : 'text-blue-600'}>
          {Math.round(progress)}%
        </span>
      </div>

      {/* Contenitore Barra Fisica */}
      <div className="w-full bg-gray-200 rounded-full h-3.5 overflow-hidden shadow-inner">
        <div 
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isCompleted 
              ? 'bg-gradient-to-r from-green-400 to-green-500' 
              : 'bg-gradient-to-r from-blue-400 to-blue-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Statistiche Footer */}
      {!isCompleted && (
        <div className="flex justify-between text-xs sm:text-sm text-gray-500 font-medium">
          <span>{downloadedStr} / {totalStr} MB</span>
          <div className="flex space-x-4">
            <span className="text-blue-600">{speed || 'Calcolo...'}</span>
            <span className="bg-gray-100 px-2 rounded text-gray-600 border border-gray-200 shadow-sm">
              ETA: {eta ? `${eta}s` : '...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
