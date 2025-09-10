'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  transactionCreated?: boolean;
  transactionType?: 'income' | 'expense' | 'savings' | 'investment';
  multipleTransactionsCreated?: boolean;
  transactionCount?: number;
  isLoading?: boolean;
}

export default function FloatingChat() {
  const { refreshAll } = useFinancialData();
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI financial assistant. I can help you with:\n\n**📝 Recording Transactions**\n• Single: "Gajian 8 juta" or "Beli kopi 50k"\n• Multiple: "hari ini aku beli kopi 50k, makan di warteg 10k, terus dapat gaji 1 juta"\n\n**📊 Data Analysis**\n• Time-based: "Analisis pengeluaran hari ini" or "Breakdown minggu ini" or "Ringkasan bulan ini"\n• Category-specific: "Analisis pengeluaran makanan saya" or "Breakdown transportasi"\n• General: "Berapa total pengeluaran?" or "Tampilkan breakdown kategori belanja"\n\n**⏰ Time Periods Supported**\n• Today: "hari ini", "today", "sekarang"\n• Weekly: "minggu ini", "this week", "seminggu"\n• Monthly: "bulan ini", "this month", "sebulan"\n• All-time: No time keywords (default)\n\n**💡 Financial Tips**\n• Budget recommendations\n• Spending insights\n• Savings advice\n\n**🔄 Follow-up Questions**\nI remember our conversation context, so you can ask follow-up questions like "Bagaimana dengan kategori lain?" or "Bandingkan dengan bulan lalu"\n\nTry asking me anything about your finances!',
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: userMessage,
      timestamp: new Date(),
      isUser: true
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsLoading(true);

    // Add loading message
    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: 'Thinking...',
      timestamp: new Date(),
      isUser: false,
      isLoading: true
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Prepare conversation history (last 2 exchanges for context)
      const conversationHistory = messages
        .slice(-4) // Get last 4 messages (2 exchanges)
        .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.text}`)
        .join(' | ');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          action: 'chat',
          conversationHistory: conversationHistory || undefined
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 2).toString(),
          text: data.data.response,
          timestamp: new Date(),
          isUser: false,
          transactionCreated: !!data.data.transactionCreated,
          transactionType: data.data.transactionCreated?.type || 
            (data.data.transactionCreated?.amount ? 
              (data.data.transactionCreated.category ? 'expense' : 'income') : undefined),
          multipleTransactionsCreated: !!data.data.multipleTransactionsCreated,
          transactionCount: data.data.multipleTransactionsCreated?.successCount
        };

        // Replace loading message with actual response
        setMessages(prev => prev.map(msg => 
          msg.isLoading ? aiResponse : msg
        ));

        // If transactions were created, refresh all dashboard data
        if (data.data.transactionCreated || data.data.multipleTransactionsCreated) {
          console.log('AI created transaction(s), refreshing dashboard data...');
          
          // Add a brief delay to let the user see the success message, then refresh
          setTimeout(() => {
            refreshAll().then(() => {
              console.log('Dashboard data refreshed after AI transaction(s)');
            }).catch((error) => {
              console.error('Error refreshing data after AI transaction(s):', error);
            });
          }, 500);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 2).toString(),
        text: 'Sorry, I had trouble processing your message. Please try again.',
        timestamp: new Date(),
        isUser: false
      };

      setMessages(prev => prev.map(msg => 
        msg.isLoading ? errorResponse : msg
      ));
    } finally {
      setIsLoading(false);
    }
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

  // Format message text with better styling
  const formatMessageText = (text: string) => {
    // Split text into lines and process each line
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      // Handle empty lines
      if (line.trim() === '') {
        return <br key={index} />;
      }
      
      // Handle headers (lines starting with **)
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <div key={index} className="font-semibold text-slate-900 dark:text-white mb-2 mt-3 first:mt-0">
            {line.slice(2, -2)}
          </div>
        );
      }
      
      // Handle bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <div key={index} className="flex items-start mb-1">
            <span className="text-slate-600 dark:text-slate-400 mr-2 mt-0.5">•</span>
            <span className="flex-1">{line.slice(2)}</span>
          </div>
        );
      }
      
      // Handle numbered lists
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={index} className="flex items-start mb-1">
            <span className="text-slate-600 dark:text-slate-400 mr-2 mt-0.5 font-medium">
              {line.match(/^\d+/)?.[0]}.
            </span>
            <span className="flex-1">{line.replace(/^\d+\.\s/, '')}</span>
          </div>
        );
      }
      
      // Handle currency formatting (Rp X,XXX,XXX)
      const formattedLine = line.replace(/Rp\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g, (match, amount) => {
        const cleanAmount = amount.replace(/[.,]/g, '');
        const formattedAmount = new Intl.NumberFormat('id-ID').format(parseInt(cleanAmount));
        return `Rp ${formattedAmount}`;
      });
      
      // Regular paragraph
      return (
        <div key={index} className="mb-2 last:mb-0">
          {formattedLine}
        </div>
      );
    });
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
                      : `bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-md border border-slate-200 dark:border-slate-600 ${
                          (message.transactionCreated || message.multipleTransactionsCreated) ? 'border-green-300 dark:border-green-600' : ''
                        }`
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-1">
                      <div className={`text-xs sm:text-sm leading-relaxed ${message.isLoading ? 'animate-pulse' : ''}`}>
                        {formatMessageText(message.text)}
                      </div>
                      {message.transactionCreated && (
                        <div className="flex items-center space-x-1 mt-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {message.transactionType === 'income' ? 'Income added' : 
                             message.transactionType === 'expense' ? 'Expense recorded' :
                             message.transactionType === 'savings' ? 'Transferred to savings' :
                             message.transactionType === 'investment' ? 'Transferred to investment' : 'Transaction saved'}
                          </span>
                        </div>
                      )}
                      {message.multipleTransactionsCreated && (
                        <div className="flex items-center space-x-1 mt-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {message.transactionCount} transaction(s) processed successfully
                          </span>
                        </div>
                      )}
                    </div>
                    {(message.transactionCreated || message.multipleTransactionsCreated) && (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
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
              placeholder="Tell me about your income, expenses, or transfers..."
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-transparent text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none text-sm sm:text-base"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
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
