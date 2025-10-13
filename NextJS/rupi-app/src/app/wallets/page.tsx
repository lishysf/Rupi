'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { FinancialDataProvider, useFinancialData } from '@/contexts/FinancialDataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, CreditCard, Smartphone, Building2, Plus, Edit3, Trash2, TrendingUp, TrendingDown, Target, ArrowRight } from 'lucide-react';
import WalletModal from '@/app/components/WalletModal';
import WalletTransferModal from '@/app/components/WalletTransferModal';

// Wallet types and icons
const WALLET_TYPES = [
  { value: 'bank_card', label: 'Bank Card', icon: CreditCard, color: '#3B82F6' },
  { value: 'e_wallet', label: 'E-Wallet', icon: Smartphone, color: '#10B981' },
  { value: 'cash', label: 'Cash', icon: Wallet, color: '#F59E0B' },
  { value: 'bank_account', label: 'Bank Account', icon: Building2, color: '#8B5CF6' },
];

function WalletsContent() {
  const { state, fetchWallets } = useFinancialData();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromWallet, setTransferFromWallet] = useState<number | null>(null);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleDelete = async (walletId: number, walletName: string) => {
    if (!confirm(`Are you sure you want to delete "${walletName}"? This action cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/wallets/${walletId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchWallets();
      } else {
        alert(data.error || 'Failed to delete wallet');
      }
    } catch (err) {
      console.error('Error deleting wallet:', err);
      alert('Failed to delete wallet');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate total balance
  const totalBalance = state.data.wallets.reduce((sum: number, wallet: any) => sum + wallet.balance, 0);

  // Calculate wallet statistics
  const getWalletStats = (walletId: number) => {
    const transactions = state.data.transactions.filter((tx: any) => tx.wallet_id === walletId);
    const income = transactions
      .filter((tx: any) => tx.type === 'income')
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);
    const expenses = transactions
      .filter((tx: any) => tx.type === 'expense')
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);
    
    return { income, expenses, transactionCount: transactions.length };
  };

  // Calculate savings for each wallet
  const getWalletSavings = (walletId: number) => {
    const savings = state.data.savings.filter((saving: any) => saving.wallet_id === walletId);
    const totalSavings = savings
      .filter((saving: any) => saving.amount > 0)
      .reduce((sum: number, saving: any) => sum + Number(saving.amount), 0);
    
    return { totalSavings, savingsCount: savings.length };
  };

  if (state.loading.wallets && state.loading.initial) {
    return (
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Wallets</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading wallets...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Wallets</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Error loading wallets</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500 dark:text-red-400">Error: {state.error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">My Wallets</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage your payment methods and balances</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setTransferFromWallet(null);
                setIsTransferModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <ArrowRight className="w-4 h-4" />
              Transfer Money
            </button>
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4" />
              Add Wallet
            </button>
          </div>
        </div>
      </div>

      {/* Total Balance Card - Matching Dashboard Theme */}
      <div className="relative mb-6 overflow-hidden rounded-3xl group hover:shadow-2xl transition-all duration-500">
        {/* Dark Green Card Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-800 rounded-3xl shadow-2xl border border-emerald-600/20">
          {/* Subtle Pattern Overlay */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.1) 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }}></div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-green-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-400/10 to-green-400/10 rounded-full blur-2xl"></div>
        </div>
        
        {/* Card Content */}
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <div className="relative">
                  <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full shadow-lg animate-pulse"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full animate-ping opacity-75"></div>
                </div>
                <p className="text-emerald-200 text-sm font-medium ml-3">Total Wallet Balance</p>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-3">{formatCurrency(totalBalance)}</h2>
              <div className="flex items-center text-emerald-200 text-sm">
                <Wallet className="w-4 h-4 mr-2" />
                {state.data.wallets.length > 0 ? `Across ${state.data.wallets.length} wallet${state.data.wallets.length !== 1 ? 's' : ''}` : 'No wallets added yet'}
              </div>
            </div>
            <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-lg">
              <Wallet className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Wallets Grid */}
      {state.data.wallets.length === 0 ? (
        <Card className="bg-white dark:bg-neutral-900 border-2 border-dashed border-neutral-300 dark:border-transparent">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">No wallets yet</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
              Create your first wallet to start tracking your balances across different payment methods
            </p>
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Add Your First Wallet
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.data.wallets.map((wallet: any) => {
            const walletType = WALLET_TYPES.find(t => t.value === wallet.type);
            const IconComponent = walletType?.icon || Wallet;
            const stats = getWalletStats(wallet.id);
            const savings = getWalletSavings(wallet.id);
            
            return (
               <Card 
                 key={wallet.id} 
                 className="relative group hover:shadow-xl transition-all duration-300 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-transparent overflow-hidden"
               >
                {/* Colored accent bar */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: wallet.color }}
                />
                
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                        style={{ backgroundColor: wallet.color }}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>
                       <div>
                         <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-lg">{wallet.name}</h3>
                         <p className="text-sm text-neutral-600 dark:text-neutral-400">{walletType?.label}</p>
                       </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setTransferFromWallet(wallet.id);
                          setIsTransferModalOpen(true);
                        }}
                        className="p-2 text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        title="Transfer money"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingWallet(wallet);
                          setIsWalletModalOpen(true);
                        }}
                         className="p-2 text-neutral-500 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        title="Edit wallet"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(wallet.id, wallet.name)}
                         className="p-2 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        title="Delete wallet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                   {/* Balance */}
                   <div className="mb-4">
                     <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Current Balance</p>
                     <div className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                       {formatCurrency(wallet.balance)}
                     </div>
                   </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-200 dark:border-transparent">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">Income</p>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {formatCurrency(stats.income)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">Expenses</p>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {formatCurrency(stats.expenses)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Savings Information */}
                  {savings.totalSavings > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-transparent">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">Total Saved</p>
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {formatCurrency(savings.totalSavings)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transaction count */}
                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-transparent">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      {stats.transactionCount} transaction{stats.transactionCount !== 1 ? 's' : ''} recorded
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Wallet Modal */}
      <WalletModal 
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          setEditingWallet(null);
        }}
        onWalletUpdate={() => {
          fetchWallets();
        }}
      />

      {/* Transfer Modal */}
      <WalletTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferFromWallet(null);
        }}
        fromWalletId={transferFromWallet || undefined}
      />
    </div>
  );
}

export default function WalletsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return null;
  }
  if (!session) return null;

  return (
    <FinancialDataProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        <Sidebar currentPage="Wallets" />
        <div className="flex-1 lg:ml-64">
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            <WalletsContent />
          </main>
        </div>
      </div>
    </FinancialDataProvider>
  );
}

