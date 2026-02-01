-- Allow admins to delete entrance logs
CREATE POLICY "Admins can delete entrance logs"
ON public.entrance_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));