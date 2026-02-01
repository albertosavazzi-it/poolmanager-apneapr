import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface EntranceCredit {
  id: string;
  user_id: string;
  entrances_added: number;
  amount_paid: number;
  payment_date: string;
  added_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface EntranceLog {
  id: string;
  user_id: string;
  entrance_date: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithEntrances {
  profile: UserProfile;
  totalEntrances: number;
  usedEntrances: number;
  remainingEntrances: number;
  totalPaid: number;
  credits: EntranceCredit[];
  logs: EntranceLog[];
}

export function useRemainingEntrances() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['remaining-entrances', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { data: credits } = await supabase
        .from('entrance_credits')
        .select('entrances_added')
        .eq('user_id', user.id);

      const { data: logs } = await supabase
        .from('entrance_logs')
        .select('id')
        .eq('user_id', user.id);

      const totalEntrances = credits?.reduce((sum, c) => sum + c.entrances_added, 0) ?? 0;
      const usedEntrances = logs?.length ?? 0;

      return totalEntrances - usedEntrances;
    },
    enabled: !!user,
  });
}

export function useMyEntranceLogs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-entrance-logs', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('entrance_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('entrance_date', { ascending: false });

      if (error) throw error;
      return data as EntranceLog[];
    },
    enabled: !!user,
  });
}

export function useMyCredits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-credits', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('entrance_credits')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as EntranceCredit[];
    },
    enabled: !!user,
  });
}

export function useRegisterEntrance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Non autenticato');

      const { error } = await supabase
        .from('entrance_logs')
        .insert({ user_id: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remaining-entrances'] });
      queryClient.invalidateQueries({ queryKey: ['my-entrance-logs'] });
    },
  });
}

// Admin hooks
export function useAllUsersWithEntrances() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['all-users-entrances'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: allCredits } = await supabase
        .from('entrance_credits')
        .select('*')
        .order('payment_date', { ascending: false });

      const { data: allLogs } = await supabase
        .from('entrance_logs')
        .select('*')
        .order('entrance_date', { ascending: false });

      const usersWithEntrances: UserWithEntrances[] = (profiles as UserProfile[]).map(profile => {
        const userCredits = (allCredits as EntranceCredit[] | null)?.filter(c => c.user_id === profile.user_id) ?? [];
        const userLogs = (allLogs as EntranceLog[] | null)?.filter(l => l.user_id === profile.user_id) ?? [];

        const totalEntrances = userCredits.reduce((sum, c) => sum + c.entrances_added, 0);
        const usedEntrances = userLogs.length;
        const totalPaid = userCredits.reduce((sum, c) => sum + Number(c.amount_paid), 0);

        return {
          profile,
          totalEntrances,
          usedEntrances,
          remainingEntrances: totalEntrances - usedEntrances,
          totalPaid,
          credits: userCredits,
          logs: userLogs,
        };
      });

      return usersWithEntrances;
    },
    enabled: isAdmin,
  });
}

export function useAddCredits() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      entrances,
      amount,
      notes,
    }: {
      userId: string;
      entrances: number;
      amount: number;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('entrance_credits')
        .insert({
          user_id: userId,
          entrances_added: entrances,
          amount_paid: amount,
          notes,
          added_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-entrances'] });
      queryClient.invalidateQueries({ queryKey: ['remaining-entrances'] });
      queryClient.invalidateQueries({ queryKey: ['my-credits'] });
    },
  });
}

export function useAdminRegisterEntrance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('entrance_logs')
        .insert({ user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-entrances'] });
      queryClient.invalidateQueries({ queryKey: ['remaining-entrances'] });
      queryClient.invalidateQueries({ queryKey: ['my-entrance-logs'] });
    },
  });
}

export function useDeleteEntranceLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase
        .from('entrance_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-entrances'] });
      queryClient.invalidateQueries({ queryKey: ['remaining-entrances'] });
      queryClient.invalidateQueries({ queryKey: ['my-entrance-logs'] });
    },
  });
}
