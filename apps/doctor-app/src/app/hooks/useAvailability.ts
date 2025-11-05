// Local implementation of useAvailability hook
// TODO: Replace with actual api-client implementation when available

import { useState } from 'react'

type AvailabilitySlot = {
  day: string
  start: string
  end: string
  slotMins: number
}

export function useAvailability() {
  const [template, setTemplate] = useState<AvailabilitySlot[]>([])

  const saveTemplate = (newTemplate: AvailabilitySlot[]) => {
    setTemplate(newTemplate)
    // TODO: Implement actual API call to save availability template
    console.log('Saving availability template:', newTemplate)
  }

  return {
    data: template,
    saveTemplate,
  }
}

