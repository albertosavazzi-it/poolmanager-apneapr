# POOL MANAGER (Apnea PR) — Project Context & LLM Guidelines

> Questo file (`GEMINI.md`) e `AGENTS.md` definiscono il **persistent context** e le istruzioni operative per gli agenti AI su questo progetto.

---

## 1. Panoramica del Progetto

* **Nome**: Pool Manager (Apnea PR)
* **Scopo**: Applicazione web (PWA) per la gestione degli ingressi in piscina, abbonamenti/ricariche, storico presenze, scadenze certificati medici e contabilità delle uscite societarie per l'associazione sportiva di apnea subacquea **Apnea PR**.
* **URL di produzione**: `https://poolmanager-apneapr.vercel.app/`
* **Lingua dell'interfaccia utente**: Italiano (tutti i testi, messaggi, form e notifiche devono essere in italiano).

---

## 2. Stack Tecnologico

### Frontend
* **Core**: React 18 (SWC) + TypeScript (strict mode)
* **Build Tool & Dev Server**: Vite 5 (`port: 8080`, alias `@/` -> `./src`)
* **Styling**: Tailwind CSS + `tailwindcss-animate` + `@tailwindcss/typography`
* **UI Components**: shadcn/ui (basato su primitive Radix UI)
* **Icone**: `lucide-react`
* **Gestione Stato Asincrono / Cache**: `@tanstack/react-query` (TanStack Query v5)
* **Notifiche / Toast**: `sonner`
* **Form & Validazione**: `react-hook-form` + `zod` + `@hookform/resolvers`
* **Mobile / PWA**: `vite-plugin-pwa` con configurazione standalone e prompt di installazione personalizzato (`InstallPrompt.tsx`)
* **Testing**: Vitest (`vitest.config.ts`) con `@testing-library/react` e `@testing-library/jest-dom`

### Backend & Database (BaaS)
* **Piattaforma**: Supabase (PostgreSQL 14.1)
* **Client**: `@supabase/supabase-js` (configurato in `src/integrations/supabase/client.ts`)
* **Autenticazione**: Supabase Auth (Email + Password, flusso di password recovery dedicato)
* **Sicurezza**: Row Level Security (RLS) abilitata su tutte le tabelle
* **Serverless / Edge Functions**: `supabase/functions/` (es. `notify-admin-new-user`)

---

## 3. Ruoli Utente e Sicurezza

Il sistema implementa un controllo degli accessi basato su ruoli (RBAC) con enum PostgreSQL `app_role`:
1. **`user` (Atleta)**:
   * Può visualizzare il proprio profilo e modificarne i dati consentiti.
   * Può consultare il proprio saldo ingressi rimanenti e lo storico dei propri ingressi e crediti.
   * Può registrare in autonomia un proprio ingresso in piscina.
2. **`admin` (Istruttore / Gestore)**:
   * Può visualizzare la lista completa di tutti gli atleti iscritti.
   * Può aggiungere crediti/ricariche (con importo pagato, data e note) a qualsiasi utente.
   * Può registrare o eliminare log d'ingresso per qualsiasi utente.
   * Può aggiornare la scadenza del certificato medico e lo stato `is_hidden` dei profili.
   * Può gestire la contabilità delle uscite societarie (tabella `expenses`).

> **Regola RLS**: Le autorizzazioni sono verificate sia lato database tramite la funzione `has_role(auth.uid(), 'admin'::app_role)` sia nel frontend tramite `useAuth().isAdmin`.

---

## 4. Schema del Database (PostgreSQL / Supabase)

