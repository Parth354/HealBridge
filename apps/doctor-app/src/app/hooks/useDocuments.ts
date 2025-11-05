// Local implementation of useDocuments hook
// TODO: Replace with actual api-client implementation when available

type CreateRxParams = {
  appointmentId: string
  items: Array<{ drug: string; dose: string }>
}

export function useDocuments() {
  const createRx = async (params: CreateRxParams): Promise<void> => {
    // TODO: Implement actual API call to create prescription
    console.log('Creating prescription:', params)
  }

  return { createRx }
}

