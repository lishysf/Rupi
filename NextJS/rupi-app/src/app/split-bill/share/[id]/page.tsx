'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  UserIcon, 
  CurrencyDollarIcon,
  DocumentTextIcon,
  ShareIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface SplitBillItem {
  id: string;
  name: string;
  amount: number;
  participants: string[];
}

interface SplitBill {
  id: string;
  title: string;
  subtotal?: number;
  tax?: number;
  serviceCharge?: number;
  deliveryFee?: number;
  processingFee?: number;
  otherFees?: number;
  totalAmount: number;
  tipAmount?: number;
  splitTip?: boolean;
  amountPaid?: number;
  items: SplitBillItem[];
  participants: string[];
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  shareLink: string;
}

export default function SplitBillSharePage() {
  const params = useParams();
  const shareId = params.id as string;
  
  const [splitBill, setSplitBill] = useState<SplitBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (shareId) {
      fetchSplitBill();
    }
  }, [shareId]);

  // Countdown timer for expiration
  useEffect(() => {
    if (!splitBill?.expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const expirationTime = new Date(splitBill.expiresAt!).getTime();
      const remaining = Math.max(0, Math.floor((expirationTime - now) / 1000));
      
      console.log('Timer debug:', {
        now: new Date(now).toISOString(),
        expiresAt: splitBill.expiresAt,
        expirationTime: new Date(expirationTime).toISOString(),
        remainingSeconds: remaining,
        remainingHours: Math.floor(remaining / 3600),
        remainingMinutes: Math.floor((remaining % 3600) / 60)
      });
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setError('This split bill has expired');
        setLoading(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [splitBill?.expiresAt]);

  const fetchSplitBill = async () => {
    try {
      const response = await fetch(`/api/split-bill/create?id=${shareId}`);
      const data = await response.json();
      
      if (data.success) {
        setSplitBill(data.splitBill);
      } else {
        setError(data.error || 'Failed to load split bill');
      }
    } catch (error) {
      console.error('Error fetching split bill:', error);
      setError('Failed to load split bill');
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (splitBill?.shareLink) {
      navigator.clipboard.writeText(splitBill.shareLink);
      setSuccess('Share link copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const calculateParticipantTotal = (participant: string) => {
    if (!splitBill) return 0;
    
    // Calculate subtotal for this participant
    const subtotalForParticipant = splitBill.items.reduce((total, item) => {
      if (item.participants.includes(participant)) {
        return total + (item.amount / item.participants.length);
      }
      return total;
    }, 0);
    
    // Calculate proportional fees
    const subtotalRatio = subtotalForParticipant / (splitBill.subtotal || 1);
    const taxForParticipant = (splitBill.tax || 0) * subtotalRatio;
    const serviceChargeForParticipant = (splitBill.serviceCharge || 0) * subtotalRatio;
    const deliveryFeeForParticipant = (splitBill.deliveryFee || 0) * subtotalRatio;
    const processingFeeForParticipant = (splitBill.processingFee || 0) * subtotalRatio;
    const otherFeesForParticipant = (splitBill.otherFees || 0) * subtotalRatio;
    
    // Calculate tip for this participant
    let tipForParticipant = 0;
    if (splitBill.tipAmount && splitBill.tipAmount > 0) {
      if (splitBill.splitTip) {
        // Split tip equally among all participants
        tipForParticipant = splitBill.tipAmount / splitBill.participants.length;
      } else {
        // Tip paid by creator only
        tipForParticipant = participant === splitBill.createdBy ? splitBill.tipAmount : 0;
      }
    }
    
    return subtotalForParticipant + taxForParticipant + serviceChargeForParticipant + 
           deliveryFeeForParticipant + processingFeeForParticipant + otherFeesForParticipant + tipForParticipant;
  };

  const calculateItemSplit = (item: SplitBillItem) => {
    return item.amount / item.participants.length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading split bill...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XMarkIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!splitBill) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Split Bill Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The split bill you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {splitBill.title}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Created by {splitBill.createdBy} • {new Date(splitBill.createdAt).toLocaleDateString()}
              </p>
              {splitBill.expiresAt && (
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    timeLeft > 3600 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : timeLeft > 1800
                      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}>
                    {timeLeft > 0 ? (() => {
                      const hours = Math.floor(timeLeft / 3600);
                      const minutes = Math.floor((timeLeft % 3600) / 60);
                      const seconds = timeLeft % 60;
                      
                      if (hours > 0) {
                        return `Expires in ${hours}h ${minutes}m`;
                      } else if (minutes > 0) {
                        return `Expires in ${minutes}m ${seconds}s`;
                      } else {
                        return `Expires in ${seconds}s`;
                      }
                    })() : 'Expired'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={copyShareLink}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <ShareIcon className="h-4 w-4 mr-2" />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex">
              <CheckIcon className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bill Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Bill Summary
            </h2>
            
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-lg font-medium text-gray-900 dark:text-white">
                      Rp {splitBill.subtotal?.toLocaleString() || '0'}
                    </span>
                  </div>
                  
                  {(splitBill.tax || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Tax</span>
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        Rp {splitBill.tax?.toLocaleString() || '0'}
                      </span>
                    </div>
                  )}
                  
                  {(splitBill.serviceCharge || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Service Charge</span>
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        Rp {splitBill.serviceCharge?.toLocaleString() || '0'}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-600 pt-2">
                    <span className="text-gray-600 dark:text-gray-400 font-semibold">Total Amount</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      Rp {splitBill.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Number of Items</span>
                  <span className="text-lg font-medium text-gray-900 dark:text-white">
                    {splitBill.items.length}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Participants</span>
                  <span className="text-lg font-medium text-gray-900 dark:text-white">
                    {splitBill.participants.length}
                  </span>
                </div>
              </div>
          </div>

          {/* Participants */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Participants
            </h2>
            
            <div className="space-y-3">
              {splitBill.participants.map((participant) => (
                <div
                  key={participant}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    selectedParticipant === participant
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {participant}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Rp {calculateParticipantTotal(participant).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {((calculateParticipantTotal(participant) / splitBill.totalAmount) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Items Breakdown */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Items Breakdown
          </h2>
          
          <div className="space-y-4">
            {splitBill.items.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Split between {item.participants.length} participant(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      Rp {item.amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Rp {calculateItemSplit(item).toLocaleString()} each
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {item.participants.map((participant) => (
                    <span
                      key={participant}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                    >
                      <UserIcon className="h-3 w-3 mr-1" />
                      {participant}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Share Link */}
        <div className="mt-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-6">
          <h3 className="text-lg font-medium text-emerald-900 dark:text-emerald-200 mb-2">
            Share this split bill
          </h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-4">
            Send this link to all participants so they can see the breakdown and their individual amounts.
          </p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={splitBill.shareLink}
              readOnly
              className="flex-1 px-3 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
            <button
              onClick={copyShareLink}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