### Tabelle Principali
1. **`profiles`**:
   * `id` (UUID, PK)
   * `user_id` (UUID, FK -> `auth.users(id)` ON DELETE CASCADE, UNIQUE)
   * `full_name` (TEXT, NOT NULL)
   * `medical_certificate_expiry` (DATE, NULLable)
   * `is_hidden` (BOOLEAN, DEFAULT false) — nasconde l'utente dalla vista attiva senza cancellare la cronologia
   * `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)
2. **`user_roles`**:
   * `id` (UUID, PK)
   * `user_id` (UUID, FK -> `auth.users(id)` ON DELETE CASCADE)
   * `role` (`app_role` enum: `'admin'` | `'user'`, DEFAULT `'user'`)
   * Constraint: `UNIQUE (user_id, role)`
3. **`entrance_credits`** (Ricariche ingressi acquistate):
   * `id` (UUID, PK)
   * `user_id` (UUID, FK -> `auth.users(id)` ON DELETE CASCADE)
   * `entrances_added` (INTEGER, CHECK > 0)
   * `amount_paid` (DECIMAL(10,2), DEFAULT 0)
   * `payment_date` (TIMESTAMP WITH TIME ZONE)
   * `added_by` (UUID, FK -> `auth.users(id)` ON DELETE SET NULL)
   * `notes` (TEXT, NULLable)
   * `created_at` (TIMESTAMP WITH TIME ZONE)
4. **`entrance_logs`** (Registro presenze effettive):
   * `id` (UUID, PK)
   * `user_id` (UUID, FK -> `auth.users(id)` ON DELETE CASCADE)
   * `entrance_date` (TIMESTAMP WITH TIME ZONE)
   * `created_at` (TIMESTAMP WITH TIME ZONE)
5. **`expenses`** (Spese / Uscite di cassa societarie):
   * `id` (UUID, PK)
   * `category` (TEXT, NOT NULL) — es. Affitto Corsie, Attrezzatura, Tesseramenti, Assicurazione, Varie
   * `title` (TEXT, NOT NULL)
   * `beneficiary` (TEXT, NULLable)
   * `amount` (DECIMAL(10,2), CHECK > 0)
   * `expense_date` (DATE, DEFAULT CURRENT_DATE)
   * `payment_method` (TEXT, NULLable) — es. Bonifico, Contanti, Carta
   * `notes` (TEXT, NULLable)
   * `created_by` (UUID, FK -> `auth.users(id)`)
   * `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

### Funzioni Database (RPC)
* `public.has_role(_user_id UUID, _role app_role) -> BOOLEAN`: Funzione STABLE SECURITY DEFINER per controllo ruoli in RLS.
* `public.get_remaining_entrances(_user_id UUID) -> INTEGER`: Calcola `SUM(entrance_credits.entrances_added) - COUNT(entrance_logs)`.
* `public.handle_new_user()`: Trigger su `auth.users AFTER INSERT` che crea automaticamente la riga in `profiles` e in `user_roles` con ruolo `'user'`.
* `public.update_updated_at_column()`: Trigger per aggiornare `updated_at`.

---

## 5. Mappa del Progetto

