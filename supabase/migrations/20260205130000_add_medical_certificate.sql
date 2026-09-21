-- Add medical_certificate_expiry to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS medical_certificate_expiry DATE NULL;

COMMENT ON COLUMN public.profiles.medical_certificate_expiry IS 'Data di scadenza del certificato medico dell''utente';
