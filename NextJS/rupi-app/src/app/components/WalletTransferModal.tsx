'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Wallet, CreditCard, Smartphone, Building2 } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';

interface WalletTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromWalletId?: number;
}

interface Wallet {
  id: number;
  name: string;
  type: string;
  color: string;
  icon: string;
  is_active: boolean;
}

const WALLET_TYPES = [
  { value: 'bank_card', label: 'Bank Card', icon: CreditCard, color: '#3B82F6' },
  { value: 'e_wallet', label: 'E-Wallet', icon: Smartphone, color: '#10B981' },
  { value: 'cash', label: 'Cash', icon: Wallet, color: '#F59E0B' },
  { value: 'bank_account', label: 'Bank Account', icon: Building2, color: '#8B5CF6' },
];

export default function WalletTransferModal({ isOpen, onClose, fromWalletId }: WalletTransferModalProps) {
  const { state, fetchWallets } = useFinancialData();
  const [fromWallet, setFromWallet] = useState<Wallet | null>(null);
  const [toWallet, setToWallet] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set from wallet when modal opens
  useEffect(() => {
    if (isOpen && fromWalletId) {
      const wallet = state.data.wallets.find((w: Wallet) => w.id === fromWalletId);
      setFromWallet(wallet || null);
    }
  }, [isOpen, fromWalletId, state.data.wallets]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFromWallet(null);
      setToWallet(null);
      setAmount('');
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  const handleAmountChange = (value: string) => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setAmount(cleanValue);
  };

  const handleTransfer = async () => {
    if (!fromWallet || !toWallet || !amount || !description.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Note: Balance check is now handled by the API endpoint
    // The API will calculate the actual balance from transactions

    if (fromWallet.id === toWallet) {
      setError('Cannot transfer to the same wallet');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/wallet-transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromWalletId: fromWallet.id,
          toWalletId: toWallet,
          amount: transferAmount,
          description: description.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Close modal and refresh data
        onClose();
        // Refresh wallet data through context
        fetchWallets();
      } else {
        setError(data.error || 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      setError('Transfer failed. Please try again.');
    } finally {
      setLoading(false);
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

  const getWalletIcon = (walletType: string) => {
    const type = WALLET_TYPES.find(t => t.value === walletType);
    return type?.icon || Wallet;
  };

  const getWalletColor = (walletType: string) => {
    const type = WALLET_TYPES.find(t => t.value === walletType);
    return type?.color || '#6B7280';
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  Transfer Money
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Move money between your wallets
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* From Wallet */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                From Wallet
              </label>
              {fromWallet ? (
                <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: fromWallet.color }}
                  >
                    {React.createElement(getWalletIcon(fromWallet.type), { className: "w-4 h-4" })}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-neutral-900 dark:text-white">
                      {fromWallet.name}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      {formatCurrency(fromWallet.balance)} available
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  value=""
                  onChange={(e) => {
                    const wallet = state.data.wallets.find((w: Wallet) => w.id === parseInt(e.target.value));
                    setFromWallet(wallet || null);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  <option value="">Select source wallet</option>
                  {state.data.wallets.map((wallet: Wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} - {formatCurrency(wallet.balance)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* To Wallet */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                To Wallet
              </label>
              <select
                value={toWallet || ''}
                onChange={(e) => setToWallet(parseInt(e.target.value) || null)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="">Select destination wallet</option>
                {state.data.wallets
                  .filter((wallet: Wallet) => wallet.id !== (fromWallet ? fromWallet.id : null))
                  .map((wallet: Wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} - {formatCurrency(wallet.balance)}
                    </option>
                  ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Amount
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
              {amount && (
                <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {formatCurrency(parseFloat(amount) || 0)}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Transfer to savings wallet"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Transfer Summary */}
            {fromWallet && toWallet && amount && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Transfer Summary
                </div>
                <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <div>From: {fromWallet.name}</div>
                  <div>To: {state.data.wallets.find((w: Wallet) => w.id === toWallet)?.name || 'Unknown'}</div>
                  <div>Amount: {formatCurrency(parseFloat(amount) || 0)}</div>
                  {parseFloat(amount) > fromWallet.balance && (
                    <div className="text-red-600 dark:text-red-400 font-medium">
                      ⚠️ Insufficient balance
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              disabled={loading || !fromWallet || !toWallet || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > (fromWallet?.balance || 0)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {loading ? 'Transferring...' : 'Transfer Money'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
