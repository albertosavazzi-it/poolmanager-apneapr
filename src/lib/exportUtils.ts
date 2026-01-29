import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export interface PaymentExportRow {
  userName: string;
  entrancesAdded: number;
  amountPaid: number;
  paymentDate: string;
  notes: string | null;
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

  // Add BOM for Excel UTF-8 compatibility
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
