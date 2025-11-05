export type Doctor = { doctor_id: string; clinic_id: string; name: string; rating?: number; meters?: number , specialty?: string }
export type Slot = { start_ts: string; end_ts: string }
export type Hold = { id: string }
export type VerifyOtpResponse = { token: string; user: any }
export type Appointment = { id: string; doctor_id: string; clinic_id: string; patient_id: string; start_ts: string; end_ts: string; status: string; visit_type: string }
export type DocumentRec = { id: string; type: 'prescription'|'lab'|'report'; file_url: string; text?: string; created_at: string }
export type Prescription = { id: string; appointment_id: string; pdf_url: string; sent_at: string }
export type RagAnswer = { answer: string; chunks: Array<{ doc_id: string; text: string }> }
