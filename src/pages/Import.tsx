import { useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { ImportFlow } from '../components/import/ImportFlow'
import { SpreadsheetImport } from '../components/import/SpreadsheetImport'

export function Import() {
  const [tab, setTab] = useState<'spreadsheet' | 'bank'>('spreadsheet')

  return (
    <div>
      <PageHeader title="Importar" />

      {/* Tab switcher */}
      <div className="px-5 mb-1">
        <div className="flex bg-[#161616] rounded-xl p-1 border border-[#252525]">
          <button
            onClick={() => setTab('spreadsheet')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'spreadsheet' ? 'bg-[#252525] text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Minha planilha
          </button>
          <button
            onClick={() => setTab('bank')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'bank' ? 'bg-[#252525] text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Extrato bancário
          </button>
        </div>
      </div>

      {tab === 'spreadsheet' ? <SpreadsheetImport /> : <ImportFlow />}
    </div>
  )
}
