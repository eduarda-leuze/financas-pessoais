import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError('E-mail ou senha incorretos')
    } else {
      const { error } = await signUp(email, password)
      if (error) setError(error.message)
      else setSuccess('Conta criada! Verifique seu e-mail para confirmar.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-[#0f0f0f]">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-white">FinançasPessoais</h1>
          <p className="text-zinc-500 text-sm mt-1">Controle financeiro simples e eficiente</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6">
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-[#2a2a2a] mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-green-500 text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-green-500 text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3.5 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3.5 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 text-sm"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && <p className="text-green-400 text-sm">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-green-500 text-black font-semibold text-sm hover:bg-green-400 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
