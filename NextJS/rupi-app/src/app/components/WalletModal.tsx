'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Wallet, CreditCard, Smartphone, Building2, Trash2, Edit3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useFinancialData } from '@/contexts/FinancialDataContext';

// Wallet types and icons
const WALLET_TYPES = [
  { value: 'bank_card', label: 'Bank Card', icon: CreditCard, color: '#3B82F6' },
  { value: 'e_wallet', label: 'E-Wallet', icon: Smartphone, color: '#10B981' },
  { value: 'cash', label: 'Cash', icon: Wallet, color: '#F59E0B' },
  { value: 'bank_account', label: 'Bank Account', icon: Building2, color: '#8B5CF6' },
];

const E_WALLET_PROVIDERS = [
  'Gojek', 'Dana', 'OVO', 'LinkAja', 'ShopeePay', 'DANA', 'Flip', 'Jenius', 'BCA Mobile', 'Mandiri'
];

interface Wallet {
  id: number;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
  is_active: boolean;
}

interface FormData {
  name: string;
  type: string;
  balance: string;
  color: string;
  icon: string;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletUpdate: () => void;
}

export default function WalletModal({ isOpen, onClose, onWalletUpdate }: WalletModalProps) {
  const { state, fetchWallets } = useFinancialData();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'e_wallet',
    balance: '',
    color: '#10B981',
    icon: 'wallet'
  });

  // Load wallets
  const loadWallets = async () => {
    try {
      setLoading(true);
      await fetchWallets();
      setWallets(state.data.wallets);
    } catch (err) {
      console.error('Error loading wallets:', err);
      setError('Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  // Create or update wallet
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Please enter a wallet name');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = editingWallet ? `/api/wallets/${editingWallet.id}` : '/api/wallets';
      const method = editingWallet ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          balance: parseFloat(formData.balance) || 0
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadWallets();
        onWalletUpdate();
        handleCloseForm();
      } else {
        setError(data.error || 'Failed to save wallet');
      }
    } catch (err) {
      console.error('Error saving wallet:', err);
      setError('Failed to save wallet');
    } finally {
      setLoading(false);
    }
  };

  // Delete wallet
  const handleDelete = async (walletId: number) => {
    if (!confirm('Are you sure you want to delete this wallet?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/wallets/${walletId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        await loadWallets();
        onWalletUpdate();
      } else {
        setError(data.error || 'Failed to delete wallet');
      }
    } catch (err) {
      console.error('Error deleting wallet:', err);
      setError('Failed to delete wallet');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setFormData({
      name: wallet.name,
      type: wallet.type,
      balance: wallet.balance.toString(),
      color: wallet.color,
      icon: wallet.icon
    });
    setShowAddForm(true);
  };

  // Close form
  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingWallet(null);
    setFormData({
      name: '',
      type: 'e_wallet',
      balance: '',
      color: '#10B981',
      icon: 'wallet'
    });
    setError(null);
  };

  // Load wallets on mount and when context data changes
  useEffect(() => {
    if (isOpen) {
      loadWallets();
    }
  }, [isOpen]);

  // Update local wallets when context data changes
  useEffect(() => {
    setWallets(state.data.wallets);
  }, [state.data.wallets]);

  // Calculate total balance
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">My Wallets</h2>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                Total Balance: {formatCurrency(totalBalance)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Wallet
              </button>
              <button
                onClick={onClose}
                className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {showAddForm ? (
              /* Add/Edit Form */
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {editingWallet ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingWallet ? 'Edit Wallet' : 'Add New Wallet'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Wallet Name */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Wallet Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Gojek, BCA Card, Cash"
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Wallet Type */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Wallet Type
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {WALLET_TYPES.map((type) => {
                          const IconComponent = type.icon;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, type: type.value, color: type.color })}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                formData.type === type.value
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                  : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
                              }`}
                            >
                              <IconComponent className={`w-5 h-5 mx-auto mb-2 ${
                                formData.type === type.value ? 'text-emerald-600' : 'text-neutral-500'
                              }`} />
                              <div className={`text-sm font-medium ${
                                formData.type === type.value ? 'text-emerald-700 dark:text-emerald-300' : 'text-neutral-700 dark:text-neutral-300'
                              }`}>
                                {type.label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* E-Wallet Provider (if e_wallet selected) */}
                    {formData.type === 'e_wallet' && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          E-Wallet Provider
                        </label>
                        <select
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="">Select provider...</option>
                          {E_WALLET_PROVIDERS.map((provider) => (
                            <option key={provider} value={provider}>{provider}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Initial Balance */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Initial Balance
                      </label>
                      <input
                        type="number"
                        value={formData.balance}
                        onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                        placeholder="Enter initial balance"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Wallet Color
                      </label>
                      <div className="flex gap-2">
                        {['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className={`w-8 h-8 rounded-full border-2 ${
                              formData.color === color ? 'border-neutral-400' : 'border-neutral-200'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Saving...' : (editingWallet ? 'Update Wallet' : 'Add Wallet')}
                  </button>
                  <button
                    onClick={handleCloseForm}
                    className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                  >
                    Cancel
                  </button>
                </CardFooter>
              </Card>
            ) : (
              /* Wallet List */
              <div className="space-y-4">
                {loading && wallets.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
                    <p className="text-neutral-600 dark:text-neutral-400">Loading wallets...</p>
                  </div>
                ) : wallets.length === 0 ? (
                  <div className="text-center py-8">
                    <Wallet className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No wallets yet</h3>
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">Add your first wallet to start tracking your balances</p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Add Wallet
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wallets.map((wallet) => {
                      const walletType = WALLET_TYPES.find(t => t.value === wallet.type);
                      const IconComponent = walletType?.icon || Wallet;
                      
                      return (
                        <Card key={wallet.id} className="relative group">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                                  style={{ backgroundColor: wallet.color }}
                                >
                                  <IconComponent className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-neutral-900 dark:text-white">{wallet.name}</h3>
                                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{walletType?.label}</p>
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEdit(wallet)}
                                  className="p-1 text-neutral-500 hover:text-emerald-600 transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(wallet.id)}
                                  className="p-1 text-neutral-500 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                              {formatCurrency(wallet.balance)}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
