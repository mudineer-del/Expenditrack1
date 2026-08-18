import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setIsVisible(false)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice

    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setIsVisible(false)
      setIsInstalled(true)
    }
  }

  // Don't show if already installed or not available
  if (isInstalled || !isVisible || !installPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-xs animate-in slide-in-from-bottom-4">
      <div className="rounded-lg border bg-card shadow-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm mb-1">Install Expenditrack</h3>
            <p className="text-xs text-muted-foreground">
              Install as an app to access offline and get quick shortcuts on your home screen.
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-muted-foreground hover:text-foreground mt-1"
            title="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={handleInstall}
            className="flex-1 gap-2"
          >
            <Download className="size-4" />
            Install
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsVisible(false)}
            className="flex-1"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  )
}
