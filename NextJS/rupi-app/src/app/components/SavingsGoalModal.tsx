'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Target, Laptop, Car, Home, Plane, Calendar, DollarSign, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: SavingsGoalData) => Promise<boolean>;
}

interface SavingsGoalData {
  name: string;
  targetAmount: number;
  targetDate: string | null;
  icon: string | null;
  color: string | null;
}

const iconOptions = [
  { name: 'laptop', label: 'Laptop', icon: Laptop },
  { name: 'car', label: 'Car', icon: Car },
  { name: 'home', label: 'Home', icon: Home },
  { name: 'plane', label: 'Travel', icon: Plane },
  { name: 'target', label: 'General', icon: Target },
];

const colorOptions = [
  { name: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { name: 'emerald', label: 'Green', class: 'bg-emerald-500' },
  { name: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { name: 'amber', label: 'Orange', class: 'bg-amber-500' },
];

export default function SavingsGoalModal({ isOpen, onClose, onSave }: SavingsGoalModalProps) {
  const [formData, setFormData] = useState<SavingsGoalData>({
    name: '',
    targetAmount: 0,
    targetDate: null,
    icon: 'target',
    color: 'blue',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // No need for calculations since users manually distribute savings

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.targetAmount <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
        setFormData({
          name: '',
          targetAmount: 0,
          targetDate: null,
          icon: 'target',
          color: 'blue',
        });
      }
    } catch (err) {
      setError('Failed to create savings goal');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setFormData({
        name: '',
        targetAmount: 0,
        targetDate: null,
        icon: 'target',
        color: 'blue',
      });
      setError(null);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[99999] animate-in fade-in duration-200"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto animate-in zoom-in-95 fade-in duration-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Create Savings Goal
              </CardTitle>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Goal Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <Target className="w-4 h-4" />
                  Goal Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., New Laptop, Vacation Fund"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
              </div>

              {/* Target Amount */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <DollarSign className="w-4 h-4" />
                  Target Amount (IDR) *
                </label>
                <input
                  type="number"
                  value={formData.targetAmount || ''}
                  onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                {formData.targetAmount > 0 && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Preview: {formatCurrency(formData.targetAmount)}
                  </p>
                )}
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <Calendar className="w-4 h-4" />
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.targetDate || ''}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value || null })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Icon Selection */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <Target className="w-4 h-4" />
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {iconOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: option.name })}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          formData.icon === option.name
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
                        }`}
                        disabled={loading}
                      >
                        <IconComponent className={`w-5 h-5 mx-auto ${
                          formData.icon === option.name
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-neutral-400'
                        }`} />
                        <p className={`text-xs mt-1 ${
                          formData.icon === option.name
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}>
                          {option.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <Target className="w-4 h-4" />
                  Color Theme
                </label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.name })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color.name
                          ? 'border-neutral-900 dark:border-white scale-110'
                          : 'border-neutral-300 dark:border-neutral-600 hover:scale-105'
                      } ${color.class}`}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>

              {/* Goal Preview */}
              {formData.targetAmount > 0 && (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg border border-neutral-200 dark:border-neutral-600">
                  <div className="flex items-center mb-3">
                    <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-2" />
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                      Goal Preview
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Target amount:</span>
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {formatCurrency(formData.targetAmount)}
                      </span>
                    </div>
                    {formData.targetDate && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Target date:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {formatDate(formData.targetDate)}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                      💡 You'll manually distribute your savings to this goal using the allocation feature.
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim() || formData.targetAmount <= 0}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Goal
                  </>
                )}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );

  // Use portal to render outside of any stacking context
  return createPortal(modalContent, document.body);
}
