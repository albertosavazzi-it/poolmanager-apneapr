-- Allow admins to insert entrance logs for any user
CREATE POLICY "Admins can insert logs for any user"
ON public.entrance_logs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));