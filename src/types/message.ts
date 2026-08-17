export interface Message {
  id: string
  createdAt: number
  senderId: string
  senderName: string
  senderRole: string
  /** null = a channel post; a user id = a direct message to that user. */
  recipientId: string | null
  /** Only set for channel posts — which department's channel this belongs to. */
  department: string | null
  body: string
}

export interface MessageRow {
  id: string
  created_at: string
  sender_id: string
  sender_name: string
  sender_role: string
  recipient_id: string | null
  department: string | null
  body: string
}

export function fromMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    createdAt: new Date(row.created_at).getTime(),
    senderId: row.sender_id,
    senderName: row.sender_name || "Unknown",
    senderRole: row.sender_role || "",
    recipientId: row.recipient_id,
    department: row.department,
    body: row.body,
  }
}
