import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAllUsersWithEntrances, useAddCredits, useAdminRegisterEntrance, UserWithEntrances } from '@/hooks/useEntrances';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Waves, LogOut, Users, Euro, Ticket, Plus, ChevronDown, ChevronUp, Search, Minus, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { exportToCSV, PaymentExportRow } from '@/lib/exportUtils';

function AddCreditsDialog({ user, onSuccess }: { user: UserWithEntrances; onSuccess: () => void }) {
  const [entrances, setEntrances] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(false);
  const addCredits = useAddCredits();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addCredits.mutateAsync({
        userId: user.profile.user_id,
        entrances: parseInt(entrances),
        amount: parseFloat(amount),
        notes: notes || undefined,
      });

      toast({
        title: 'Ingressi aggiunti!',
        description: `${entrances} ingressi aggiunti a ${user.profile.full_name}`,
      });

      setEntrances('');
      setAmount('');
      setNotes('');
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile aggiungere gli ingressi.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-primary">
          <Plus className="w-4 h-4 mr-1" /> Aggiungi
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi Ingressi</DialogTitle>
          <DialogDescription>
            Aggiungi ingressi per {user.profile.full_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entrances">Numero ingressi</Label>
            <Input
              id="entrances"
              type="number"
              min="1"
              value={entrances}
              onChange={(e) => setEntrances(e.target.value)}
              placeholder="10"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Importo versato (€)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Note (opzionale)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es: Abbonamento mensile"
            />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={addCredits.isPending}>
            {addCredits.isPending ? 'Aggiunta in corso...' : 'Conferma'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserCard({ user, onUpdate }: { user: UserWithEntrances; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const adminRegisterEntrance = useAdminRegisterEntrance();
  const { toast } = useToast();

  const handleDeductEntrance = async () => {
    try {
      await adminRegisterEntrance.mutateAsync(user.profile.user_id);
      toast({
        title: 'Ingresso scalato!',
        description: `Ingresso registrato per ${user.profile.full_name}`,
      });
      onUpdate();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile scalare l\'ingresso.',
      });
    }
  };

  return (
    <Card className="shadow-soft animate-fade-in">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{user.profile.full_name}</CardTitle>
              <CardDescription className="mt-1">
                Registrato il {format(new Date(user.profile.created_at), 'dd MMM yyyy', { locale: it })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleDeductEntrance}
                disabled={adminRegisterEntrance.isPending}
                title="Scala ingresso"
              >
                <Minus className="w-4 h-4 mr-1" /> Scala
              </Button>
              <AddCreditsDialog user={user} onSuccess={onUpdate} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className={`text-center p-3 rounded-lg ${user.remainingEntrances < 0 ? 'bg-destructive/10' : 'bg-secondary'}`}>
              <p className={`text-2xl font-bold ${user.remainingEntrances < 0 ? 'text-destructive' : 'text-primary'}`}>{user.remainingEntrances}</p>
              <p className="text-xs text-muted-foreground">Rimanenti</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{user.usedEntrances}</p>
              <p className="text-xs text-muted-foreground">Utilizzati</p>
            </div>
            <div className="text-center p-3 bg-accent/10 rounded-lg">
              <p className="text-2xl font-bold text-accent">€{user.totalPaid.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Versato</p>
            </div>
          </div>
        </CardHeader>

        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full rounded-none border-t">
            {expanded ? (
              <>Nascondi dettagli <ChevronUp className="w-4 h-4 ml-2" /></>
            ) : (
              <>Mostra dettagli <ChevronDown className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-4 space-y-4">
            {/* Credits History */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Euro className="w-4 h-4" /> Versamenti
              </h4>
              {user.credits.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun versamento</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {user.credits.map((credit) => (
                    <div key={credit.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                      <span>+{credit.entrances_added} ingressi</span>
                      <span className="text-accent font-medium">€{Number(credit.amount_paid).toFixed(2)}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(credit.payment_date), 'dd/MM/yy')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Entrance History */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Ticket className="w-4 h-4" /> Ultimi ingressi
              </h4>
              {user.logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun ingresso</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {user.logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="text-sm p-2 bg-muted/50 rounded flex justify-between">
                      <span>Ingresso</span>
                      <span className="text-muted-foreground">
                        {format(new Date(log.entrance_date), 'dd/MM/yy HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function AdminDashboard() {
  const { user, signOut } = useAuth();
  const { data: users = [], isLoading, refetch } = useAllUsersWithEntrances();
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredUsers = users.filter((u) =>
    u.profile.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = users.length;
  const totalEntrances = users.reduce((sum, u) => sum + u.totalEntrances, 0);
  const totalPaid = users.reduce((sum, u) => sum + u.totalPaid, 0);
  const totalUsed = users.reduce((sum, u) => sum + u.usedEntrances, 0);

  const handleExportPayments = () => {
    const allPayments: PaymentExportRow[] = [];
    
    users.forEach(user => {
      user.credits.forEach(credit => {
        allPayments.push({
          userName: user.profile.full_name,
          entrancesAdded: credit.entrances_added,
          amountPaid: Number(credit.amount_paid),
          paymentDate: credit.payment_date,
          notes: credit.notes,
        });
      });
    });

    // Sort by date descending
    allPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    if (allPayments.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nessun dato',
        description: 'Non ci sono versamenti da esportare.',
      });
      return;
    }

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(allPayments, `versamenti_${dateStr}`);
    
    toast({
      title: 'Export completato!',
      description: `${allPayments.length} versamenti esportati.`,
    });
  };

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
                <p className="text-primary-foreground/80 text-sm">Pannello Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
                Admin
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-soft">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-sm text-muted-foreground">Utenti</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-4 text-center">
              <Ticket className="w-8 h-8 mx-auto text-accent mb-2" />
              <p className="text-2xl font-bold">{totalEntrances}</p>
              <p className="text-sm text-muted-foreground">Ingressi totali</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-4 text-center">
              <Waves className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{totalUsed}</p>
              <p className="text-sm text-muted-foreground">Ingressi usati</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-4 text-center">
              <Euro className="w-8 h-8 mx-auto text-success mb-2" />
              <p className="text-2xl font-bold">€{totalPaid.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">Totale incassato</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Export */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca utente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleExportPayments} variant="outline" className="shrink-0">
            <Download className="w-4 h-4 mr-2" /> Esporta CSV
          </Button>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          <h2 className="text-xl font-display">Gestione Utenti</h2>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nessun utente trovato</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredUsers.map((u) => (
                <UserCard key={u.profile.id} user={u} onUpdate={() => refetch()} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
