import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Contas } from './pages/Contas'
import { Import } from './pages/Import'
import { Analysis } from './pages/Analysis'
import { Settings } from './pages/Settings'
import { Auth } from './pages/Auth'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0f0f0f]">
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />

  return (
    <AppProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="transacoes" element={<Transactions />} />
          <Route path="contas" element={<Contas />} />
          <Route path="importar" element={<Import />} />
          <Route path="analise" element={<Analysis />} />
          <Route path="configuracoes" element={<Settings />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthGate />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <Auth />
}
