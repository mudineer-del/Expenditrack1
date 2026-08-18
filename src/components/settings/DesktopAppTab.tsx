import { Download, Monitor, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function DesktopAppTab() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true

  // Build installer URL - can be hosted on GitHub Releases or CDN
  const buildUrl = (filename: string) => {
    // In production, update this to point to your release server
    return `https://github.com/mudineer-del/Expenditrack1/releases/download/latest/${filename}`
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Monitor className="size-5 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <CardTitle className="text-lg">Install as Desktop App</CardTitle>
              <CardDescription>
                Get a native desktop application for Windows, macOS, and Linux
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download and install Expenditrack as a standalone desktop application. Get the native experience with:
          </p>
          <ul className="text-sm space-y-2 pl-4">
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span> Native window frame and menu bar
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span> Keyboard shortcuts (Ctrl+N for new invoice)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span> Automatic updates
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span> Works offline
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span> All system integrations
            </li>
          </ul>

          <div className="pt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                className="gap-2"
                onClick={() => window.location.href = buildUrl('Expenditrack-Setup.exe')}
              >
                <Download className="size-4" />
                Windows EXE (64-bit)
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.location.href = buildUrl('Expenditrack.dmg')}
              >
                <Download className="size-4" />
                macOS DMG
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.location.href = buildUrl('expenditrack_amd64.deb')}
            >
              <Download className="size-4" />
              Linux DEB
            </Button>
          </div>

          <div className="pt-2 text-xs text-muted-foreground border-t">
            <p>
              <strong>File sizes:</strong> ~150MB (Windows), ~200MB (macOS), ~120MB (Linux)
            </p>
            <p className="mt-1">
              <strong>Latest version:</strong> 1.0.0
            </p>
          </div>
        </CardContent>
      </Card>

      {isStandalone && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            You're already using Expenditrack as an installed app! For a more native desktop experience with additional features, download the desktop version above.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Installation Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Windows:</h4>
            <ol className="space-y-1 pl-4 text-muted-foreground list-decimal">
              <li>Download the EXE installer</li>
              <li>Run the installer</li>
              <li>Follow the setup wizard</li>
              <li>Launch from Start Menu or desktop shortcut</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">macOS:</h4>
            <ol className="space-y-1 pl-4 text-muted-foreground list-decimal">
              <li>Download the DMG file</li>
              <li>Open the DMG file</li>
              <li>Drag Expenditrack to Applications folder</li>
              <li>Open from Applications (first run may need security approval)</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Linux:</h4>
            <ol className="space-y-1 pl-4 text-muted-foreground list-decimal">
              <li>Download the DEB file</li>
              <li>Install with: <code className="bg-muted px-1 rounded text-xs">sudo apt install ./expenditrack_amd64.deb</code></li>
              <li>Launch from application menu or terminal</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          <strong>First time?</strong> Start with the PWA version (top right corner, "Install" button).
          Desktop app is for power users who want additional features.
        </AlertDescription>
      </Alert>
    </div>
  )
}
