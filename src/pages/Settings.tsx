import { useState } from 'react'
import { Plus, Trash2, LogOut } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/layout/PageHeader'
import { supabase } from '../lib/supabase'

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#6b7280']

export function Settings() {
  const { categories, loadCategories } = useApp()
  const { user, signOut } = useAuth()
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(COLORS[0])
  const [newCatIcon, setNewCatIcon] = useState('📦')
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense')
  const [saving, setSaving] = useState(false)

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !user) return
    setSaving(true)
    await supabase.from('categories').insert({
      user_id: user.id,
      name: newCatName.trim(),
      color: newCatColor,
      icon: newCatIcon,
      type: newCatType,
      keywords: [],
    })
    await loadCategories()
    setNewCatName('')
    setShowAddCat(false)
    setSaving(false)
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Excluir categoria? As transações associadas perderão a categoria.')) return
    await supabase.from('categories').delete().eq('id', id)
    await loadCategories()
  }

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const incomeCategories = categories.filter(c => c.type === 'income')

  return (
    <div className="pb-4">
      <PageHeader title="Configurações" />

      {/* Categories */}
      <div className="px-4 space-y-4">
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
            <h3 className="text-sm font-medium text-white">Categorias</h3>
            <button
              onClick={() => setShowAddCat(!showAddCat)}
              className="text-green-400 hover:text-green-300 text-xs flex items-center gap-1"
            >
              <Plus size={14} /> Nova
            </button>
          </div>

          {showAddCat && (
            <div className="p-4 border-b border-[#2a2a2a] space-y-3 bg-[#161616]">
              <div className="flex gap-2">
                <input
                  value={newCatIcon}
                  onChange={e => setNewCatIcon(e.target.value)}
                  className="w-12 bg-[#111] border border-[#2a2a2a] rounded-lg text-center py-2 text-lg"
                  maxLength={2}
                />
                <input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Nome da categoria"
                  className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewCatType(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      newCatType === t
                        ? 'bg-green-500/20 border-green-500/30 text-green-400'
                        : 'border-[#2a2a2a] text-zinc-500'
                    }`}
                  >
                    {t === 'expense' ? 'Gasto' : 'Receita'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewCatColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${newCatColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                onClick={handleAddCategory}
                disabled={saving || !newCatName.trim()}
                className="w-full py-2.5 rounded-lg bg-green-500 text-black font-semibold text-sm disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          )}

          <div className="divide-y divide-[#1f1f1f]">
            {[...expenseCategories, ...incomeCategories].map(cat => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-base">{cat.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-white">{cat.name}</p>
                  <p className="text-[11px] text-zinc-600">{cat.type === 'expense' ? 'Gasto' : 'Receita'}</p>
                </div>
                {cat.name !== 'Sem categoria' && (
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-zinc-700 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Account info */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
          <h3 className="text-sm font-medium text-white mb-3">Conta</h3>
          <p className="text-xs text-zinc-500 mb-4">{user?.email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}
