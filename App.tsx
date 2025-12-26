
import React, { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import { ChatMessage, SessionHistory } from './types';
import { Icons } from './constants';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize: Load sessions
  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch session list
  const fetchSessions = async () => {
    try {
      const sessionIds = await api.getSessions();
      setSessions(sessionIds);
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  // Switch session and load history
  const handleSelectSession = async (id: string) => {
    setActiveSessionId(id);
    setIsSidebarOpen(false); // On mobile, close sidebar
    try {
      const history: SessionHistory = await api.getSessionHistory(id);
      const chatHistory: ChatMessage[] = [];
      history.history.forEach((h, idx) => {
        chatHistory.push({ role: 'user', content: h.question, timestamp: Date.now() + idx });
        chatHistory.push({ role: 'assistant', content: h.answer, timestamp: Date.now() + idx + 0.5 });
      });
      setMessages(chatHistory);
    } catch (err) {
      console.error('Failed to load session history', err);
      setMessages([]);
    }
  };

  const handleNewChat = () => {
    setShowUploadModal(true);
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      await api.deleteSession(id);
      setSessions(prev => prev.filter(s => s !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      alert('Failed to delete session');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await api.uploadDocument(file);
      await fetchSessions();
      handleSelectSession(result.session_id);
      setShowUploadModal(false);
    } catch (err) {
      alert('Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSessionId || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    const question = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.askQuestion({
        session_id: activeSessionId,
        question: question
      });
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.answer,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error while processing your request.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-slate-900">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
              <span className="p-1.5 bg-indigo-600 rounded-lg text-white">
                <Icons.Chat />
              </span>
              DocuMind AI
            </h1>
          </div>
          
          <div className="px-4 mb-4">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-medium shadow-sm hover:shadow-md"
            >
              <Icons.Plus />
              New Document Session
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">History</p>
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-400 px-2 italic">No active sessions</p>
            ) : (
              <div className="space-y-1">
                {sessions.map((id) => (
                  <div
                    key={id}
                    onClick={() => handleSelectSession(id)}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${activeSessionId === id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Icons.File />
                      <span className="truncate text-sm font-medium">{id.split('-')[0]}... Session</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 transition-opacity"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">JD</div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-none">Guest User</p>
                <p className="text-xs text-gray-500 mt-1">Free Tier</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600">
            <Icons.Menu />
          </button>
          <span className="font-bold text-indigo-600">DocuMind AI</span>
          <div className="w-6" />
        </header>

        {/* Chat Area */}
        {activeSessionId ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                    <Icons.File />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Document Loaded Successfully</h3>
                  <p className="text-gray-500">The knowledge from your document has been indexed. Ask me anything about its content.</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <span className={`text-[10px] mt-2 block opacity-60 text-right`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 md:p-6 bg-white border-t border-gray-100">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about the document..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white p-3 rounded-xl transition-colors shadow-sm"
                >
                  <Icons.Send />
                </button>
              </form>
              <p className="text-[10px] text-center text-gray-400 mt-3">
                Session: {activeSessionId.substring(0, 16)}...
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
            <div className="max-w-2xl w-full text-center space-y-8">
              <div className="inline-block p-4 bg-indigo-50 text-indigo-600 rounded-3xl mb-4">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Ready to Chat with Documents?</h2>
              <p className="text-xl text-gray-500">Upload your PDF, TXT or DOCX files and let DocuMind AI help you find the answers you need in seconds.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="p-6 bg-gray-50 rounded-2xl text-left border border-gray-100">
                  <div className="w-10 h-10 bg-white shadow-sm flex items-center justify-center rounded-lg text-indigo-600 mb-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Smart Retrieval</h4>
                  <p className="text-sm text-gray-500">Context-aware RAG system ensures answers are grounded in your data.</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl text-left border border-gray-100">
                  <div className="w-10 h-10 bg-white shadow-sm flex items-center justify-center rounded-lg text-indigo-600 mb-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Fast Indexing</h4>
                  <p className="text-sm text-gray-500">Your documents are processed and indexed instantly using advanced embeddings.</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl text-left border border-gray-100">
                  <div className="w-10 h-10 bg-white shadow-sm flex items-center justify-center rounded-lg text-indigo-600 mb-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Private & Secure</h4>
                  <p className="text-sm text-gray-500">Sessions are isolated ensuring your proprietary data stays yours.</p>
                </div>
              </div>
              
              <button
                onClick={handleNewChat}
                className="mt-8 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 mx-auto"
              >
                <Icons.Upload /> Start by Uploading
              </button>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 flex items-center justify-between border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">Upload Knowledge Source</h3>
                <button onClick={() => !isUploading && setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="p-8">
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Processing Document</h4>
                    <p className="text-gray-500 max-w-xs">We're splitting your file into chunks and building an embedding index...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <label className="group relative flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                          <Icons.Upload />
                        </div>
                        <p className="mb-2 text-sm font-semibold text-gray-700">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-400">PDF, TXT, DOCX (Max 10MB)</p>
                      </div>
                      <input type="file" className="hidden" accept=".pdf,.txt,.docx" onChange={handleUpload} />
                    </label>
                    
                    <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 text-amber-800 text-sm">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p>Indexing larger documents may take up to a minute. Don't close this window.</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className="px-4 py-2 text-gray-600 font-medium hover:text-gray-900 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