```
poolmanager-apneapr/
├── .env                       # Variabili d'ambiente client Supabase (VITE_SUPABASE_*)
├── index.html                 # Entry point HTML con PWA meta tags e OpenGraph
├── vite.config.ts             # Setup Vite, proxy/host, PWA plugin, alias @/
├── tailwind.config.ts         # Configurazione palette HSL, animazioni, font
├── supabase/
│   ├── config.toml            # Configurazione Supabase CLI (project_id)
│   ├── schema_full.sql        # Script SQL completo per ricreare l'intero DB da zero
│   ├── migrations/            # Storico migrazioni incrementali
│   └── functions/             # Edge Functions Supabase
└── src/
    ├── main.tsx               # Monta App su #root
    ├── App.tsx                # Setup QueryClientProvider, TooltipProvider, Toaster, BrowserRouter
    ├── config/
    │   └── version.ts         # Costante APP_VERSION ("v1.1.0") mostrata nella UI
    ├── integrations/supabase/
    │   ├── client.ts          # Istanza Singleton del client Supabase
    │   └── types.ts           # Tipi TypeScript generati dal DB Supabase
    ├── hooks/
    │   ├── useAuth.tsx        # AuthContext: user, session, isAdmin, signIn, signUp, signOut
    │   ├── useEntrances.tsx   # React Query hooks per ingressi, crediti, utenti, statistiche
    │   ├── useExpenses.ts     # React Query hooks per CRUD spese societarie
    │   ├── use-toast.ts       # Hook compatibilità toast shadcn
    │   └── use-mobile.tsx     # Hook per media query mobile
    ├── pages/
    │   ├── Index.tsx          # Router di stato: Login -> AdminDashboard / UserDashboard / Recovery
    │   └── NotFound.tsx       # Pagina 404
    └── components/
        ├── AdminDashboard.tsx # Vista completa per gli amministratori (utenti, ricariche, presenze)
        ├── UserDashboard.tsx  # Vista personale atleta (ingressi residui, self check-in, storico)
        ├── ExpensesManager.tsx# Modulo gestione uscite societarie e statistiche di spesa
        ├── AuthForm.tsx       # Form login e registrazione
        ├── SetNewPasswordForm.tsx # Form reimpostazione password da link recovery
        ├── AppLogo.tsx        # Logo SVG dell'applicazione
        ├── InstallPrompt.tsx  # Banner/Pulsante di installazione PWA per dispositivi mobili
        └── ui/                # Componenti riutilizzabili shadcn/ui (button, dialog, card, ecc.)
```

---

## 6. Regole di Sviluppo per gli Agenti LLM

### 1. Rispetto delle Convenzioni React & TypeScript
* Usa sempre TypeScript con tipizzazione rigorosa. Non usare `any` se non strettamente necessario.
* Non modificare direttamente `src/integrations/supabase/client.ts` poiché è generato per connettere l'istanza Supabase.
* Importa i componenti da `@/components/...` e le utilità da `@/lib/...`.

### 2. Gestione dello Stato e Cache (TanStack Query)
* Tutte le letture da Supabase devono passare da custom hooks basati su `useQuery`.
* Tutte le mutazioni (insert, update, delete) devono usare `useMutation` e invalidare tempestivamente le query correlate tramite `queryClient.invalidateQueries({ queryKey: [...] })`:
  * Saldo personale: `['remaining-entrances']`
  * Log personali: `['my-entrance-logs']`
  * Crediti personali: `['my-entrance-credits']`
  * Lista utenti admin: `['users-with-entrances']`
  * Spese societarie: `['expenses']`

### 3. Modifiche al Database
* Quando viene aggiunta una colonna o una tabella:
  1. Crea una nuova migrazione numerata in `supabase/migrations/`.
  2. Aggiorna `supabase/schema_full.sql` affinché resti il riferimento unico per ricreare il DB da zero.
  3. Aggiorna `src/integrations/supabase/types.ts` per riflettere le definizioni di tipo nel client.
* Assicurati sempre che ogni nuova tabella abbia `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` e le relative policy per `admin` e `user`.

### 4. UI/UX e Lingua
* **Lingua obbligatoria**: Tutto il testo visibile all'utente (bottoni, placeholder, alert, messaggi di successo o errore di Sonner toast) deve essere in **italiano**.
* Usa i token di colore Tailwind definiti in `tailwind.config.ts` (es. `bg-primary`, `text-muted-foreground`, `shadow-card`, gradienti `bg-gradient-hero`).
* Per le azioni distruttive (es. cancellazione ingresso o spesa), richiedi sempre conferma tramite dialog o alert dialog.

### 5. Versioning
* Quando rilasci una nuova funzionalità significativa o un fix visibile all'utente, aggiorna la versione sia in `package.json` sia in `src/config/version.ts`.

---

## 7. Comandi Utili

```bash
# Avvia il dev server (http://localhost:8080)
npm run dev

# Esegue il type-check e la build di produzione
npm run build

# Verifica il linting del codice
npm run lint

# Esegue i test con Vitest
npm run test
```
