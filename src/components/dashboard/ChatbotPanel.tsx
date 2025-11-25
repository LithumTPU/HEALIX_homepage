import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { MessageSquare, Send, Bot } from 'lucide-react';
import { cn } from '../../lib/utils';

const CHATBOT_API_URL = 'http://127.0.0.1:5000/api/chat';
const CHATBOT_HEALTH_URL = 'http://127.0.0.1:5000/health';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

export function ChatbotPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Hello, I am the Healix Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // new states for previewing server context/debug info
  const [lastRequest, setLastRequest] = useState<any>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [serverContext, setServerContext] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);

  // compute a sensible font-size based on message length so long messages scale down
  const getFontSize = (text: string) => {
    const len = text?.length || 0;
    if (len > 1200) return '11px';
    if (len > 800) return '12px';
    if (len > 400) return '13px';
    if (len > 200) return '14px';
    return '15px';
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    // Save request for preview
    const requestPayload = { message: userMsg, patientId: null };
    setLastRequest(requestPayload);
    setLastResponse(null);
    setServerContext(null);

    try {
        // Optional quick health-check to give clearer feedback if server not running
        try {
          const h = await fetch(CHATBOT_HEALTH_URL, { method: 'GET' });
          if (!h.ok) {
            // continue, the next call will surface the error
            console.warn('Chatbot health endpoint returned non-ok status');
          }
        } catch (healthErr) {
          // Health endpoint unreachable — surface friendly message but still attempt /api/chat
          console.warn('Chatbot health check failed:', healthErr);
        }

        const resp = await fetch(CHATBOT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        });

        const data = await resp.json();

        // Save response for preview
        setLastResponse({ status: resp.status, body: data });

        if (resp.ok && data.reply) {
            // If backend returns any contextual info (e.g. "context", "debug" or "source"), store it.
            if (data.context || data.debug || data.sources) {
              const ctxParts: string[] = [];
              if (data.context) ctxParts.push(typeof data.context === 'string' ? data.context : JSON.stringify(data.context, null, 2));
              if (data.debug) ctxParts.push(typeof data.debug === 'string' ? data.debug : JSON.stringify(data.debug, null, 2));
              if (data.sources) ctxParts.push('Sources: ' + JSON.stringify(data.sources, null, 2));
              setServerContext(ctxParts.join('\n\n'));
              setShowContext(true);
            }
            setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
        } else {
            const errMsg = data?.error || `Server returned ${resp.status}`;
            setMessages(prev => [...prev, { role: 'bot', text: `Error: ${errMsg}` }]);
            // keep server debug visible if available
            if (data?.debug) setServerContext(typeof data.debug === 'string' ? data.debug : JSON.stringify(data.debug, null, 2));
            setShowContext(true);
        }
    } catch (err: any) {
        // Network / CORS / server down
        const friendly = `Could not reach local chatbot service. Ensure server_chatbot.py is running at ${CHATBOT_API_URL.replace('/api/chat','')} and accepts CORS. Error: ${err?.message || err}`;
        setMessages(prev => [...prev, { role: 'bot', text: friendly }]);
        setServerContext(String(err?.stack || err?.message || err));
        setShowContext(true);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="flex h-[500px] flex-col border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <Bot className="h-5 w-5 text-purple-600" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((msg, i) => (
                <div key={i} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 font-medium leading-relaxed shadow-sm",
                        msg.role === 'user'
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-slate-100 text-slate-800 rounded-bl-none"
                      )}
                      // ensure wrapping and dynamic font-size to avoid overflow
                      style={{
                        maxWidth: '80%',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        fontSize: getFontSize(msg.text),
                        lineHeight: 1.35,
                      }}
                    >
                      {msg.text}
                    </div>
                </div>
            ))}
            {loading && (
                <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3 rounded-bl-none">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 delay-0" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 delay-150" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 delay-300" />
                    </div>
                </div>
            )}
        </div>

        <div className="border-t border-slate-100 p-4">
            <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="relative flex items-center"
            >
                <input 
                    className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-4 pr-12 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <Button 
                    type="submit"
                    size="icon" 
                    className="absolute right-1.5 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700"
                    disabled={!input.trim() || loading}
                >
                    <Send className="h-4 w-4 text-white" />
                </Button>
            </form>

            {/* Context / debug preview — collapsible */ }
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-slate-500">Server Context Preview</div>
              <button
                type="button"
                onClick={() => setShowContext(s => !s)}
                className="text-xs text-teal-600 hover:underline"
              >
                {showContext ? 'Hide' : 'Show'}
              </button>
            </div>
            {showContext && (
              <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs font-mono text-slate-700 max-h-28 overflow-auto">
                <div className="text-xs text-slate-500 mb-1">Last Request</div>
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(lastRequest, null, 2)}</pre>
                <div className="text-xs text-slate-500 mt-2 mb-1">Last Response (status + body)</div>
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(lastResponse, null, 2)}</pre>
                {serverContext && (
                  <>
                    <div className="text-xs text-slate-500 mt-2 mb-1">Server Context / Debug</div>
                    <pre className="whitespace-pre-wrap break-words">{serverContext}</pre>
                  </>
                )}
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
