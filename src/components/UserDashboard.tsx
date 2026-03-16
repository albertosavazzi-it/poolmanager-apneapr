import { useAuth } from '@/hooks/useAuth';
import { useRemainingEntrances, useMyEntranceLogs, useMyCredits, useRegisterEntrance } from '@/hooks/useEntrances';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Waves, LogOut, Ticket, Calendar, Euro, ChevronDown, ChevronUp } from 'lucide-react';
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

export function UserDashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const { data: remainingEntrances = 0, isLoading: loadingEntrances } = useRemainingEntrances();
  const { data: entranceLogs = [] } = useMyEntranceLogs();
  const { data: credits = [] } = useMyCredits();
  const registerEntrance = useRegisterEntrance();
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
              <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                <Waves className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-display text-primary-foreground">Pool Manager</h1>
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
                <DoorOpen className="w-5 h-5 text-accent" />
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
      </main>
    </div>);

}