'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, CheckCircle, AlertCircle, Receipt, MessageSquare, Plus, MinusCircle, PlusCircle, PiggyBank, ArrowLeftRight } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import TransactionEditModal from './TransactionEditModal';
import AddTransactionModal from './AddTransactionModal';
import SavingsTransactionModal from './SavingsTransactionModal';
import WalletTransferModal from './WalletTransferModal';
import MultipleTransactionEditModal from './MultipleTransactionEditModal';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  transactionCreated?: boolean;
  transactionType?: 'income' | 'expense' | 'savings';
  multipleTransactionsCreated?: boolean;
  transactionCount?: number;
  isLoading?: boolean;
  pendingTransaction?: {
    type: 'income' | 'expense' | 'savings' | 'transfer';
    description: string;
    amount: number;
    category?: string;
    source?: string;
    walletName?: string;
    goalName?: string;
    fromWalletName?: string;
    toWalletName?: string;
    adminFee?: number;
  };
  pendingTransactions?: any[];
  showConfirmation?: boolean;
  showMultipleConfirmation?: boolean;
}

export default function FloatingChat() {
  const { refreshAll, refreshAfterTransaction } = useFinancialData();
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTransactionMode, setIsTransactionMode] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [multipleEditModalOpen, setMultipleEditModalOpen] = useState(false);
  const [editingMultipleTransactions, setEditingMultipleTransactions] = useState<{ transactions: any[], messageId: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<'income' | 'expense'>('expense');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSavingsModal, setShowSavingsModal] = useState<null | 'deposit' | 'withdrawal'>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Hi! I\'m your AI financial assistant.\n\n**Transaction Type**\n\nSingle: Beli Kopi 50k Pakai BCA\n\nMultiple: Beli Baju 100k Pakai BCA, Beli Sapu 50k Pakai Gopay, Gajian 1 Juta ke BCA\n\nIncome: Gajian 10 juta ke BCA\n\nExpense: Beli Kopi 50k Pakai BCA\n\nSavings: Nabung 2 Juta dari BCA\n\nTransfer: Transfer 3 juta dari BCA ke Mandiri biaya admin 1k (bisa spesifik biaya admin)\n\n**Tips**\n• Sertakan wallet yg ada/metode pembayaran yg ada: "pake BCA", "via Gopay", "tunai"\n• Bisa Bahasa Indonesia & Inggris\n\nCoba: "Beli kopi 30k pake Gopay"',
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

    // Optimize state updates by batching them
    setMessages(prev => {
      const loadingMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Thinking...',
        timestamp: new Date(),
        isUser: false,
        isLoading: true
      };
      return [...prev, newMessage, loadingMessage];
    });
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare conversation history (last 2 exchanges for context)
      const conversationHistory = messages
        .slice(-4) // Get last 4 messages (2 exchanges)
        .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.text}`)
        .join(' | ');

      const requestBody = {
        message: userMessage,
        action: 'chat',
        conversationHistory: conversationHistory || undefined,
        isTransactionMode: isTransactionMode
      };
      
      console.log('🔍 Frontend Debug - Sending isTransactionMode:', isTransactionMode, 'type:', typeof isTransactionMode);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 2).toString(),
          text: data.data?.response || data.message || 'Transaction completed successfully!',
          timestamp: new Date(),
          isUser: false,
          transactionCreated: !!data.data?.transactionCreated,
          transactionType: data.data?.transactionCreated?.type || 
            (data.data?.transactionCreated?.amount ? 
              (data.data?.transactionCreated.category ? 'expense' : 'income') : undefined),
          multipleTransactionsCreated: !!data.data?.multipleTransactionsCreated,
          transactionCount: data.data?.multipleTransactionsCreated?.successCount,
          pendingTransaction: data.data?.pendingTransaction,
          pendingTransactions: data.data?.pendingTransactions,
          showConfirmation: isTransactionMode && !!data.data?.pendingTransaction,
          showMultipleConfirmation: isTransactionMode && !!data.data?.pendingTransactions
        };

        // Replace loading message with actual response
        setMessages(prev => prev.map(msg => 
          msg.isLoading ? aiResponse : msg
        ));

        // If transactions were created, refresh dashboard data immediately (no delay)
        if (data.data.transactionCreated || data.data.multipleTransactionsCreated) {
          console.log('AI created transaction(s), refreshing dashboard data...');
          // Fast path: refresh recent transactions + wallets without delay
          refreshAfterTransaction()
            .then(() => console.log('Dashboard data refreshed after AI transaction(s)'))
            .catch((error) => console.error('Error refreshing data after AI transaction(s):', error));
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

  const handleConfirmTransaction = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.pendingTransaction) return;

    setIsLoading(true);
    
    try {
      // Create the actual transaction
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Confirm transaction: ${message.pendingTransaction.description}`,
          action: 'confirm_transaction',
          transactionData: message.pendingTransaction
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update the message to show it's confirmed
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                showConfirmation: false, 
                transactionCreated: true,
                text: `✅ Transaction confirmed: ${message.pendingTransaction?.description} for Rp${message.pendingTransaction?.amount.toLocaleString()}`
              }
            : msg
        ));

        // Refresh dashboard data
        refreshAfterTransaction();
      } else {
        throw new Error(data.error || 'Failed to confirm transaction');
      }
    } catch (error) {
      console.error('Error confirming transaction:', error);
      // Show error message
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              showConfirmation: false,
              text: `❌ Failed to confirm transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTransaction = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.pendingTransaction) return;

    // Open the edit modal and store the message ID for later
    setEditingTransaction({ ...message.pendingTransaction, messageId });
    setEditModalOpen(true);
  };

  const handleSaveEditedTransaction = async (updatedTransaction: any) => {
    setIsLoading(true);
    setEditModalOpen(false);
    
    try {
      // Create the actual transaction with updated data
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Confirm edited transaction: ${updatedTransaction.description}`,
          action: 'confirm_transaction',
          transactionData: updatedTransaction
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Add a new message showing the edited transaction was confirmed
        const confirmationMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `✅ Transaction edited and confirmed: ${updatedTransaction.description} for Rp${updatedTransaction.amount.toLocaleString()}`,
          timestamp: new Date(),
          isUser: false,
          transactionCreated: true
        };
        
        setMessages(prev => [...prev, confirmationMessage]);
        refreshAfterTransaction();
      } else {
        throw new Error(data.error || 'Failed to confirm edited transaction');
      }
    } catch (error) {
      console.error('Error confirming edited transaction:', error);
      // Show error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `❌ Failed to save edited transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        isUser: false
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmMultipleTransactions = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.pendingTransactions) return;

    setIsLoading(true);
    
    try {
      // Use the new batch API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Confirm multiple transactions`,
          action: 'confirm_multiple_transactions',
          transactionsData: message.pendingTransactions
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const successCount = data.data.successCount || 0;
        const failCount = data.data.failCount || 0;
        
        // Update the message to show results
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                showMultipleConfirmation: false,
                text: `✅ Confirmed ${successCount} transaction(s) successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
                multipleTransactionsCreated: true,
                transactionCount: successCount
              }
            : msg
        ));

        // Refresh dashboard data
        if (successCount > 0) {
          refreshAfterTransaction();
        }
      } else {
        throw new Error(data.error || 'Failed to confirm transactions');
      }
    } catch (error) {
      console.error('Error confirming multiple transactions:', error);
      // Show error message
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              showMultipleConfirmation: false,
              text: `❌ Failed to confirm transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMultipleTransactions = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.pendingTransactions) return;

    // Open the multiple transaction edit modal
    setEditingMultipleTransactions({ transactions: message.pendingTransactions, messageId });
    setMultipleEditModalOpen(true);
  };

  const handleSaveMultipleEditedTransactions = async (updatedTransactions: any[]) => {
    setIsLoading(true);
    setMultipleEditModalOpen(false);
    
    try {
      // Confirm all edited transactions using the batch API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Confirm edited multiple transactions`,
          action: 'confirm_multiple_transactions',
          transactionsData: updatedTransactions
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const successCount = data.data.successCount || 0;
        const failCount = data.data.failCount || 0;
        
        // Add a new message showing the edited transactions were confirmed
        const confirmationMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `✅ Successfully edited and confirmed ${successCount} transaction(s)!${failCount > 0 ? ` ${failCount} failed.` : ''}`,
          timestamp: new Date(),
          isUser: false,
          multipleTransactionsCreated: true,
          transactionCount: successCount
        };
        
        setMessages(prev => [...prev, confirmationMessage]);
        refreshAfterTransaction();
      } else {
        throw new Error(data.error || 'Failed to confirm edited transactions');
      }
    } catch (error) {
      console.error('Error confirming edited transactions:', error);
      // Show error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `❌ Failed to save edited transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        isUser: false
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setEditingMultipleTransactions(null);
    }
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
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 animate-in fade-in duration-200"
          onClick={handleClose}
        />
      )}

      <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-sm sm:max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl px-3 sm:px-4 md:px-0">
        {/* Chat History Bubble */}
        {isExpanded && (
        <div className="mb-4 w-full bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl border border-neutral-200/50 dark:border-neutral-700/50 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-700/50 bg-white/80 dark:bg-neutral-800/80">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">AI Assistant</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Your financial companion
                </p>
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
            className="h-90 sm:h-90 md:h-90 overflow-y-auto p-4 space-y-4 bg-neutral-50/50 dark:bg-neutral-900/30"
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
                             message.transactionType === 'savings' ? 'Transferred to savings' : 'Transaction saved'}
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
                      {message.showConfirmation && message.pendingTransaction && (
                        <div className="mt-3 max-w-xs">
                          <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg mb-2">
                            <div className="flex items-center space-x-1.5 mb-1.5">
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                Preview
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Type</span>
                                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 capitalize">{message.pendingTransaction.type}</span>
                              </div>
                              <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Desc</span>
                                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-24">{message.pendingTransaction.description}</span>
                              </div>
                              <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Amount</span>
                                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Rp{message.pendingTransaction.amount.toLocaleString()}</span>
                              </div>
                              {message.pendingTransaction.category && (
                                <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-700">
                                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Category</span>
                                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-20">{message.pendingTransaction.category}</span>
                                </div>
                              )}
                              {message.pendingTransaction.source && (
                                <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-700">
                                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Source</span>
                                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-20">{message.pendingTransaction.source}</span>
                                </div>
                              )}
                              {message.pendingTransaction.walletName && (
                                <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-700">
                                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Wallet</span>
                                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-20">{message.pendingTransaction.walletName}</span>
                                </div>
                              )}
                              {message.pendingTransaction.fromWalletName && message.pendingTransaction.toWalletName && (
                                <>
                                  <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-700">
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Transfer</span>
                                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-20">{message.pendingTransaction.fromWalletName} → {message.pendingTransaction.toWalletName}</span>
                                  </div>
                                  {message.pendingTransaction.type === 'transfer' && (
                                    <div className="flex justify-between items-center py-0.5">
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Admin Fee</span>
                                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                        {message.pendingTransaction.adminFee && message.pendingTransaction.adminFee > 0 
                                          ? `Rp${message.pendingTransaction.adminFee.toLocaleString()}` 
                                          : 'Rp0'}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleConfirmTransaction(message.id)}
                              disabled={isLoading}
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-300 disabled:to-green-400 text-white text-xs font-medium px-1.5 py-1 rounded-md transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md disabled:shadow-none flex items-center justify-center space-x-0.5"
                            >
                              {isLoading ? (
                                <>
                                  <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Confirm</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleEditTransaction(message.id)}
                              disabled={isLoading}
                              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-orange-300 disabled:to-orange-400 text-white text-xs font-medium px-1.5 py-1 rounded-md transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md disabled:shadow-none flex items-center justify-center space-x-0.5"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {message.showMultipleConfirmation && message.pendingTransactions && (
                        <div className="mt-3 max-w-xs">
                          <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg mb-2">
                            <div className="flex items-center space-x-1.5 mb-1.5">
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                Multiple Transactions ({message.pendingTransactions.length})
                              </span>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {message.pendingTransactions.map((transaction, index) => (
                                <div key={index} className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                  <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-600">
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Type</span>
                                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 capitalize">{transaction.type}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-600">
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Desc</span>
                                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-24">{transaction.description}</span>
                                  </div>
                                  {transaction.type === 'expense' && transaction.category && (
                                    <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-600">
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Category</span>
                                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-24">{transaction.category}</span>
                                    </div>
                                  )}
                                  {transaction.type === 'income' && transaction.source && (
                                    <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-600">
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Source</span>
                                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-24">{transaction.source}</span>
                                    </div>
                                  )}
                                  {transaction.type === 'savings' && transaction.goalName && (
                                    <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-600">
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Goal</span>
                                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-24">{transaction.goalName}</span>
                                    </div>
                                  )}
                                  {transaction.type === 'transfer' && (transaction.fromWalletName || transaction.toWalletName) && (
                                    <div className="flex justify-between items-center py-0.5 border-b border-gray-100 dark:border-gray-600">
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Transfer</span>
                                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-24">
                                        {transaction.fromWalletName} → {transaction.toWalletName}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center py-0.5">
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Amount</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Rp{transaction.amount.toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleConfirmMultipleTransactions(message.id)}
                              disabled={isLoading}
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-300 disabled:to-green-400 text-white text-xs font-medium px-1.5 py-1 rounded-md transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md disabled:shadow-none flex items-center justify-center space-x-0.5"
                            >
                              {isLoading ? (
                                <>
                                  <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Confirm All</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleEditMultipleTransactions(message.id)}
                              disabled={isLoading}
                              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-orange-300 disabled:to-orange-400 text-white text-xs font-medium px-1.5 py-1 rounded-md transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md disabled:shadow-none flex items-center justify-center space-x-0.5"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                          </div>
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

        {/* Mode Toggle - Above Input */}
        {isExpanded && (
          <div className="mb-3 px-1">
            <div className="flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl p-1.5 border border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setIsTransactionMode(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  !isTransactionMode
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>General Chat</span>
              </button>
              <button
                onClick={() => setIsTransactionMode(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isTransactionMode
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Transaction</span>
              </button>
            </div>
          </div>
        )}

        {/* Chat Input with external Add button */}
        <div className="relative flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-neutral-800 rounded-3xl shadow-lg border border-neutral-200/50 dark:border-neutral-700/50 p-3 w-full">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={handleInputFocus}
              placeholder={isTransactionMode ? "Record a transaction..." : "Ask me anything..."}
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

          {/* External Add button on the right */}
          <div>
            <button
              onClick={() => setShowAddMenu(true)}
              className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
              title="Add transaction"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Edit Modal */}
      {editingTransaction && (
        <TransactionEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            // Don't clear editingTransaction immediately to prevent flash
            setTimeout(() => setEditingTransaction(null), 300);
          }}
          transaction={editingTransaction}
          onSave={handleSaveEditedTransaction}
          isLoading={isLoading}
        />
      )}

      {/* Multiple Transaction Edit Modal */}
      {editingMultipleTransactions && (
        <MultipleTransactionEditModal
          isOpen={multipleEditModalOpen}
          onClose={() => {
            setMultipleEditModalOpen(false);
            // Don't clear editingMultipleTransactions immediately to prevent flash
            setTimeout(() => setEditingMultipleTransactions(null), 300);
          }}
          transactions={editingMultipleTransactions.transactions}
          onSave={handleSaveMultipleEditedTransactions}
          isLoading={isLoading}
        />
      )}

      {/* Add Transaction Modal (manual) */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        transactionType={addModalType}
        onTransactionAdded={() => {
          setShowAddModal(false);
          refreshAfterTransaction();
        }}
      />

      {/* Savings Transaction Modal */}
      <SavingsTransactionModal
        isOpen={!!showSavingsModal}
        onClose={() => setShowSavingsModal(null)}
        transactionType={showSavingsModal || 'deposit'}
      />

      {/* Wallet Transfer Modal */}
      <WalletTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
      />

      {/* Add Menu Popup */}
      {showAddMenu && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={() => setShowAddMenu(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-41 w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Add Transaction</h3>
              <button className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 text-xs" onClick={() => setShowAddMenu(false)}>Close</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setAddModalType('expense'); setShowAddModal(true); setShowAddMenu(false); }}
                className="group rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 text-left hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30">
                    <MinusCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Expense</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Record a purchase or spending</p>
              </button>

              <button
                onClick={() => { setAddModalType('income'); setShowAddModal(true); setShowAddMenu(false); }}
                className="group rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Income</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Add salary or other income</p>
              </button>

              <button
                onClick={() => { setShowSavingsModal('deposit'); setShowAddMenu(false); }}
                className="group rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <PiggyBank className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Savings Deposit</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Move money into savings</p>
              </button>

              <button
                onClick={() => { setShowSavingsModal('withdrawal'); setShowAddMenu(false); }}
                className="group rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 text-left hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <PiggyBank className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Savings Withdrawal</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Take money out from savings</p>
              </button>

              <button
                onClick={() => { setShowTransferModal(true); setShowAddMenu(false); }}
                className="group col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <ArrowLeftRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Wallet Transfer</span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Move money between your wallets</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
