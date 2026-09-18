import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ExpenseCategory = 'piscina' | 'compensi_istruttori' | 'attrezzatura' | 'altro';

export interface Expense {
  id: string;
  category: ExpenseCategory | string;
  title: string;
  beneficiary: string | null;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  category: ExpenseCategory | string;
  title: string;
  beneficiary?: string;
  amount: number;
  expense_date: string;
  payment_method?: string;
  notes?: string;
}

export function useExpenses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Expense[];
    },
    enabled: !!user,
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          category: input.category,
          title: input.title,
          beneficiary: input.beneficiary || null,
          amount: input.amount,
          expense_date: input.expense_date,
          payment_method: input.payment_method || null,
          notes: input.notes || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
