import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAllUsersWithEntrances, useAddCredits, useAdminRegisterEntrance, useDeleteEntranceLog, useToggleUserHidden, checkEntranceToday, UserWithEntrances } from '@/hooks/useEntrances';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Waves, LogOut, Users, Euro, Ticket, Plus, ChevronDown, ChevronUp, Search, Minus, Download, CalendarIcon, X, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { exportToCSV, PaymentExportRow, exportUserSummaryToCSV, UserSummaryExportRow } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
function AddCreditsDialog({
  user,
  onSuccess
}: {
  user: UserWithEntrances;
  onSuccess: () => void;
}) {
  const [entrances, setEntrances] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(false);
  const addCredits = useAddCredits();
  const {
    toast
  } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCredits.mutateAsync({
        userId: user.profile.user_id,
        entrances: parseInt(entrances),
        amount: parseFloat(amount),
        notes: notes || undefined
      });
      toast({
        title: 'Ingressi aggiunti!',
        description: `${entrances} ingressi aggiunti a ${user.profile.full_name}`
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
        description: 'Impossibile aggiungere gli ingressi.'
      });
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
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
            <Input id="entrances" type="number" min="1" value={entrances} onChange={e => setEntrances(e.target.value)} placeholder="10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Importo versato (€)</Label>
            <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50.00" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Note (opzionale)</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Es: Abbonamento mensile" />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={addCredits.isPending}>
            {addCredits.isPending ? 'Aggiunta in corso...' : 'Conferma'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>;
}
function UserCard({
  user,
  onUpdate,
  isPresentToday
}: {
  user: UserWithEntrances;
  onUpdate: () => void;
  isPresentToday: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const adminRegisterEntrance = useAdminRegisterEntrance();
  const deleteEntranceLog = useDeleteEntranceLog();
  const toggleUserHidden = useToggleUserHidden();
  const {
    toast
  } = useToast();
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const handleDeductEntrance = async () => {
    try {
      const alreadyToday = await checkEntranceToday(user.profile.user_id);
      if (alreadyToday) {
        setShowDuplicateWarning(true);
        return;
      }
      await adminRegisterEntrance.mutateAsync(user.profile.user_id);
      toast({
        title: 'Ingresso scalato!',
        description: `Ingresso registrato per ${user.profile.full_name}`,
      });
      onUpdate();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile scalare l\'ingresso.',
      });
    }
  };

  const handleForceDeductEntrance = async () => {
    setShowDuplicateWarning(false);
    try {
      await adminRegisterEntrance.mutateAsync(user.profile.user_id);
      toast({
        title: 'Ingresso scalato!',
        description: `Ingresso registrato per ${user.profile.full_name}`,
      });
      onUpdate();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error?.message || 'Impossibile scalare l\'ingresso.',
      });
    }
  };
  const handleDeleteEntrance = async (logId: string) => {
    try {
      await deleteEntranceLog.mutateAsync(logId);
      toast({
        title: 'Ingresso rimosso!',
        description: `Ingresso eliminato per ${user.profile.full_name}`
      });
      onUpdate();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile rimuovere l\'ingresso.'
      });
    }
  };
  const handleToggleHidden = async () => {
    try {
      await toggleUserHidden.mutateAsync({
        profileId: user.profile.id,
        isHidden: !user.profile.is_hidden
      });
      toast({
        title: user.profile.is_hidden ? 'Utente visibile!' : 'Utente nascosto!',
        description: `${user.profile.full_name} è ora ${user.profile.is_hidden ? 'visibile' : 'nascosto'}`
      });
      onUpdate();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile modificare la visibilità.'
      });
    }
  };
  return <Card className={cn("shadow-soft animate-fade-in", user.profile.is_hidden && "opacity-60", isPresentToday && "ring-[3px] ring-accent border-accent shadow-[0_0_15px_hsl(var(--accent)/0.35)]")}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{user.profile.full_name}</CardTitle>
                {user.profile.is_hidden && (
                  <Badge variant="secondary" className="text-xs">
                    <EyeOff className="w-3 h-3 mr-1" /> Nascosto
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                Registrato il {format(new Date(user.profile.created_at), 'dd MMM yyyy', {
                locale: it
              })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDeductEntrance} disabled={adminRegisterEntrance.isPending} title="Scala ingresso">
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
            {expanded ? <>Nascondi dettagli <ChevronUp className="w-4 h-4 ml-2" /></> : <>Mostra dettagli <ChevronDown className="w-4 h-4 ml-2" /></>}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-4 space-y-4">
            {/* Credits History */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Euro className="w-4 h-4" /> Versamenti
              </h4>
              {user.credits.length === 0 ? <p className="text-sm text-muted-foreground">Nessun versamento</p> : <div className="space-y-2 max-h-40 overflow-y-auto">
                  {user.credits.map(credit => <div key={credit.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                      <span>+{credit.entrances_added} ingressi</span>
                      <span className="text-accent font-medium">€{Number(credit.amount_paid).toFixed(2)}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(credit.payment_date), 'dd/MM/yy')}
                      </span>
                    </div>)}
                </div>}
            </div>

            {/* Entrance History */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Ticket className="w-4 h-4" /> Ultimi ingressi
              </h4>
              {user.logs.length === 0 ? <p className="text-sm text-muted-foreground">Nessun ingresso</p> : <div className="space-y-1 max-h-32 overflow-y-auto">
                  {user.logs.slice(0, 5).map(log => <div key={log.id} className="text-sm p-2 bg-muted/50 rounded flex justify-between items-center">
                      <span>Ingresso</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {format(new Date(log.entrance_date), 'dd/MM/yy HH:mm')}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteEntrance(log.id)} disabled={deleteEntranceLog.isPending} title="Rimuovi ingresso">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </div>

            {/* Visibility Toggle */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {user.profile.is_hidden ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm font-medium">Visibilità utente</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {user.profile.is_hidden ? 'Nascosto' : 'Visibile'}
                  </span>
                  <Switch
                    checked={!user.profile.is_hidden}
                    onCheckedChange={handleToggleHidden}
                    disabled={toggleUserHidden.isPending}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ingresso già registrato</AlertDialogTitle>
            <AlertDialogDescription>
              {user.profile.full_name} ha già un ingresso registrato oggi. Vuoi scalarne un altro comunque?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceDeductEntrance}>
              Scala comunque
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>;
}
export function AdminDashboard() {
  const {
    user,
    signOut
  } = useAuth();
  const {
    data: users = [],
    isLoading,
    refetch
  } = useAllUsersWithEntrances();
  const [searchTerm, setSearchTerm] = useState('');
  const [showPresentToday, setShowPresentToday] = useState(false);
  const [presentDate, setPresentDate] = useState<Date>(new Date());
  const [showPresentDatePicker, setShowPresentDatePicker] = useState(false);
  const [showHiddenUsers, setShowHiddenUsers] = useState(false);
  const [incomeStartDate, setIncomeStartDate] = useState<Date | undefined>(() => {
    try {
      const saved = localStorage.getItem('incomeStartDate');
      if (saved) {
        const date = new Date(saved);
        if (!isNaN(date.getTime())) return date;
      }
    } catch (e) {
      // ignore
    }
    return undefined;
  });
  const [incomePopoverOpen, setIncomePopoverOpen] = useState(false);

  useEffect(() => {
    if (incomeStartDate) {
      localStorage.setItem('incomeStartDate', incomeStartDate.toISOString());
    } else {
      localStorage.removeItem('incomeStartDate');
    }
  }, [incomeStartDate]);
  const {
    toast
  } = useToast();
  
  // Filtra utenti per ricerca e visibilità
  const filteredUsers = users
    .filter(u => u.profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(u => showHiddenUsers || !u.profile.is_hidden);
  
  const hiddenUsersCount = users.filter(u => u.profile.is_hidden).length;

  // Utenti presenti nella data selezionata
  const selectedDay = new Date(presentDate);
  selectedDay.setHours(0, 0, 0, 0);
  const isToday = selectedDay.getTime() === (() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t.getTime(); })();
  const usersPresentOnDate = users.filter(u => u.logs.some(log => {
    const logDate = new Date(log.entrance_date);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === selectedDay.getTime();
  }));
  const presentCount = usersPresentOnDate.length;
  const totalEntrances = users.reduce((sum, u) => sum + u.totalEntrances, 0);
  const totalUsed = users.reduce((sum, u) => sum + u.usedEntrances, 0);

  // Calcola il totale incassato filtrato per data di partenza
  const totalPaid = users.reduce((sum, u) => {
    const filteredCredits = incomeStartDate ? u.credits.filter(c => new Date(c.payment_date) >= incomeStartDate) : u.credits;
    return sum + filteredCredits.reduce((cSum, c) => cSum + Number(c.amount_paid), 0);
  }, 0);
  const handleExportPayments = () => {
    const allPayments: PaymentExportRow[] = [];
    users.forEach(user => {
      user.credits.forEach(credit => {
        allPayments.push({
          userName: user.profile.full_name,
          entrancesAdded: credit.entrances_added,
          amountPaid: Number(credit.amount_paid),
          paymentDate: credit.payment_date,
          notes: credit.notes
        });
      });
    });

    // Sort by date descending
    allPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    if (allPayments.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nessun dato',
        description: 'Non ci sono versamenti da esportare.'
      });
      return;
    }
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(allPayments, `versamenti_${dateStr}`);
    toast({
      title: 'Export completato!',
      description: `${allPayments.length} versamenti esportati.`
    });
  };

  const handleExportUserSummary = () => {
    const summaryData: UserSummaryExportRow[] = users
      .filter(u => !u.profile.is_hidden)
      .map(u => ({
        userName: u.profile.full_name,
        totalEntrances: u.totalEntrances,
        usedEntrances: u.usedEntrances,
        remainingEntrances: u.remainingEntrances,
        totalPaid: u.totalPaid,
      }))
      .sort((a, b) => a.userName.localeCompare(b.userName));

    if (summaryData.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nessun dato',
        description: 'Non ci sono utenti da esportare.',
      });
      return;
    }

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    exportUserSummaryToCSV(summaryData, `situazione_utenti_${dateStr}`);
    toast({
      title: 'Export completato!',
      description: `Situazione di ${summaryData.length} utenti esportata.`,
    });
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary shadow-soft">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                <Waves className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl text-primary-foreground font-serif">Pool Manager</h1>
                <p className="text-primary-foreground/80 text-sm">Pannello Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary-foreground/90 text-sm hidden sm:inline">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
                Admin
              </Badge>
              <Button variant="ghost" size="icon" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/20">
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
          <Dialog open={showPresentToday} onOpenChange={(open) => {
              setShowPresentToday(open);
              if (open) setPresentDate(new Date());
            }}>
            <DialogTrigger asChild>
              <Card className="shadow-soft cursor-pointer hover:shadow-elevated transition-shadow">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold">{presentCount}</p>
                  <p className="text-sm text-muted-foreground">Presenti oggi</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isToday ? `Presenti oggi (${presentCount})` : `Presenti il ${format(selectedDay, 'd MMMM yyyy', { locale: it })} (${presentCount})`}
                </DialogTitle>
                <DialogDescription>
                  <Popover open={showPresentDatePicker} onOpenChange={setShowPresentDatePicker}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="mt-2 gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {format(presentDate, 'EEEE d MMMM yyyy', { locale: it })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={presentDate}
                        onSelect={(date) => {
                          if (date) setPresentDate(date);
                          setShowPresentDatePicker(false);
                        }}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        locale={it}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </DialogDescription>
              </DialogHeader>
              {usersPresentOnDate.length === 0 ? <p className="text-center text-muted-foreground py-4">Nessun ingresso registrato{isToday ? ' oggi' : ' in questa data'}</p> : <div className="space-y-2">
                  {usersPresentOnDate.map(u => <div key={u.profile.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{u.profile.full_name}</span>
                      <Badge variant="secondary">
                        {u.logs.filter(log => {
                    const logDate = new Date(log.entrance_date);
                    logDate.setHours(0, 0, 0, 0);
                    return logDate.getTime() === selectedDay.getTime();
                  }).length} ingress{u.logs.filter(log => {
                    const logDate = new Date(log.entrance_date);
                    logDate.setHours(0, 0, 0, 0);
                    return logDate.getTime() === selectedDay.getTime();
                  }).length === 1 ? 'o' : 'i'}
                      </Badge>
                    </div>)}
                </div>}
            </DialogContent>
          </Dialog>
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
          <Popover open={incomePopoverOpen} onOpenChange={setIncomePopoverOpen}>
            <PopoverTrigger asChild>
              <Card className="shadow-soft cursor-pointer hover:shadow-elevated transition-shadow">
                <CardContent className="p-4 text-center">
                  <Euro className="w-8 h-8 mx-auto text-success mb-2" />
                  <p className="text-2xl font-bold">€{totalPaid.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Totale incassato</p>
                  {incomeStartDate && <p className="text-xs text-primary mt-1">
                      dal {format(incomeStartDate, 'dd/MM/yyyy')}
                    </p>}
                </CardContent>
              </Card>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Filtra da data</p>
                  {incomeStartDate && <Button variant="ghost" size="sm" onClick={() => {
                  setIncomeStartDate(undefined);
                  setIncomePopoverOpen(false);
                }} className="h-7 px-2 text-muted-foreground">
                      <X className="w-3 h-3 mr-1" /> Rimuovi
                    </Button>}
                </div>
              </div>
            <Calendar mode="single" selected={incomeStartDate} onSelect={date => {
              setIncomeStartDate(date);
              setIncomePopoverOpen(false);
            }} disabled={date => date > new Date()} initialFocus locale={it} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Search and Export */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca utente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Button onClick={handleExportPayments} variant="outline" className="shrink-0">
            <Download className="w-4 h-4 mr-2" /> Versamenti
          </Button>
          <Button onClick={handleExportUserSummary} variant="outline" className="shrink-0">
            <Download className="w-4 h-4 mr-2" /> Situazione
          </Button>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-sans">Gestione Utenti</h2>
            {hiddenUsersCount > 0 && (
              <Button 
                variant={showHiddenUsers ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setShowHiddenUsers(!showHiddenUsers)}
                className="gap-2"
              >
                {showHiddenUsers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showHiddenUsers ? 'Nascondi archiviati' : `Mostra nascosti (${hiddenUsersCount})`}
              </Button>
            )}
          </div>

          {isLoading ? <div className="text-center py-8 text-muted-foreground">Caricamento...</div> : filteredUsers.length === 0 ? <div className="text-center py-8 text-muted-foreground">Nessun utente trovato</div> : <div className="grid gap-4 md:grid-cols-2">
              {filteredUsers.map(u => <UserCard key={u.profile.id} user={u} onUpdate={() => refetch()} isPresentToday={usersPresentOnDate.some(p => p.profile.id === u.profile.id)} />)}
            </div>}
        </div>
      </main>
    </div>;
}