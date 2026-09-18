-- Create expenses table for tracking outflows (pool rent, instructor compensations, equipment, etc.)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  beneficiary TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Admins only policies
CREATE POLICY "Admins can view all expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
