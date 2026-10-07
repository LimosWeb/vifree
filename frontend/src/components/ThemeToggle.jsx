export default function ThemeToggle({ theme, setTheme }) {
  const handleThemeChange = (newTheme) => {
    if ('vibrate' in navigator) navigator.vibrate(50);
    setTheme(newTheme);
  };

  return (
    <div className="flex space-x-2 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200">
      <button
        onClick={() => handleThemeChange('video')}
        className={`px-6 py-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl font-semibold transition-all duration-300 active:scale-[0.98] ${
          theme === 'video'
            ? 'bg-theme-primary-video text-white shadow-md scale-105'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        Video
      </button>
      <button
        onClick={() => handleThemeChange('musica')}
        className={`px-6 py-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl font-semibold transition-all duration-300 active:scale-[0.98] ${
          theme === 'musica'
            ? 'bg-theme-primary-music text-white shadow-md scale-105'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        Musica
      </button>
    </div>
  )
}
