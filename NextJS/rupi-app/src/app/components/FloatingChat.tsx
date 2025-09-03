'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
}

export default function FloatingChat() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI assistant. How can I help you with your finances today?',
      timestamp: new Date(),
      isUser: false
    }
  ]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue,
      timestamp: new Date(),
      isUser: true
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(inputValue),
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const getAIResponse = (userMessage: string): string => {
    const responses = [
      "I can help you analyze your spending patterns. Would you like me to review your recent transactions?",
      "Based on your budget, I notice you're doing well with your savings goals this month!",
      "Let me help you categorize that expense and suggest ways to optimize your budget.",
      "I see you're interested in your financial health. Your current score looks good! Keep up the great work.",
      "Would you like me to create a personalized budget recommendation based on your spending habits?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputFocus = () => {
    setIsExpanded(true);
  };

  const handleClose = () => {
    setIsExpanded(false);
    inputRef.current?.blur();
  };

  return (
    <>
      {/* Blurred Background Overlay */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={handleClose}
        />
      )}

      <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl px-3 sm:px-4 md:px-0">
        {/* Chat History Bubble */}
        {isExpanded && (
        <div className="mb-4 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-500 to-blue-500">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <h3 className="text-sm sm:text-base font-semibold text-white">AI Assistant</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Chat Messages */}
          <div 
            ref={chatHistoryRef}
            className="h-48 sm:h-64 md:h-72 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-slate-50 dark:bg-slate-900/50"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] p-2 sm:p-3 rounded-2xl ${
                    message.isUser
                      ? 'bg-emerald-500 text-white rounded-br-md'
                      : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-md border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <p className="text-xs sm:text-sm leading-relaxed">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.isUser 
                      ? 'text-emerald-100' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Chat Input */}
        <div className="relative">
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-full shadow-2xl border border-slate-200 dark:border-slate-700 p-2 w-full">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={handleInputFocus}
              placeholder="Ask about your finances..."
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-transparent text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none text-sm sm:text-base"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="p-2 sm:p-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-full transition-colors disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Floating indicator when collapsed */}
          {!isExpanded && (
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>
    </>
  );
}
