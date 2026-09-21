import { useAuth } from '@/hooks/useAuth';
import { useRemainingEntrances, useMyEntranceLogs, useMyCredits, useRegisterEntrance, useMyProfile, getMedicalCertificateStatus } from '@/hooks/useEntrances';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Waves, LogOut, Ticket, Calendar, Euro, ChevronDown, ChevronUp, AlertTriangle, Clock, FileText } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
'@/components/ui/alert-dialog';
import { APP_VERSION } from '@/config/version';

export function UserDashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const { data: remainingEntrances = 0, isLoading: loadingEntrances } = useRemainingEntrances();
  const { data: entranceLogs = [] } = useMyEntranceLogs();
  const { data: credits = [] } = useMyCredits();
  const { data: profile } = useMyProfile();
  const registerEntrance = useRegisterEntrance();
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const certStatus = getMedicalCertificateStatus(profile?.medical_certificate_expiry);

  const handleRegisterEntrance = async () => {
    try {
      await registerEntrance.mutateAsync();
      toast({
        title: 'Ingresso registrato!',
        description: 'Buon allenamento! 🏊‍♂️'
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile registrare l\'ingresso.'
      });
    }
  };

  const totalPaid = credits.reduce((sum, c) => sum + Number(c.amount_paid), 0);

  const today = new Date().toISOString().slice(0, 10);
  const hasEnteredToday = entranceLogs.some(
    (log) => log.entrance_date.slice(0, 10) === today
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2 shadow-soft">
                <AppLogo className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-display text-primary-foreground">Pool Manager</h1>
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground text-[10px] px-1.5 py-0 font-mono font-normal">
                    {APP_VERSION}
                  </Badge>
                </div>
                <p className="text-primary-foreground/80 text-sm">Ciao, {user?.user_metadata?.full_name || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin &&
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
                  Admin
                </Badge>
              }
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-primary-foreground hover:bg-primary-foreground/20">
                
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Banner Scadenza Certificato Medico (Avviso non bloccante) */}
        {certStatus.status === 'expired' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/15 border-2 border-destructive text-destructive animate-fade-in shadow-soft">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-base mb-1">Certificato Medico Scaduto</p>
              <p className="leading-relaxed">
                Il tuo certificato medico è scaduto il <strong>{certStatus.formattedDate}</strong> ({Math.abs(certStatus.daysRemaining ?? 0)} {Math.abs(certStatus.daysRemaining ?? 0) === 1 ? 'giorno' : 'giorni'} fa).
                Ricordati di consegnare il certificato rinnovato al tuo istruttore o in segreteria per essere in regola con gli allenamenti.
              </p>
            </div>
          </div>
        )}

        {certStatus.status === 'expiring' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/70 text-amber-900 dark:text-amber-200 animate-fade-in shadow-soft">
            <Clock className="w-6 h-6 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-base mb-1 text-amber-800 dark:text-amber-300">Certificato Medico in Scadenza</p>
              <p className="leading-relaxed">
                Il tuo certificato medico scadrà tra <strong>{certStatus.daysRemaining} {certStatus.daysRemaining === 1 ? 'giorno' : 'giorni'}</strong> (il <strong>{certStatus.formattedDate}</strong>).
                Prenota per tempo la visita di rinnovo!
              </p>
            </div>
          </div>
        )}

        {/* Remaining Entrances Card */}
        <Card className="shadow-card overflow-hidden">
          <div className={`p-6 text-center ${remainingEntrances < 0 ? 'bg-destructive' : 'bg-gradient-primary'}`}>
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 animate-wave ${remainingEntrances < 0 ? 'bg-destructive-foreground/20' : 'bg-primary-foreground/20'}`}>
              <Ticket className={`w-10 h-10 ${remainingEntrances < 0 ? 'text-destructive-foreground' : 'text-primary-foreground'}`} />
            </div>
            <h2 className={`text-6xl font-bold mb-2 ${remainingEntrances < 0 ? 'text-destructive-foreground' : 'text-primary-foreground'}`}>
              {loadingEntrances ? '...' : remainingEntrances}
            </h2>
            <p className={`text-lg ${remainingEntrances < 0 ? 'text-destructive-foreground/80' : 'text-primary-foreground/80'}`}>Ingressi rimanenti</p>
          </div>
          <CardContent className="p-6 space-y-3">
            {hasEnteredToday ?
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/15 border border-accent text-accent-foreground">
                <Ticket className="w-5 h-5 text-accent" />
                <p className="text-sm font-medium text-secondary-foreground">Ingresso registrato oggi</p>
              </div> :
            null}
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={registerEntrance.isPending}
              className="w-full h-14 text-lg bg-gradient-primary shadow-soft hover:shadow-elevated transition-all">
              
              {registerEntrance.isPending ? 'Registrazione...' : '🏊‍♂️ Registra Ingresso'}
            </Button>
            
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conferma ingresso</AlertDialogTitle>
                  <AlertDialogDescription>
                    Stai per registrare un ingresso in piscina. 
                    {remainingEntrances <= 0 &&
                    <span className="block mt-2 text-destructive font-medium">
                        ⚠️ Attenzione: il tuo saldo andrà in negativo!
                      </span>
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRegisterEntrance}>
                    Conferma
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {remainingEntrances < 0 &&
            <p className="text-center text-destructive mt-3 text-sm font-medium">
                ⚠️ Attenzione: hai {Math.abs(remainingEntrances)} ingress{Math.abs(remainingEntrances) === 1 ? 'o' : 'i'} in debito. Contatta l'amministratore.
              </p>
            }
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-soft">
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{entranceLogs.length}</p>
              <p className="text-sm text-muted-foreground">Ingressi totali</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-4 text-center">
              <Euro className="w-8 h-8 mx-auto text-accent mb-2" />
              <p className="text-2xl font-bold text-foreground">€{totalPaid.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Totale versato</p>
            </CardContent>
          </Card>
        </div>

        {/* Medical Certificate Info Card */}
        <Card className="shadow-soft">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                certStatus.status === 'valid' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                certStatus.status === 'expiring' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                certStatus.status === 'expired' ? 'bg-destructive/15 text-destructive' :
                'bg-muted text-muted-foreground'
              }`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Certificato Medico</p>
                <p className="text-sm font-semibold">
                  {certStatus.formattedDate ? `Scadenza: ${certStatus.formattedDate}` : 'Data non impostata'}
                </p>
              </div>
            </div>
            <Badge variant={
              certStatus.status === 'valid' ? 'default' :
              certStatus.status === 'expiring' ? 'outline' :
              certStatus.status === 'expired' ? 'destructive' :
              'secondary'
            } className={
              certStatus.status === 'valid' ? 'bg-emerald-600 hover:bg-emerald-600 text-white' :
              certStatus.status === 'expiring' ? 'border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium' :
              undefined
            }>
              {certStatus.status === 'valid' ? 'In regola' :
               certStatus.status === 'expiring' ? `Scade tra ${certStatus.daysRemaining} gg` :
               certStatus.status === 'expired' ? 'Scaduto' :
               'Da verificare'}
            </Badge>
          </CardContent>
        </Card>

        {/* Entrance History */}
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <Card className="shadow-soft">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Storico Ingressi</CardTitle>
                    <CardDescription>I tuoi ultimi ingressi in piscina</CardDescription>
                  </div>
                  {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {entranceLogs.length === 0 ?
                <p className="text-center text-muted-foreground py-4">Nessun ingresso registrato</p> :

                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {entranceLogs.slice(0, 10).map((log) =>
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Waves className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">Ingresso in piscina</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.entrance_date), 'dd MMM yyyy, HH:mm', { locale: it })}
                        </span>
                      </div>
                  )}
                  </div>
                }
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Credits History */}
        <Collapsible open={showCredits} onOpenChange={setShowCredits}>
          <Card className="shadow-soft">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Storico Versamenti</CardTitle>
                    <CardDescription>I tuoi acquisti di ingressi</CardDescription>
                  </div>
                  {showCredits ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {credits.length === 0 ?
                <p className="text-center text-muted-foreground py-4">Nessun versamento registrato</p> :

                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {credits.map((credit) =>
                  <div
                    key={credit.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                            <Ticket className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <span className="font-medium">+{credit.entrances_added} ingressi</span>
                            {credit.notes &&
                        <p className="text-xs text-muted-foreground">{credit.notes}</p>
                        }
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-accent">€{Number(credit.amount_paid).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(credit.payment_date), 'dd/MM/yyyy', { locale: it })}
                          </p>
                        </div>
                      </div>
                  )}
                  </div>
                }
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <footer className="text-center py-6 text-xs text-muted-foreground border-t mt-8">
          Pool Manager <span className="font-mono">{APP_VERSION}</span> • Apnea PR
        </footer>
      </main>
    </div>);

}