import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { LogIn, Loader2, Eye, EyeOff } from 'lucide-react';
import lamtexLogo from '@/src/assets/Lamtex Logo.png';

interface AccountEntry {
  branch: string;
  id: string;
  name: string;
  email: string;
  role: string;
  password: string;
}

const ACCOUNTS: AccountEntry[] = [
  // Executive
  { branch: 'Executive', id: 'EXEC-001', name: 'Executive', email: 'executive@lamtex.com', role: 'Executive', password: 'lamtex2026' },
  // Manila
  { branch: 'Manila', id: 'AGT-MNL-001', name: 'Ana Reyes', email: 'ana.reyes.manila@lamtex.com', role: 'Agent', password: 'Lamtex@2026' },
  { branch: 'Manila', id: 'AGT-MNL-002', name: 'Carlos Buenaventura', email: 'carlos.buenaventura.manila@lamtex.com', role: 'Agent', password: 'Lamtex@2026' },
  { branch: 'Manila', id: 'AGT-MNL-003', name: 'Rica Lim', email: 'rica.lim.manila@lamtex.com', role: 'Agent', password: 'Lamtex@2026' },
  { branch: 'Manila', id: 'LOG-MNL-001', name: 'Miguel Santos', email: 'miguel.santos.manila@lamtex.com', role: 'Logistics', password: 'Lamtex@2026' },
  { branch: 'Manila', id: 'LOG-MNL-002', name: 'Jasmine Cruz', email: 'jasmine.cruz.manila@lamtex.com', role: 'Logistics', password: 'Lamtex@2026' },
  { branch: 'Manila', id: 'WH-MNL-001', name: 'Jose Ramos', email: 'jose.ramos.manila@lamtex.com', role: 'Warehouse', password: 'Lamtex@2026' },
  { branch: 'Manila', id: 'WH-MNL-002', name: 'Patricia Navarro', email: 'patricia.navarro.manila@lamtex.com', role: 'Warehouse', password: 'Lamtex@2026' },
  // Cebu
  { branch: 'Cebu', id: 'AGT-CEB-001', name: 'Marco Villanueva', email: 'marco.villanueva.cebu@lamtex.com', role: 'Agent', password: 'Lamtex@2026' },
  { branch: 'Cebu', id: 'AGT-CEB-002', name: 'Sofia Tan', email: 'sofia.tan.cebu@lamtex.com', role: 'Agent', password: 'Lamtex@2026' },
  { branch: 'Cebu', id: 'AGT-CEB-003', name: 'Diego Flores', email: 'diego.flores.cebu@lamtex.com', role: 'Agent', password: 'Lamtex@2026' },
  { branch: 'Cebu', id: 'LOG-CEB-001', name: 'Ramon Dela Cruz', email: 'ramon.delacruz.cebu@lamtex.com', role: 'Logistics', password: 'Lamtex@2026' },
  { branch: 'Cebu', id: 'LOG-CEB-002', name: 'Elena Reyes', email: 'elena.reyes.cebu@lamtex.com', role: 'Logistics', password: 'Lamtex@2026' },
  { branch: 'Cebu', id: 'WH-CEB-001', name: 'Antonio Garces', email: 'antonio.garces.cebu@lamtex.com', role: 'Warehouse', password: 'Lamtex@2026' },
  { branch: 'Cebu', id: 'WH-CEB-002', name: 'Maria Ledesma', email: 'maria.ledesma.cebu@lamtex.com', role: 'Warehouse', password: 'Lamtex@2026' },
  // Batangas
  { branch: 'Batangas', id: 'AGT-BTG-001', name: 'Leo Marasigan', email: 'leo.marasigan.batangas@lamtex.com', role: 'Agent', password: 'Lamtex@2026' },
  { branch: 'Batangas', id: 'AGT-BTG-002', name: 'Nina Ilagan', email: 'nina.ilagan.batangas@lamtex.com', role: 'Agent', password: 'Lamtex@2026' },
  { branch: 'Batangas', id: 'AGT-BTG-003', name: 'Roy Castillo', email: 'roy.castillo.batangas@lamtex.com', role: 'Agent', password: 'Lamtex@2026' },
  { branch: 'Batangas', id: 'LOG-BTG-001', name: 'Bernard Ocampo', email: 'bernard.ocampo.batangas@lamtex.com', role: 'Logistics', password: 'Lamtex@2026' },
  { branch: 'Batangas', id: 'LOG-BTG-002', name: 'Cynthia Bautista', email: 'cynthia.bautista.batangas@lamtex.com', role: 'Logistics', password: 'Lamtex@2026' },
  { branch: 'Batangas', id: 'WH-BTG-001', name: 'Roberto Mendoza', email: 'roberto.mendoza.batangas@lamtex.com', role: 'Warehouse', password: 'Lamtex@2026' },
  { branch: 'Batangas', id: 'WH-BTG-002', name: 'Luz Aguilar', email: 'luz.aguilar.batangas@lamtex.com', role: 'Warehouse', password: 'Lamtex@2026' },
];

