import { useState, useMemo } from 'react';
import { useExpenses, useAddExpense, useDeleteExpense, ExpenseCategory, Expense } from '@/hooks/useExpenses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Euro, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  Plus, 
  CalendarIcon, 
  Trash2, 
  Search, 
  Download, 
  Building2, 
  UserCheck, 
  Dumbbell, 
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { exportExpensesToCSV, ExpenseExportRow } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';

interface ExpensesManagerProps {
  totalIncome: number;
  onExportPayments?: () => void;
  onExportUserSummary?: () => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; colorClass: string }> = {
  piscina: {
    label: 'Affitto Piscina / Corsie',
    icon: Building2,
    colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  compensi_istruttori: {
    label: 'Compensi Istruttori',
    icon: UserCheck,
    colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  attrezzatura: {
    label: 'Attrezzatura e Materiale',
    icon: Dumbbell,
    colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  altro: {
    label: 'Altro / Spese Varie',
    icon: Receipt,
    colorClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
};

export function ExpensesManager({ 
  totalIncome, 
  onExportPayments, 
  onExportUserSummary 
}: ExpensesManagerProps) {
  const { data: expenses = [], isLoading } = useExpenses();
  const addExpenseMutation = useAddExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const { toast } = useToast();

  // Dialog State
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('piscina');
  const [beneficiary, setBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bonifico');
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Delete State
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Totals calculations
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  }, [expenses]);

  const netBalance = totalIncome - totalExpenses;

  // Breakdown by category
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {
      piscina: 0,
      compensi_istruttori: 0,
      attrezzatura: 0,
      altro: 0,
    };
    expenses.forEach((e) => {
      const cat = e.category in breakdown ? e.category : 'altro';
      breakdown[cat] += Number(e.amount);
    });
    return breakdown;
  }, [expenses]);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.beneficiary && e.beneficiary.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Importo non valido',
        description: "L'importo deve essere un numero positivo.",
      });
      return;
    }

    try {
      await addExpenseMutation.mutateAsync({
        title,
        category,
        beneficiary: beneficiary.trim() || undefined,
        amount: numAmount,
        expense_date: format(expenseDate, 'yyyy-MM-dd'),
        payment_method: paymentMethod || undefined,
        notes: notes.trim() || undefined,
      });

      toast({
        title: 'Spesa registrata!',
        description: `Spesa "${title}" di €${numAmount.toFixed(2)} aggiunta con successo.`,
      });

      // Reset form
      setTitle('');
      setCategory('piscina');
      setBeneficiary('');
      setAmount('');
      setPaymentMethod('Bonifico');
      setExpenseDate(new Date());
      setNotes('');
      setOpenAddDialog(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: err.message || 'Impossibile salvare la spesa.',
      });
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpenseMutation.mutateAsync(expenseToDelete.id);
      toast({
        title: 'Spesa eliminata',
        description: `La spesa "${expenseToDelete.title}" è stata rimossa.`,
      });
      setExpenseToDelete(null);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile eliminare la spesa.',
      });
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nessun dato',
        description: 'Non ci sono spese registrate da esportare.',
      });
      return;
    }

    const rows: ExpenseExportRow[] = filteredExpenses.map((exp) => ({
      date: exp.expense_date,
      category: CATEGORY_CONFIG[exp.category]?.label || exp.category,
      title: exp.title,
      beneficiary: exp.beneficiary,
      amount: exp.amount,
      paymentMethod: exp.payment_method,
      notes: exp.notes,
    }));

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    exportExpensesToCSV(rows, `registro_uscite_${dateStr}`);

    toast({
      title: 'Export completato',
      description: `${rows.length} spese esportate con successo in formato CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards: Incassi, Uscite, Saldo Cassa */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Entrate */}
        <Card className="shadow-soft border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/40 to-background dark:from-emerald-950/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Totale Incassato</p>
              <p className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                €{totalIncome.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Da versamenti quote utenti
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Euro className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Uscite */}
        <Card className="shadow-soft border-l-4 border-l-rose-500 bg-gradient-to-br from-rose-50/40 to-background dark:from-rose-950/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Totale Uscite</p>
              <p className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                €{totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                {expenses.length} spesa{expenses.length === 1 ? '' : 'e'} registrat{expenses.length === 1 ? 'a' : 'e'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Saldo Cassa */}
        <Card className={cn(
          "shadow-soft border-l-4 bg-gradient-to-br from-background to-muted/30",
          netBalance >= 0 
            ? "border-l-primary" 
            : "border-l-amber-500"
        )}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Disponibilità in Cassa</p>
              <p className={cn(
                "text-3xl font-bold tracking-tight mt-1",
                netBalance >= 0 ? "text-primary font-serif" : "text-amber-600 dark:text-amber-400"
              )}>
                €{netBalance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                {netBalance >= 0 ? 'Fondo cassa attivo' : 'Attenzione: saldo negativo'}
              </p>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              netBalance >= 0 
                ? "bg-primary/10 text-primary" 
                : "bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
            )}>
              <Wallet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ripartizione Spese per Categoria (Pillole / Mini-card) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const sum = categoryBreakdown[key] || 0;
          return (
            <div
              key={key}
              onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)}
              className={cn(
                "p-3 rounded-xl border bg-card/60 transition-all cursor-pointer select-none",
                categoryFilter === key 
                  ? "ring-2 ring-primary border-primary bg-primary/5" 
                  : "hover:bg-muted/50 border-border/80"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground truncate">{config.label}</span>
              </div>
              <p className="text-lg font-bold">
                €{sum.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actions & Filters Bar */}
      <Card className="shadow-soft">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-serif">Registro Spese & Uscite</CardTitle>
              <CardDescription>
                Traccia pagamenti piscina, compensi istruttori e altre spese del fondo cassa.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onExportPayments && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportPayments}
                  className="gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Versamenti
                </Button>
              )}

              {onExportUserSummary && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportUserSummary}
                  className="gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Situazione
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5"
                disabled={filteredExpenses.length === 0}
              >
                <Download className="w-4 h-4" />
                Spese
              </Button>

              <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-primary gap-1.5 shadow-sm">
                    <Plus className="w-4 h-4" />
                    Registra Nuova Spesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="font-serif">Nuova Spesa / Uscita</DialogTitle>
                    <DialogDescription>
                      Inserisci i dettagli del pagamento effettuato dalla cassa.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateExpense} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Categoria */}
                      <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select
                          value={category}
                          onValueChange={(val) => setCategory(val as ExpenseCategory)}
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Seleziona categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="piscina">Affitto Piscina / Corsie</SelectItem>
                            <SelectItem value="compensi_istruttori">Compensi Istruttori</SelectItem>
                            <SelectItem value="attrezzatura">Attrezzatura e Materiale</SelectItem>
                            <SelectItem value="altro">Altro / Varie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Importo */}
                      <div className="space-y-2">
                        <Label htmlFor="amount">Importo (€)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">€</span>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="150.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="pl-8"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Titolo / Descrizione breve */}
                    <div className="space-y-2">
                      <Label htmlFor="title">Descrizione / Oggetto</Label>
                      <Input
                        id="title"
                        placeholder="Es. Saldo corsie Ottobre, Compenso lezioni Marco"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Beneficiario / Destinatario */}
                      <div className="space-y-2">
                        <Label htmlFor="beneficiary">Beneficiario / Destinatario</Label>
                        <Input
                          id="beneficiary"
                          placeholder="Es. Piscina Comunale, Nome Istruttore"
                          value={beneficiary}
                          onChange={(e) => setBeneficiary(e.target.value)}
                        />
                      </div>

                      {/* Metodo di Pagamento */}
                      <div className="space-y-2">
                        <Label htmlFor="payment_method">Metodo di Pagamento</Label>
                        <Select
                          value={paymentMethod}
                          onValueChange={setPaymentMethod}
                        >
                          <SelectTrigger id="payment_method">
                            <SelectValue placeholder="Metodo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bonifico">Bonifico Bancario</SelectItem>
                            <SelectItem value="Contanti">Contanti</SelectItem>
                            <SelectItem value="Carta / POS">Carta / POS</SelectItem>
                            <SelectItem value="Satispay">Satispay</SelectItem>
                            <SelectItem value="Altro">Altro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Data Spesa */}
                    <div className="space-y-2">
                      <Label>Data Pagamento</Label>
                      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {expenseDate ? format(expenseDate, 'PPP', { locale: it }) : 'Seleziona data'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={expenseDate}
                            onSelect={(date) => {
                              if (date) setExpenseDate(date);
                              setShowDatePicker(false);
                            }}
                            initialFocus
                            locale={it}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Note opzionali */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Note aggiuntive (opzionale)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Riferimenti fattura, numero ricevuta o annotazioni..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setOpenAddDialog(false)}
                      >
                        Annulla
                      </Button>
                      <Button
                        type="submit"
                        className="bg-gradient-primary"
                        disabled={addExpenseMutation.isPending}
                      >
                        {addExpenseMutation.isPending ? 'Salvataggio...' : 'Registra Spesa'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per titolo, destinatario, note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <div className="w-full sm:w-[220px]">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Tutte le categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  <SelectItem value="piscina">Piscina / Corsie</SelectItem>
                  <SelectItem value="compensi_istruttori">Compensi Istruttori</SelectItem>
                  <SelectItem value="attrezzatura">Attrezzatura</SelectItem>
                  <SelectItem value="altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Caricamento spese in corso...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-muted-foreground/50 mb-1" />
              <p className="font-medium text-foreground">Nessuna spesa trovata</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {searchTerm || categoryFilter !== 'all'
                  ? 'Nessun risultato corrisponde ai filtri selezionati.'
                  : 'Non hai ancora registrato nessuna uscita. Clicca su "Registra Nuova Spesa" per iniziare a tracciare i pagamenti.'}
              </p>
            </div>
          ) : (
            <div className="divide-y border-t">
              {filteredExpenses.map((expense) => {
                const catConfig = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.altro;
                const CatIcon = catConfig.icon;

                return (
                  <div
                    key={expense.id}
                    className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5",
                        catConfig.colorClass
                      )}>
                        <CatIcon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate">
                            {expense.title}
                          </span>
                          <Badge variant="outline" className={cn("text-xs font-normal", catConfig.colorClass)}>
                            {catConfig.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>{format(new Date(expense.expense_date), 'd MMMM yyyy', { locale: it })}</span>
                          {expense.beneficiary && (
                            <>
                              <span>•</span>
                              <span>Destinatario: <strong className="font-medium text-foreground/80">{expense.beneficiary}</strong></span>
                            </>
                          )}
                          {expense.payment_method && (
                            <>
                              <span>•</span>
                              <span>{expense.payment_method}</span>
                            </>
                          )}
                        </div>

                        {expense.notes && (
                          <p className="text-xs text-muted-foreground italic truncate max-w-lg">
                            "{expense.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400">
                        -€{Number(expense.amount).toFixed(2)}
                      </span>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpenseToDelete(expense)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        title="Elimina spesa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questa spesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare la spesa "{expenseToDelete?.title}" di €{expenseToDelete?.amount?.toFixed(2)}.
              Questa azione non può essere annullata e ripristinerà il saldo in cassa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
