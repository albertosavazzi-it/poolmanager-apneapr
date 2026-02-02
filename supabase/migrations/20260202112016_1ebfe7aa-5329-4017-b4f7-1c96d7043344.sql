-- Add is_hidden column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;

-- Allow admins to update any profile (for hiding users)
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));