const BRANCH_COLORS: Record<string, string> = {
  Executive: 'bg-purple-100 text-purple-700 border-purple-200',
  Manila:    'bg-blue-100 text-blue-700 border-blue-200',
  Cebu:      'bg-teal-100 text-teal-700 border-teal-200',
  Batangas:  'bg-orange-100 text-orange-700 border-orange-200',
};

const ROLE_COLORS: Record<string, string> = {
  Executive: 'text-purple-600',
  Agent:     'text-gray-500',
  Logistics: 'text-green-600',
  Warehouse: 'text-rose-600',
};

const BRANCHES = ['Executive', 'Manila', 'Cebu', 'Batangas'];
const BRANCH_OPTIONS = ['Manila', 'Cebu', 'Batangas'];

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('executive@lamtex.com');
  const [password, setPassword] = useState('lamtex2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeAccount, setActiveAccount] = useState<string>('executive@lamtex.com');
  const [selectedBranch, setSelectedBranch] = useState<string>('Manila');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    navigate('/', { replace: true });
  };

  const autofill = (account: AccountEntry) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveAccount(account.email);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-4 items-stretch">

        {/* ── Quick-select panel ─────────────────────────────────────── */}
        <div className="lg:w-72 xl:w-80 flex-shrink-0 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden">
          {/* Header + branch dropdown */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 space-y-2">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Account Select</p>
              <p className="text-xs text-gray-400 mt-0.5">Click any row to autofill credentials</p>
            </div>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
            >
              {BRANCH_OPTIONS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {/* Executive — always shown first */}
            <div>
              <div className="px-4 py-1.5 flex items-center gap-2 sticky top-0 bg-white z-10">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BRANCH_COLORS['Executive'] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  Executive
                </span>
              </div>
              {ACCOUNTS.filter(a => a.branch === 'Executive').map(account => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => autofill(account)}
                  className={`w-full text-left px-4 py-2.5 transition-colors hover:bg-gray-50 ${activeAccount === account.email ? 'bg-red-50 border-l-2 border-red-500' : 'border-l-2 border-transparent'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{account.name}</span>
                    <span className={`text-[10px] font-semibold flex-shrink-0 ${ROLE_COLORS[account.role] ?? 'text-gray-500'}`}>{account.role}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 truncate mt-0.5">{account.email}</div>
                </button>
              ))}
            </div>

            {/* Selected branch accounts */}
            <div>
              <div className="px-4 py-1.5 flex items-center gap-2 sticky top-0 bg-white z-10">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BRANCH_COLORS[selectedBranch] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {selectedBranch}
                </span>
              </div>
              {ACCOUNTS.filter(a => a.branch === selectedBranch).map(account => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => autofill(account)}
                  className={`w-full text-left px-4 py-2.5 transition-colors hover:bg-gray-50 ${activeAccount === account.email ? 'bg-red-50 border-l-2 border-red-500' : 'border-l-2 border-transparent'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{account.name}</span>
                    <span className={`text-[10px] font-semibold flex-shrink-0 ${ROLE_COLORS[account.role] ?? 'text-gray-500'}`}>{account.role}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 truncate mt-0.5">{account.email}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
            <p className="text-[11px] text-gray-400">
              Default password: <span className="font-mono font-semibold text-gray-600">Lamtex@2026</span>
            </p>
          </div>
        </div>

        {/* ── Login form ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex justify-center mb-6">
            <img src={lamtexLogo} alt="Lamtex" className="h-14 w-auto" />
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
              <p className="text-sm text-gray-500 mt-1">Enter your credentials to access the dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="you@lamtex.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
