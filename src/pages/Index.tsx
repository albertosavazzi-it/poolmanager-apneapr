import { useAuth, AuthProvider } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { UserDashboard } from '@/components/UserDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { SetNewPasswordForm } from '@/components/SetNewPasswordForm';
import { Waves } from 'lucide-react';

function AppContent() {
  const { user, loading, isAdmin, isPasswordRecovery, clearPasswordRecovery } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center animate-pulse">
          <div className="w-20 h-20 bg-primary-foreground/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-wave">
            <Waves className="w-10 h-10 text-primary-foreground" />
          </div>
          <p className="text-primary-foreground text-lg">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Mostra il form per impostare la nuova password se l'utente arriva dal link di recovery
  if (isPasswordRecovery && user) {
    return <SetNewPasswordForm onSuccess={clearPasswordRecovery} />;
  }

  if (!user) {
    return <AuthForm />;
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return <UserDashboard />;
}

const Index = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
