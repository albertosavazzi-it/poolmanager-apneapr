-- Fix RLS policies to require authentication for all SELECT operations

-- ==================== PROFILES TABLE ====================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- ==================== USER_ROLES TABLE ====================
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" 
  ON public.user_roles FOR SELECT 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" 
  ON public.user_roles FOR SELECT 
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- ==================== ENTRANCE_CREDITS TABLE ====================
DROP POLICY IF EXISTS "Users can view own credits" ON public.entrance_credits;
CREATE POLICY "Users can view own credits" 
  ON public.entrance_credits FOR SELECT 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all credits" ON public.entrance_credits;
CREATE POLICY "Admins can view all credits" 
  ON public.entrance_credits FOR SELECT 
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- ==================== ENTRANCE_LOGS TABLE ====================
DROP POLICY IF EXISTS "Users can view own logs" ON public.entrance_logs;
CREATE POLICY "Users can view own logs" 
  ON public.entrance_logs FOR SELECT 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all logs" ON public.entrance_logs;
CREATE POLICY "Admins can view all logs" 
  ON public.entrance_logs FOR SELECT 
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));