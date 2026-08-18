import { Download, Smartphone, Monitor, Globe, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function InstallPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Install Expenditrack</h1>
        <p className="text-muted-foreground text-lg">
          Get the app on any device — web, mobile, or desktop
        </p>
      </div>

      {/* Installation Options Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* PWA Option */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="size-5" />
                  Web App (PWA)
                </CardTitle>
                <CardDescription>Browser-based, works everywhere</CardDescription>
              </div>
              <CheckCircle2 className="size-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm space-y-2">
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                <span>No download needed</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                <span>Works offline</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                <span>Auto-updates</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                <span>Install on home screen</span>
              </li>
            </ul>
            <Button className="w-full gap-2" variant="default">
              <Download className="size-4" />
              Already Using
            </Button>
            <p className="text-xs text-muted-foreground">
              Look for "Install" button in your browser
            </p>
          </CardContent>
        </Card>

        {/* Mobile Option */}
        <Card className="border-2">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="size-5" />
                Mobile App
              </CardTitle>
              <CardDescription>iOS & Android native apps</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm space-y-2">
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>Native performance</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>App Store/Play Store</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>Push notifications</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>Offline sync</span>
              </li>
            </ul>
            <Button className="w-full gap-2" variant="outline" disabled>
              <Download className="size-4" />
              Coming Soon
            </Button>
            <p className="text-xs text-muted-foreground">
              Available in Q1 2025
            </p>
          </CardContent>
        </Card>

        {/* Desktop Option */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="size-5" />
                Desktop App
              </CardTitle>
              <CardDescription>Windows, macOS, Linux</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm space-y-2">
              <li className="flex gap-2">
                <span className="text-purple-600">✓</span>
                <span>Native window frame</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600">✓</span>
                <span>Keyboard shortcuts</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600">✓</span>
                <span>System menu bar</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600">✓</span>
                <span>Auto-updates</span>
              </li>
            </ul>
            <Button className="w-full gap-2" variant="default">
              Download
              <ArrowRight className="size-4" />
            </Button>
            <p className="text-xs text-muted-foreground">
              ~150MB installer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Downloads Section */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle>Download Desktop Installers</CardTitle>
          <CardDescription>Choose your operating system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              className="gap-2"
              onClick={() => window.location.href = 'https://github.com/mudineer-del/Expenditrack1/releases/download/latest/Expenditrack-Setup.exe'}
            >
              <Download className="size-4" />
              Windows (EXE)
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.location.href = 'https://github.com/mudineer-del/Expenditrack1/releases/download/latest/Expenditrack.dmg'}
            >
              <Download className="size-4" />
              macOS (DMG)
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.location.href = 'https://github.com/mudineer-del/Expenditrack1/releases/download/latest/expenditrack_amd64.deb'}
            >
              <Download className="size-4" />
              Linux (DEB)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Installation Instructions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Windows Installation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="space-y-1 list-decimal pl-4 text-muted-foreground">
              <li>Download the EXE file</li>
              <li>Run the installer</li>
              <li>Follow setup wizard</li>
              <li>Launch from Start Menu</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">macOS Installation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="space-y-1 list-decimal pl-4 text-muted-foreground">
              <li>Download the DMG file</li>
              <li>Open DMG file</li>
              <li>Drag to Applications</li>
              <li>Open from Applications</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linux Installation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="space-y-1 list-decimal pl-4 text-muted-foreground">
              <li>Download DEB file</li>
              <li>Run: <code className="bg-muted px-1 text-xs">sudo apt install *.deb</code></li>
              <li>Launch from menu</li>
              <li>Or run: <code className="bg-muted px-1 text-xs">expenditrack</code></li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Alert>
        <div className="flex gap-3">
          <CheckCircle2 className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
          <AlertDescription>
            <strong>Recommended:</strong> Start with the PWA (web app). Install on your home screen for quick access. It works offline and auto-updates!
          </AlertDescription>
        </div>
      </Alert>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Feature</th>
                  <th className="text-center py-2 px-2">PWA</th>
                  <th className="text-center py-2 px-2">Desktop</th>
                  <th className="text-center py-2 px-2">Mobile</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 px-2">Offline Support</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓</td>
                </tr>
                <tr>
                  <td className="py-2 px-2">Auto-Updates</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓</td>
                </tr>
                <tr>
                  <td className="py-2 px-2">Native Feel</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓✓</td>
                  <td className="text-center">✓✓</td>
                </tr>
                <tr>
                  <td className="py-2 px-2">No Installation</td>
                  <td className="text-center">✓✓</td>
                  <td className="text-center">—</td>
                  <td className="text-center">—</td>
                </tr>
                <tr>
                  <td className="py-2 px-2">Keyboard Shortcuts</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓✓</td>
                  <td className="text-center">✓</td>
                </tr>
                <tr>
                  <td className="py-2 px-2">Push Notifications</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">✓✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
