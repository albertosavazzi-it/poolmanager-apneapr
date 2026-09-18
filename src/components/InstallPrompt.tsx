import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Share } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Detect iOS Safari
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

const isInStandaloneMode = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const wasDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Check if already installed
    if (isInStandaloneMode()) {
      setShowPrompt(false);
      return;
    }

    // Check if iOS
    if (isIOS()) {
      setIsIOSDevice(true);
      setShowPrompt(true);
      return;
    }

    // For other browsers that support beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-scale-in md:left-auto md:right-4 md:w-96">
      <Card className="shadow-elevated glass-effect border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-soft">
                <AppLogo className="w-7 h-7" />
              </div>
              <div>
                <CardTitle className="text-lg">Installa Pool Manager</CardTitle>
                <CardDescription className="text-sm">
                  Aggiungi l'app alla schermata home
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {isIOSDevice ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Per installare l'app su iOS:
              </p>
              <ol className="text-sm text-muted-foreground mb-4 space-y-2 list-decimal list-inside">
                <li className="flex items-start gap-2">
                  <span>Tocca l'icona</span>
                  <Share className="w-4 h-4 inline text-primary flex-shrink-0 mt-0.5" />
                  <span>in basso</span>
                </li>
                <li>Scorri e tocca <strong>"Aggiungi a Home"</strong></li>
                <li>Conferma toccando <strong>"Aggiungi"</strong></li>
              </ol>
              <Button 
                variant="outline" 
                onClick={handleDismiss}
                className="w-full"
              >
                Ho capito
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Installa l'app per accedere rapidamente e usarla anche offline.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleInstall} 
                  className="flex-1 bg-gradient-primary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Installa
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDismiss}
                >
                  Non ora
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
