// src/screens/history/PrescriptionDetailScreen.tsx
import React from 'react'
import { PDFViewer } from 'ui'
export default function PrescriptionDetailScreen({ route }: any) { return <PDFViewer uri={route.params?.uri}/> }
