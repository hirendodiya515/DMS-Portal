import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareCode, Sparkles, Send, X, RotateCcw, Bot, User, Minimize2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

interface Message {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: Date;
}

const DEFAULT_STARTERS = [
    "What can this AI copilot do?",
    "How do I create a draft document?",
    "Explain the document review process"
];

const ROUTE_CONTEXTS: Record<string, { context: string; starters: string[] }> = {
    '/': {
        context: 'Viewing the main dashboard with document stats and shortcuts.',
        starters: ['What do the dashboard stats show?', 'How to see pending reviews?', 'Where are audit logs?']
    },
    '/documents': {
        context: 'Viewing the Documents library page.',
        starters: ['How to upload a new version?', 'Search for SOP documents', 'What does "Reverted to Draft" mean?']
    },
    '/risks': {
        context: 'Viewing the Risks Management module.',
        starters: ['What is the difference between HIRA and EAA?', 'How is risk score calculated?', 'How to add a new risk?']
    },
    '/calibration-equipment': {
        context: 'Viewing the Calibration & Equipment page.',
        starters: ['How to mark an instrument as Maintenance?', 'When is calibration due?', 'Track equipment status']
    },
    '/org-chart': {
        context: 'Viewing the Organization Hierarchy Chart.',
        starters: ['How is the organization structured?', 'How to modify org nodes?', 'Show hierarchy levels']
    },
    '/internal-audit/plan': {
        context: 'Viewing the Internal Audit Planning page.',
        starters: ['How to create an audit plan?', 'Who can be assigned as auditor?', 'Audit lifecycle stages']
    },
    '/context-organization': {
        context: 'Viewing the SWOT Analysis & Context of the Organization page (ISO Clause 4.1).',
        starters: ['Show SWOT analysis strengths', 'What are our SWOT weaknesses?', 'Show SWOT opportunities and threats']
    },
    '/objectives': {
        context: 'Viewing the Quality, Safety, and Environmental Objectives and targets page (ISO Clause 6.2).',
        starters: ['Show quality objectives', 'List environmental objectives', 'What is the target for waste reduction?']
    },
    '/product-deviation': {
        context: 'Viewing the Product Deviations control page (ISO Clause 8.7 & 10.2).',
        starters: ['Show recent product deviations', 'Are there any active deviations?', 'How to report a product deviation?']
    },
    '/process-deviation': {
        context: 'Viewing the Process Deviations control page (ISO Clause 8.7 & 10.2).',
        starters: ['Show process deviation logs', 'What process deviations are currently active?', 'ISO standard for process deviation']
    },
    '/moc': {
        context: 'Viewing the Management of Change (MOC) page (ISO Clause 6.3 & 8.5.6).',
        starters: ['Show active MOC records', 'What is the status of MOC-2026-001?', 'How to draft a change request?']
    }
};

const formatModelName = (name: string): string => {
    if (!name) return 'Local AI';
    const baseName = name.split(':')[0];
    return baseName
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(/([a-zA-Z]+)(\d+)/g, '$1 $2');
};

