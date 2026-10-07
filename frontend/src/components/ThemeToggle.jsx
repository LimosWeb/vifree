export default function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="flex space-x-2 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200">
      <button
        onClick={() => setTheme('video')}
        className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
          theme === 'video'
            ? 'bg-blue-600 text-white shadow-md scale-105'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        Video
      </button>
      <button
        onClick={() => setTheme('musica')}
        className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
          theme === 'musica'
            ? 'bg-cyan-500 text-white shadow-md scale-105'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        Musica
      </button>
    </div>
  )
}
