import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../../../components/ui'
import { FindingsList } from '../../Findings/FindingsList'
import { FindingDrawer } from '../../Findings/FindingDrawer'

export const FindingsTab = ({ campaign, readOnly }) => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Button variant="outline" icon={Plus} onClick={() => setOpen(true)}>Saisir un retour</Button>
        </div>
      )}
      <FindingsList campaignId={campaign.id_campaign} />
      <FindingDrawer isOpen={open} onClose={() => setOpen(false)} campaignId={campaign.id_campaign} />
    </div>
  )
}

export default FindingsTab
