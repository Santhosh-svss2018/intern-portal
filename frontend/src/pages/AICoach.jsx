import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  FileText,
  Lightbulb,
  CheckCircle2,
  Building2,
  HelpCircle,
  Send,
  MessageSquare,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Bot,
  User,
  ArrowRight,
  Code2,
  BookOpen,
  Compass
} from 'lucide-react';

// Lightweight Markdown Formatter
function MarkdownRenderer({ content }) {
  if (!content) return null;
  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="bg-slate-900 text-slate-100 p-3.5 rounded-lg text-xs overflow-x-auto my-2.5 font-mono border border-slate-800"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-slate-900 mt-3.5 mb-1.5 flex items-center gap-1.5">
          {formatInline(line.replace('### ', ''))}
        </h4>
      );
    } else if (line.startsWith('#### ')) {
      elements.push(
        <h5 key={`h4-${i}`} className="text-xs font-bold text-indigo-900 uppercase tracking-wider mt-3 mb-1">
          {formatInline(line.replace('#### ', ''))}
        </h5>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-base font-bold text-slate-900 mt-4 mb-2">
          {formatInline(line.replace('## ', ''))}
        </h3>
      );
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <li key={`li-${i}`} className="ml-4 list-disc text-xs text-slate-700 leading-relaxed my-0.5">
          {formatInline(line.trim().substring(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line.trim())) {
      const text = line.trim().replace(/^\d+\.\s/, '');
      elements.push(
        <li key={`ol-${i}`} className="ml-4 list-decimal text-xs text-slate-700 leading-relaxed my-0.5">
          {formatInline(text)}
        </li>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={`br-${i}`} className="h-1.5" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-xs text-slate-700 leading-relaxed my-1">
          {formatInline(line)}
        </p>
      );
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function formatInline(text) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return (
        <em key={idx} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[11px] font-semibold border border-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

const SUGGESTED_PROMPTS = [
  {
    title: '30-Day Learning Plan',
    prompt: 'Act as an AI career coach for college students. Create a personalized 30-day learning plan for a third-year Computer Science student who knows HTML, CSS, JavaScript basics and wants to become a full-stack developer with Python. Include weekly goals, daily tasks, one mini-project, and interview preparation.',
    badge: 'Roadmap'
  },
  {
    title: 'Resume Bullet Optimizer',
    prompt: 'How do I optimize my software engineering resume bullets using the Google X-Y-Z formula? Give me 3 concrete before-and-after examples for full-stack web projects.',
    badge: 'Resume'
  },
  {
    title: 'STAR Method Interview Prep',
    prompt: 'Give me 5 common behavioral interview questions for tech internships and explain how to structure answers using the STAR method with real project examples.',
    badge: 'Interviews'
  },
  {
    title: 'Backend Mastery for Top Tech',
    prompt: 'What core backend concepts and system design patterns should I master to pass software engineering intern screens at companies like Stripe and Datadog?',
    badge: 'Technical'
  }
];

export default function AICoach() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'resume' | 'interview'

  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [chatError, setChatError] = useState(null);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef(null);

  // Resume State
  const [resumeText, setResumeText] = useState(user?.profile?.resume_text || '');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Question generator state
  const [targetCompany, setTargetCompany] = useState('Stripe');
  const [targetRole, setTargetRole] = useState('Software Engineering Intern');
  const [generatedQuestion, setGeneratedQuestion] = useState(null);
  const [questionLoading, setQuestionLoading] = useState(false);

  // Mock answer practice
  const [studentAnswer, setStudentAnswer] = useState('');
  const [answerFeedback, setAnswerFeedback] = useState('');
  const [evaluating, setEvaluating] = useState(false);

  // Load chat history on mount
  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    if (user?.profile?.resume_text && !resumeText) {
      setResumeText(user.profile.resume_text);
    }
  }, [user]);

  // Auto-scroll when messages update
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatLoading, activeTab]);

  const fetchChatHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/ai/chat/history');
      if (res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.warn('Could not load chat history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || chatLoading) return;

    setChatError(null);
    setInputMessage('');
    setLastFailedMessage(null);

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setChatLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: text,
        history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
      });

      const assistantMsg = {
        id: `ai-${Date.now()}`,
        role: 'model',
        content: res.data.response,
        model: res.data.model,
        provider: res.data.provider,
        created_at: res.data.created_at || new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg =
        err.response?.data?.detail || 'Unable to connect to Gemini AI. Please check your internet or retry.';
      setChatError(errorMsg);
      setLastFailedMessage(text);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = async () => {
    try {
      await api.delete('/ai/chat/history');
      setMessages([]);
      setShowClearConfirm(false);
      setChatError(null);
    } catch (err) {
      console.error('Failed to clear chat:', err);
      alert('Unable to clear chat history.');
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAnalyzeResume = async (e) => {
    e.preventDefault();
    if (!resumeText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await api.post('/ai/analyze-resume', { resume_text: resumeText });
      setAnalysisResult(res.data);
    } catch (err) {
      console.error(err);
      alert('Unable to analyze resume. Please ensure backend AI service is running.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateQuestion = async (e) => {
    e.preventDefault();
    setQuestionLoading(true);
    setAnswerFeedback('');
    try {
      const res = await api.post('/ai/generate-questions', {
        company_name: targetCompany,
        role_title: targetRole
      });
      setGeneratedQuestion(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleEvaluateAnswer = async () => {
    if (!studentAnswer.trim()) return;
    setEvaluating(true);
    try {
      const res = await api.post('/ai/evaluate-answer', {
        company_name: targetCompany,
        role_title: targetRole,
        question: generatedQuestion?.question,
        answer: studentAnswer
      });
      setAnswerFeedback(res.data.feedback);
    } catch (err) {
      console.error(err);
      setAnswerFeedback('Answer evaluation service is currently unavailable.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <AppLayout activeTab="ai-coach" title="AI Career Coach & Interview Studio" breadcrumbs={['AI Coach']}>
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">InternConnect Gemini AI Career Coach</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                  Google Gemini 3.8 Flash • Online
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Intelligent conversational coach for technical roadmaps, resume feedback, and interview preparation.
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold self-stretch md:self-auto">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Gemini Coach</span>
            </button>
            <button
              onClick={() => setActiveTab('resume')}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'resume'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Resume Analyzer</span>
            </button>
            <button
              onClick={() => setActiveTab('interview')}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'interview'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Interview Studio</span>
            </button>
          </div>
        </div>

        {/* TAB 1: GEMINI AI CAREER CHATBOT */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[700px] overflow-hidden">
            {/* Chat Sub-header */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">Career & Technical Guidance Thread</span>
                <span className="text-[11px] text-slate-400">• Persistent & Scoped</span>
              </div>

              {messages.length > 0 && (
                <div className="relative">
                  {showClearConfirm ? (
                    <div className="flex items-center gap-1.5 animate-fade-in">
                      <span className="text-[11px] text-slate-600 font-medium">Clear all messages?</span>
                      <button
                        onClick={handleClearChat}
                        className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 cursor-pointer"
                      >
                        Yes, Clear
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px] font-semibold hover:bg-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="text-xs text-slate-500 hover:text-red-600 font-medium flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                      title="Clear chat history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Thread</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/30">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs font-medium">Loading conversation history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto py-8 space-y-4 animate-fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                    <Sparkles className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">How can I help your tech career today?</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Ask me for full-stack roadmaps, resume critiques, STAR interview answers, or guidance on landing
                      software engineering internships.
                    </p>
                  </div>

                  {/* Suggested Prompts Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left pt-2">
                    {SUGGESTED_PROMPTS.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(item.prompt)}
                        className="p-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl text-left hover:shadow-xs transition-all cursor-pointer group space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                            {item.badge}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-xs font-semibold text-slate-800 line-clamp-2">{item.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id || index}
                        className={`flex items-start gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                            isUser
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white'
                          }`}
                        >
                          {isUser ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-teal-300" />
                          )}
                        </div>

                        {/* Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3.5 shadow-xs relative group ${
                            isUser
                              ? 'bg-indigo-600 text-white rounded-tr-none'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                          }`}
                        >
                          {!isUser && (
                            <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-100">
                              <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                                <span>Gemini Career Coach</span>
                                <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {msg.model || 'gemini-3.8-flash'}
                                </span>
                              </span>
                              <button
                                onClick={() => handleCopy(msg.content, msg.id || index)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                                title="Copy to clipboard"
                              >
                                {copiedId === (msg.id || index) ? (
                                  <Check className="w-3.5 h-3.5 text-teal-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}

                          {isUser ? (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <MarkdownRenderer content={msg.content} />
                          )}

                          {msg.created_at && (
                            <div
                              className={`text-[9px] mt-1.5 ${
                                isUser ? 'text-indigo-200 text-right' : 'text-slate-400 text-right'
                              }`}
                            >
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {chatLoading && (
                    <div className="flex items-start gap-3 animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-4 h-4 text-teal-300 animate-spin" />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-xs space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></span>
                          <span
                            className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"
                            style={{ animationDelay: '0.15s' }}
                          ></span>
                          <span
                            className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"
                            style={{ animationDelay: '0.3s' }}
                          ></span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Gemini is formulating your career advice...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error Notification with Retry */}
                  {chatError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start justify-between gap-3 animate-fade-in">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-red-900">Communication Error</p>
                          <p className="text-xs text-red-700 mt-0.5">{chatError}</p>
                        </div>
                      </div>
                      {lastFailedMessage && (
                        <button
                          onClick={() => handleSendMessage(lastFailedMessage)}
                          className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer shrink-0"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Quick Prompt Chips (when in thread) */}
            {messages.length > 0 && (
              <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  Quick Prompts:
                </span>
                {SUGGESTED_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    disabled={chatLoading}
                    onClick={() => handleSendMessage(p.prompt)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[11px] font-medium shrink-0 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white">
              <div className="flex items-end gap-2.5">
                <div className="flex-1 relative">
                  <textarea
                    rows={2}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={chatLoading}
                    placeholder="Ask Gemini about tech internships, interview questions, resume bullets, or roadmaps..."
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 p-3 pr-8 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all resize-none leading-relaxed"
                  />
                  <div className="absolute right-2.5 bottom-3 text-[10px] text-slate-400 pointer-events-none">
                    {inputMessage.length > 0 && `${inputMessage.length}/4000`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={chatLoading || !inputMessage.trim()}
                  className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 shrink-0 h-[48px]"
                  title="Send message (Enter)"
                >
                  {chatLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
                <span>Enter to send • Shift + Enter for new line</span>
                <span>InternConnect AI Career Assistant • Powered by Google Gemini</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESUME SKILL EXTRACTION & GAP DIAGNOSTIC */}
        {activeTab === 'resume' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Resume Skill Extraction & Gap Analysis</h3>
                  <p className="text-xs text-slate-500">
                    Parse your experience against high-demand tech skills in the InternConnect portal.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                NLP Semantic Parser
              </span>
            </div>

            <form onSubmit={handleAnalyzeResume} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resume Highlights or Coursework Projects
                </label>
                <textarea
                  rows={6}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your education, skills, and work achievements here..."
                  className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={analyzing}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-70"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Analyzing Competency Vectors...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-300" />
                    <span>Analyze Skills & Optimize Profile</span>
                  </>
                )}
              </button>
            </form>

            {/* Analysis Results Display */}
            {analysisResult && (
              <div className="pt-4 border-t border-slate-100 space-y-4 animate-slide-up">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Extracted Core Competencies</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold">
                    Profile Strength: {analysisResult.score}%
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.extracted_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Recommendations */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                    <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Recommended Enhancements for Top-Tier Match:</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-600 list-disc list-inside leading-relaxed pl-1">
                    {analysisResult.suggested_improvements.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TECHNICAL MOCK INTERVIEW SIMULATOR */}
        {activeTab === 'interview' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Technical Interview Simulator</h3>
                  <p className="text-xs text-slate-500">
                    Practice company-specific interview prompts and get instant architectural critique.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Live Simulator
              </span>
            </div>

            <form onSubmit={handleGenerateQuestion} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Company</label>
                  <select
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Stripe">Stripe</option>
                    <option value="Google">Google</option>
                    <option value="Meta">Meta</option>
                    <option value="Datadog">Datadog</option>
                    <option value="Figma">Figma</option>
                    <option value="Notion">Notion</option>
                    <option value="Snowflake">Snowflake</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Role</label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={questionLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-70"
              >
                {questionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Synthesizing Interview Question...</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4 text-teal-300" />
                    <span>Generate Company-Specific Technical Question</span>
                  </>
                )}
              </button>
            </form>

            {/* Generated Question Result */}
            {generatedQuestion && (
              <div className="pt-4 border-t border-slate-100 space-y-3.5 animate-slide-up">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-indigo-700 font-bold">
                    <span>{generatedQuestion.round_type || 'System Design Round'}</span>
                    <span className="text-slate-500 font-semibold">{generatedQuestion.company_name}</span>
                  </div>
                  <p className="text-slate-900 font-semibold leading-relaxed text-sm">
                    "{generatedQuestion.question}"
                  </p>
                  {generatedQuestion.sample_answer_hint && (
                    <p className="text-slate-500 italic mt-1 leading-relaxed">
                      💡 Hint: {generatedQuestion.sample_answer_hint}
                    </p>
                  )}
                </div>

                {/* Practice Answering Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Draft Your Technical Response
                  </label>
                  <textarea
                    rows={4}
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                    placeholder="Outline your architectural components, data model, trade-offs, and failure recoveries..."
                    className="w-full text-xs rounded-lg border border-slate-200 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={evaluating || !studentAnswer.trim()}
                      onClick={handleEvaluateAnswer}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {evaluating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Evaluating with AI...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Submit for AI Evaluation
                        </>
                      )}
                    </button>
                  </div>

                  {answerFeedback && (
                    <div className="p-3.5 bg-teal-50 text-teal-900 border border-teal-200 rounded-xl text-xs leading-relaxed font-medium animate-slide-up space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-teal-800">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        <span>AI Architectural Critique:</span>
                      </div>
                      <p>{answerFeedback}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
