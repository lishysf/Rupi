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
          text: data.message || data.data?.response || 'Transaction completed successfully!',
          timestamp: new Date(),
          isUser: false,
          transactionCreated: !!data.data?.transactionCreated,
          transactionType: data.data?.transactionCreated?.type || 
            (data.data?.transactionCreated?.amount ? 
              (data.data?.transactionCreated.category ? 'expense' : 'income') : undefined),
          multipleTransactionsCreated: !!data.data?.multipleTransactionsCreated,
          transactionCount: data.data?.multipleTransactionsCreated?.successCount
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
    // Handle undefined or null text
    if (!text) return '';
    
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
          <div key={index} className="font-semibold text-neutral-900 dark:text-white mb-2 mt-3 first:mt-0">
            {line.slice(2, -2)}
          </div>
        );
      }
      
      // Handle bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <div key={index} className="flex items-start mb-1">
            <span className="text-neutral-600 dark:text-neutral-400 mr-2 mt-0.5">•</span>
            <span className="flex-1">{line.slice(2)}</span>
          </div>
        );
      }
      
      // Handle numbered lists
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={index} className="flex items-start mb-1">
            <span className="text-neutral-600 dark:text-neutral-400 mr-2 mt-0.5 font-medium">
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
        <div className="mb-4 w-full bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl border border-neutral-200/50 dark:border-neutral-700/50 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 backdrop-blur-xl">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-700/50 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">AI Assistant</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Online</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </button>
          </div>

          {/* Chat Messages */}
          <div 
            ref={chatHistoryRef}
            className="h-48 sm:h-64 md:h-72 overflow-y-auto p-4 space-y-4 bg-neutral-50/50 dark:bg-neutral-900/30"
          >
            {messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const isDifferentSender = prevMessage && prevMessage.isUser !== message.isUser;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} ${isDifferentSender ? 'mt-6' : 'mt-1'}`}
                >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] ${
                    message.isUser
                      ? 'bg-emerald-500 text-white rounded-2xl rounded-br-md shadow-sm'
                      : `bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white rounded-2xl rounded-bl-md shadow-sm border border-neutral-200/50 dark:border-neutral-600/50 ${
                          (message.transactionCreated || message.multipleTransactionsCreated) ? 'border-green-300 dark:border-green-600' : ''
                        }`
                  }`}
                >
                  <div className="px-4 py-3">
                    <div className="flex-1">
                      <div className={`text-sm leading-relaxed ${message.isLoading ? 'animate-pulse' : ''}`}>
                        {formatMessageText(message.text)}
                      </div>
                      {message.transactionCreated && (
                        <div className="flex items-center space-x-1 mt-2">
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
                        <div className="flex items-center space-x-1 mt-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {message.transactionCount} transaction(s) processed successfully
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`px-4 pb-2 ${
                    message.isUser 
                      ? 'text-right' 
                      : 'text-left'
                  }`}>
                    <p className={`text-xs ${
                      message.isUser 
                        ? 'text-emerald-100' 
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
        )}

        {/* Chat Input */}
        <div className="relative">
          <div className="flex items-center bg-white dark:bg-neutral-800 rounded-3xl shadow-lg border border-neutral-200/50 dark:border-neutral-700/50 p-3 w-full backdrop-blur-sm">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={handleInputFocus}
              placeholder="Message..."
              className="flex-1 px-3 py-2 bg-transparent text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 text-white rounded-full transition-all duration-200 disabled:cursor-not-allowed flex-shrink-0 shadow-sm hover:shadow-md disabled:shadow-none"
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
