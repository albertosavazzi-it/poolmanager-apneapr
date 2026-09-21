import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export interface PaymentExportRow {
  userName: string;
  entrancesAdded: number;
  amountPaid: number;
  paymentDate: string;
  notes: string | null;
}

export interface UserSummaryExportRow {
  userName: string;
  totalEntrances: number;
  usedEntrances: number;
  remainingEntrances: number;
  totalPaid: number;
  medicalCertificateExpiry?: string | null;
}

function downloadCSV(csvContent: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(data: PaymentExportRow[], filename: string) {
  const headers = ['Nome Utente', 'Ingressi Aggiunti', 'Importo Versato (€)', 'Data Pagamento', 'Note'];
  
  const csvContent = [
    headers.join(';'),
    ...data.map(row => [
      `"${row.userName}"`,
      row.entrancesAdded,
      row.amountPaid.toFixed(2).replace('.', ','),
      format(new Date(row.paymentDate), 'dd/MM/yyyy', { locale: it }),
      `"${row.notes || ''}"`,
    ].join(';'))
  ].join('\n');

  downloadCSV(csvContent, filename);
}

export function exportUserSummaryToCSV(data: UserSummaryExportRow[], filename: string) {
  const headers = ['Nome Utente', 'Ingressi Totali', 'Ingressi Utilizzati', 'Ingressi Rimanenti', 'Totale Versato (€)', 'Scadenza Certificato Medico'];
  
  const csvContent = [
    headers.join(';'),
    ...data.map(row => [
      `"${row.userName}"`,
      row.totalEntrances,
      row.usedEntrances,
      row.remainingEntrances,
      row.totalPaid.toFixed(2).replace('.', ','),
      row.medicalCertificateExpiry
        ? format(new Date(row.medicalCertificateExpiry), 'dd/MM/yyyy', { locale: it })
        : 'Non inserito',
    ].join(';'))
  ].join('\n');

  downloadCSV(csvContent, filename);
}

export interface ExpenseExportRow {
  date: string;
  category: string;
  title: string;
  beneficiary: string | null;
  amount: number;
  paymentMethod: string | null;
  notes: string | null;
}

export function exportExpensesToCSV(data: ExpenseExportRow[], filename: string) {
  const headers = ['Data', 'Categoria', 'Descrizione/Titolo', 'Destinatario/Beneficiario', 'Importo (€)', 'Metodo Pagamento', 'Note'];
  
  const csvContent = [
    headers.join(';'),
    ...data.map(row => [
      format(new Date(row.date), 'dd/MM/yyyy', { locale: it }),
      `"${row.category}"`,
      `"${row.title}"`,
      `"${row.beneficiary || ''}"`,
      row.amount.toFixed(2).replace('.', ','),
      `"${row.paymentMethod || ''}"`,
      `"${row.notes || ''}"`,
    ].join(';'))
  ].join('\n');

  downloadCSV(csvContent, filename);
}
