export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
}
