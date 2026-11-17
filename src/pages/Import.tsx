import { PageHeader } from '../components/layout/PageHeader'
import { ImportFlow } from '../components/import/ImportFlow'

export function Import() {
  return (
    <div>
      <PageHeader title="Importar" />
      <ImportFlow />
    </div>
  )
}
