
export interface Session {
  session_id: string;
  created_at?: string;
  document_name?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AskRequest {
  session_id: string;
  question: string;
  k?: number;
}

export interface AskResponse {
  answer: string;
  context?: string[];
}

export interface UploadResponse {
  session_id: string;
  filename: string;
  message: string;
}

export interface SessionHistory {
  session_id: string;
  history: Array<{
    question: string;
    answer: string;
  }>;
}
