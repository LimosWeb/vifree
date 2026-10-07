import { useEffect, useState } from 'react';

export default function Toast({ message, show, onClose, duration = 3000 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [render, setRender] = useState(false);

  useEffect(() => {
    let showTimer;
    let hideTimer;
    let unmountTimer;

    if (show) {
      setRender(true);
      // Leggero delay per permettere il mounting iniziale del DOM prima di animare
      showTimer = setTimeout(() => setIsVisible(true), 50);
      
      // Timer per avviare la chiusura (fade-out)
      hideTimer = setTimeout(() => {
        setIsVisible(false);
        // Attendiamo la fine della transizione prima di smontare il componente dal DOM
        unmountTimer = setTimeout(() => {
          setRender(false);
          if (onClose) onClose();
        }, 300);
      }, duration);
    } else {
      setIsVisible(false);
      unmountTimer = setTimeout(() => {
        setRender(false);
      }, 300);
    }

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);
    };
  }, [show, duration, onClose]);

  if (!render) return null;

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
      }`}
    >
      <div className="bg-gray-900/95 text-white px-6 py-3.5 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex items-center justify-center space-x-3 text-[15px] font-medium border border-gray-700/50 backdrop-blur-md">
        <span>{message}</span>
      </div>
    </div>
  );
}
