import { useState } from 'react'
import { Plus, Trash2, LogOut, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/layout/PageHeader'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#6b7280']

function KeywordEditor({ cat, onDone }: { cat: Category; onDone: () => void }) {
  const { loadCategories } = useApp()
  const [kw, setKw] = useState('')
  const [keywords, setKeywords] = useState<string[]>(cat.keywords ?? [])
  const [saving, setSaving] = useState(false)

  const add = () => {
    const v = kw.trim().toLowerCase()
    if (!v || keywords.includes(v)) return
    setKeywords(prev => [...prev, v])
    setKw('')
  }

  const remove = (k: string) => setKeywords(prev => prev.filter(x => x !== k))

  const save = async () => {
    setSaving(true)
    await supabase.from('categories').update({ keywords }).eq('id', cat.id)
    await loadCategories()
    setSaving(false)
    onDone()
  }

  return (
    <div className="px-4 pb-4 space-y-3 bg-[#111] border-t border-[#1f1f1f]">
      <p className="text-[11px] text-zinc-500 pt-3">
        Palavras-chave que identificam esta categoria nas descrições do extrato
      </p>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {keywords.map(k => (
          <span key={k} className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-2.5 py-1 text-xs text-zinc-300">
            {k}
            <button onClick={() => remove(k)} className="text-zinc-600 hover:text-red-400 ml-0.5">
              <X size={10} />
            </button>
          </span>
        ))}
        {keywords.length === 0 && <p className="text-xs text-zinc-700">Nenhuma palavra-chave personalizada</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={kw}
          onChange={e => setKw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="ex: nubank, netflix, uber..."
          className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
        />
        <button onClick={add} className="px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-green-400 text-xs hover:border-green-500/40">
          <Plus size={13} />
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 py-2 rounded-lg border border-[#2a2a2a] text-xs text-zinc-500">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-lg bg-green-500 text-black text-xs font-semibold disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

export function Settings() {
  const { categories, loadCategories } = useApp()
  const { user, signOut } = useAuth()
  const [showAddCat, setShowAddCat] = useState(false)
  const [expandedKw, setExpandedKw] = useState<string | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(COLORS[0])
  const [newCatIcon, setNewCatIcon] = useState('📦')
  const [newCatType, setNewCatType] = useState<'expense' | 'income' | 'savings'>('expense')
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

  const typeLabel = (t: string) =>
    t === 'expense' ? 'Gasto' : t === 'income' ? 'Receita' : 'Poupança'

  const allCats = [
    ...categories.filter(c => c.type === 'expense'),
    ...categories.filter(c => c.type === 'income'),
    ...categories.filter(c => c.type === 'savings'),
  ]

  return (
    <div className="pb-4">
      <PageHeader title="Configurações" />

      <div className="px-4 space-y-4">
        {/* Categories */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
            <div>
              <h3 className="text-sm font-medium text-white">Categorias</h3>
              <p className="text-[11px] text-zinc-600 mt-0.5">Toque para editar palavras-chave de importação</p>
            </div>
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
                {([
                  { v: 'expense',  label: 'Gasto'    },
                  { v: 'income',   label: 'Receita'  },
                  { v: 'savings',  label: 'Poupança' },
                ] as const).map(({ v, label }) => (
                  <button key={v} onClick={() => setNewCatType(v)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      newCatType === v ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'border-[#2a2a2a] text-zinc-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewCatColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${newCatColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button onClick={handleAddCategory} disabled={saving || !newCatName.trim()}
                className="w-full py-2.5 rounded-lg bg-green-500 text-black font-semibold text-sm disabled:opacity-50">
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          )}

          <div className="divide-y divide-[#1f1f1f]">
            {allCats.map(cat => (
              <div key={cat.id}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1f1f1f] transition-colors"
                  onClick={() => setExpandedKw(expandedKw === cat.id ? null : cat.id)}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-base">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm text-white">{cat.name}</p>
                    <p className="text-[11px] text-zinc-600">
                      {typeLabel(cat.type)}
                      {cat.keywords?.length > 0 && ` · ${cat.keywords.length} palavras-chave`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cat.name !== 'Sem categoria' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteCategory(cat.id) }}
                        className="text-zinc-700 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    {expandedKw === cat.id
                      ? <ChevronUp size={13} className="text-zinc-600" />
                      : <ChevronDown size={13} className="text-zinc-600" />}
                  </div>
                </button>
                {expandedKw === cat.id && (
                  <KeywordEditor cat={cat} onDone={() => setExpandedKw(null)} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Account info */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
          <h3 className="text-sm font-medium text-white mb-3">Conta</h3>
          <p className="text-xs text-zinc-500 mb-4">{user?.email}</p>
          <button onClick={signOut} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300">
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}