export default function FloatingAiChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [modelName, setModelName] = useState('Local AI');
    const location = useLocation();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get current context and starters based on route (supporting dynamic prefixes)
    const getRouteConfig = (pathname: string) => {
        if (ROUTE_CONTEXTS[pathname]) return ROUTE_CONTEXTS[pathname];
        if (pathname.startsWith('/product-deviation')) return ROUTE_CONTEXTS['/product-deviation'];
        if (pathname.startsWith('/process-deviation')) return ROUTE_CONTEXTS['/process-deviation'];
        
        return {
            context: `Viewing the page at path: ${pathname}`,
            starters: DEFAULT_STARTERS
        };
    };

    const currentRouteConfig = getRouteConfig(location.pathname);

    // Load initial greeting / session history and fetch active model name
    useEffect(() => {
        const savedHistory = sessionStorage.getItem('dms_ai_chat_history');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                setMessages(parsed.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                })));
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        } else {
            // Default greeting
            setMessages([
                {
                    id: 'greeting',
                    sender: 'ai',
                    text: "Hello! I am your **DMS Copilot** powered by **Local AI** locally. I can help you search documents, explain policies, audit procedures, or guide you through this portal. All conversation data is processed 100% locally and privately.",
                    timestamp: new Date()
                }
            ]);
        }

        const fetchModelName = async () => {
            try {
                const response = await api.get('/ai/model');
                if (response.data && response.data.model) {
                    const formatted = formatModelName(response.data.model);
                    setModelName(formatted);
                    
                    // Also update greeting message if it's still using the default/fallback placeholder
                    setMessages(prev => prev.map(msg => 
                        msg.id === 'greeting' && (msg.text.includes('**Local AI**') || msg.text.includes('**Google Gemma 4**'))
                            ? {
                                ...msg,
                                text: `Hello! I am your **DMS Copilot** powered by **${formatted}** locally. I can help you search documents, explain policies, audit procedures, or guide you through this portal. All conversation data is processed 100% locally and privately.`
                              }
                            : msg
                    ));
                }
            } catch (error) {
                console.error("Failed to fetch active model name:", error);
            }
        };
        fetchModelName();
    }, []);

    // Save history to sessionStorage
    const saveChatHistory = (updatedMessages: Message[]) => {
        setMessages(updatedMessages);
        sessionStorage.setItem('dms_ai_chat_history', JSON.stringify(updatedMessages));
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMessage: Message = {
            id: `msg-${Date.now()}-user`,
            sender: 'user',
            text,
            timestamp: new Date()
        };

        const aiMessageId = `msg-${Date.now()}-ai`;
        const aiPlaceholder: Message = {
            id: aiMessageId,
            sender: 'ai',
            text: '', // Start with empty string
            timestamp: new Date()
        };

        const updatedHistory = [...messages, userMessage];
        setMessages([...updatedHistory, aiPlaceholder]);
        setInputValue('');
        setIsLoading(true);

        let accumulatedText = '';

        try {
            const token = useAuthStore.getState().token;
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            
            const response = await fetch(`${baseUrl}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: text,
                    context: `Current page: ${location.pathname}. Context: ${currentRouteConfig.context}`
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("Response body is not readable");
            }

            const decoder = new TextDecoder('utf-8');
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                accumulatedText += chunk;
                
                // Update messages state dynamically in real-time
                setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg
                ));
            }
            
            // Save the complete session history to sessionStorage
            sessionStorage.setItem('dms_ai_chat_history', JSON.stringify([...updatedHistory, {
                id: aiMessageId,
                sender: 'ai',
                text: accumulatedText,
                timestamp: new Date()
            }]));

        } catch (error: any) {
            console.error("Streaming error:", error);
            const errorText = accumulatedText 
                ? accumulatedText + "\n\n⚠️ Stream connection interrupted. Ensure backend is online."
                : "⚠️ System connection error. Ensure the local AI backend service is online and running.";
            
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId ? { ...msg, text: errorText } : msg
            ));
            
            sessionStorage.setItem('dms_ai_chat_history', JSON.stringify([...updatedHistory, {
                id: aiMessageId,
                sender: 'ai',
                text: errorText,
                timestamp: new Date()
            }]));
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = () => {
        if (window.confirm("Are you sure you want to clear your chat history?")) {
            const resetMessages: Message[] = [
                {
                    id: 'greeting',
                    sender: 'ai',
                    text: "Chat cleared. Ask me anything about your documents, audits, or calibration equipment!",
                    timestamp: new Date()
                }
            ];
            saveChatHistory(resetMessages);
        }
    };

    // Render message with very basic markdown formatting (bold, code blocks)
    const renderMessageText = (text: string) => {
        // Handle code blocks
        const parts = text.split(/(```[\s\S]*?```)/g);
        return parts.map((part, index) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const code = part.slice(3, -3).replace(/^[a-zA-Z]+\n/, ''); // remove language header if present
                return (
                    <pre key={index} className="bg-slate-900 text-slate-100 p-3 rounded-lg my-2 text-xs overflow-x-auto font-mono border border-slate-800 shadow-inner">
                        <code>{code}</code>
                    </pre>
                );
            }

            // Handle inline code `code`
            const inlineParts = part.split(/(`[^`]+`)/g);
            return (
                <span key={index}>
                    {inlineParts.map((subPart, subIndex) => {
                        if (subPart.startsWith('`') && subPart.endsWith('`')) {
                            return <code key={subIndex} className="bg-slate-200 text-rose-600 px-1 py-0.5 rounded text-xs font-mono">{subPart.slice(1, -1)}</code>;
                        }
                        
                        // Handle bold **text**
                        const boldParts = subPart.split(/(\*\*[^*]+\*\*)/g);
                        return boldParts.map((boldPart, boldIndex) => {
                            if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                                return <strong key={boldIndex} className="font-semibold text-slate-900">{boldPart.slice(2, -2)}</strong>;
                            }
                            return boldPart;
                        });
                    })}
                </span>
            );
        });
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="w-96 h-[500px] mb-4 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shadow-md">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-300">
                                    <Sparkles size={18} className="animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm leading-none flex items-center gap-1.5">
                                        DMS AI Copilot
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                    </h3>
                                    <span className="text-[10px] text-slate-300">{modelName} Local (Online)</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={handleClearChat}
                                    title="Clear Chat History"
                                    className="p-1 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors"
                                >
                                    <RotateCcw size={16} />
                                </button>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    title="Minimize Chat"
                                    className="p-1 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors"
                                >
                                    <Minimize2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Message Panel */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                            {messages.map((msg) => {
                                // Skip empty placeholder messages from showing up as empty bubbles
                                if (msg.sender === 'ai' && !msg.text) return null;
                                return (
                                    <div 
                                        key={msg.id} 
                                        className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {msg.sender === 'ai' && (
                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                                                <Bot size={15} />
                                            </div>
                                        )}
                                        <div 
                                            className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                                                msg.sender === 'user' 
                                                    ? 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-tr-none' 
                                                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                            }`}
                                        >
                                            <div className="break-words leading-relaxed whitespace-pre-wrap">
                                                {renderMessageText(msg.text)}
                                            </div>
                                            <div className={`text-[9px] mt-1.5 text-right ${msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        {msg.sender === 'user' && (
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 shadow-sm">
                                                <User size={15} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Typing Indicator - only show while waiting for the first stream chunk */}
                            {isLoading && (messages.length === 0 || !messages[messages.length - 1].text) && (
                                <div className="flex gap-2.5 justify-start">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                                        <Bot size={15} />
                                    </div>
                                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Starter Pills */}
                        {messages.length <= 2 && !isLoading && (
                            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5">
                                {currentRouteConfig.starters.map((starter, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(starter)}
                                        className="text-[11px] text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-100/50 rounded-full px-2.5 py-1 text-left transition-colors cursor-pointer"
                                    >
                                        {starter}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Footer Input */}
                        <form 
                            onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
                            className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center"
                        >
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ask DMS Copilot..."
                                disabled={isLoading}
                                className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-800 border border-slate-200/80 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isLoading}
                                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors flex items-center justify-center shadow-md shadow-indigo-600/10 shrink-0 cursor-pointer"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Floating Action Button */}
            <motion.button
                layout
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:shadow-indigo-500/10 border border-slate-700/50 relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <X size={24} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="chat"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center justify-center relative"
                        >
                            <MessageSquareCode size={24} className="text-slate-100" />
                            {/* Little glowing sparkles indicator */}
                            <span className="absolute -top-1 -right-1 bg-indigo-500 text-[8px] p-0.5 rounded-full border border-slate-900 shadow-sm animate-pulse">
                                <Sparkles size={8} className="text-white" />
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    );
}
