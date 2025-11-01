/**
 * Service Worker Registration
 * Handles PWA service worker lifecycle
 */

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    // Import PWA register dynamically
    import('virtual:pwa-register').then((module) => {
      const { registerSW } = module
      const updateSW = registerSW({
        onNeedRefresh() {
          // Show update notification to user
          if (confirm('New content available. Reload to update?')) {
            updateSW(true)
          }
        },
        onOfflineReady() {
          console.log('App ready to work offline')
          // Show offline ready notification
          showNotification('App is ready to work offline')
        },
        onRegistered(registration: ServiceWorkerRegistration | undefined) {
          console.log('Service Worker registered:', registration)
          
          // Check for updates every hour (only in production)
          if (registration && import.meta.env.PROD) {
            setInterval(() => {
              registration.update()
            }, 60 * 60 * 1000)
          }
        },
        onRegisterError(error: Error) {
          console.error('Service Worker registration error:', error)
        }
      })
    }).catch((error) => {
      console.log('PWA registration failed:', error)
    })
  } else {
    console.log('Service Worker not supported')
  }
}

function showNotification(message: string): void {
  // Create a simple notification
  const notification = document.createElement('div')
  notification.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
  notification.textContent = message
  document.body.appendChild(notification)

  // Remove after 5 seconds
  setTimeout(() => {
    notification.remove()
  }, 5000)
}

/**
 * Unregister service worker (for development)
 */
export async function unregisterServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) {
      await registration.unregister()
    }
    console.log('Service Worker unregistered')
  }
}

/**
 * Check if service worker is supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator
}

/**
 * Get service worker registration status
 */
export async function getServiceWorkerStatus(): Promise<{
  registered: boolean
  active: boolean
  waiting: boolean
}> {
  if (!isServiceWorkerSupported()) {
    return { registered: false, active: false, waiting: false }
  }

  const registration = await navigator.serviceWorker.getRegistration()
  
  return {
    registered: !!registration,
    active: !!registration?.active,
    waiting: !!registration?.waiting
  }
}
