
import { API_BASE_URL } from '../constants';
import { Session, AskRequest, AskResponse, UploadResponse, SessionHistory } from '../types';

export const api = {
  async uploadDocument(file: File, chunkSize: number = 400, chunkOverlap: number = 50): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload?chunk_size=${chunkSize}&chunk_overlap=${chunkOverlap}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
      },
      body: formData,
    });
    
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },

  async askQuestion(params: AskRequest): Promise<AskResponse> {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        k: params.k || 5
      }),
    });

    if (!response.ok) throw new Error('Query failed');
    return response.json();
  },

  async getSessions(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      headers: { 'accept': 'application/json' },
    });
    if (!response.ok) throw new Error('Could not fetch sessions');
    return response.json();
  },

  async getSessionHistory(sessionId: string): Promise<SessionHistory> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      headers: { 'accept': 'application/json' },
    });
    if (!response.ok) throw new Error('Could not fetch session history');
    return response.json();
  },

  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 'accept': 'application/json' },
    });
    if (!response.ok) throw new Error('Could not delete session');
  }
};
