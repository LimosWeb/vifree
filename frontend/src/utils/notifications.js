export async function requestNotificationPermission() {
  // Verifica se il browser supporta le notifiche
  if (!('Notification' in window)) {
    console.warn('Questo browser non supporta le notifiche desktop.');
    return false;
  }

  // Se il permesso è già stato concesso
  if (Notification.permission === 'granted') {
    return true;
  }

  // Se non è stato esplicitamente negato, chiediamo il permesso
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.error('Errore durante la richiesta permessi notifiche:', e);
      return false;
    }
  }

  return false;
}

export function showDownloadCompleteNotification(title) {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    const notification = new Notification('Vifree', {
      body: `Download di "${title}" completato!`,
      icon: '/vite.svg', // Icona di default
      vibrate: [200, 100, 200]
    });

    // Rende la notifica cliccabile per tornare all'app
    notification.onclick = function() {
      window.focus();
      this.close();
    };
  }
}
