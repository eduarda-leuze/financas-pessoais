import { useState } from 'react'
import { Eye, EyeOff, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function Auth() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handle = async () => {
    if (!email || !password) { setError('Preencha todos os campos'); return }
    setLoading(true); setError(''); setSuccess('')
    const { error: err } = tab === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)
    setLoading(false)
    if (err) setError(err.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : err.message)
    else if (tab === 'signup') setSuccess('Conta criada! Faça login para continuar.')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-[#0d0d0d]">
      {/* Brand */}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
          <TrendingUp size={28} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Finanças</h1>
        <p className="text-sm text-zinc-500 mt-1">Controle financeiro pessoal</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Tabs */}
        <div className="flex bg-[#161616] rounded-xl p-1 mb-6 border border-[#252525]">
          {(['login', 'signup'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setSuccess('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t ? 'bg-[#252525] text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-[#161616] border border-[#252525] rounded-xl px-4 py-3.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Senha</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handle()}
                placeholder="••••••••"
                className="w-full bg-[#161616] border border-[#252525] rounded-xl px-4 py-3.5 pr-12 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            {success}
          </div>
        )}

        <button
          onClick={handle}
          disabled={loading}
          className="mt-5 w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 active:bg-green-600 text-black font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </div>
    </div>
  )
}
