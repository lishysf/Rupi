"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type SupportedLanguage = 'en' | 'id';

type Dictionary = Record<string, string>;

// Canonical expense category labels → localized display labels
const categoryLabelsEn: Record<string, string> = {
  'Rent': 'Rent',
  'Mortgage': 'Mortgage',
  'Electricity': 'Electricity',
  'Water': 'Water',
  'Internet': 'Internet',
  'Gas Utility': 'Gas Utility',
  'Home Maintenance': 'Home Maintenance',
  'Household Supplies': 'Household Supplies',
  'Groceries': 'Groceries',
  'Dining Out': 'Eat',
  'Coffee & Tea': 'Coffee & Tea',
  'Food Delivery': 'Food Delivery',
  'Fuel': 'Fuel',
  'Parking': 'Parking',
  'Public Transport': 'Public Transport',
  'Ride Hailing': 'Ride Hailing',
  'Vehicle Maintenance': 'Vehicle Maintenance',
  'Toll': 'Toll',
  'Medical & Pharmacy': 'Medical & Pharmacy',
  'Health Insurance': 'Health Insurance',
  'Fitness': 'Fitness',
  'Personal Care': 'Personal Care',
  'Clothing': 'Clothing',
  'Electronics & Gadgets': 'Electronics & Gadgets',
  'Subscriptions & Streaming': 'Subscriptions & Streaming',
  'Hobbies & Leisure': 'Hobbies & Leisure',
  'Gifts & Celebration': 'Gifts & Celebration',
  'Debt Payments': 'Debt Payments',
  'Taxes & Fees': 'Taxes & Fees',
  'Bank Charges': 'Bank Charges',
  'Childcare': 'Childcare',
  'Education': 'Education',
  'Pets': 'Pets',
  'Travel': 'Travel',
  'Business Expenses': 'Business Expenses',
  'Charity & Donations': 'Charity & Donations',
  'Emergency': 'Emergency',
  'Others': 'Others',
  'Transfer': 'Transfer',
};

const categoryLabelsId: Record<string, string> = {
  'Rent': 'Sewa',
  'Mortgage': 'KPR',
  'Electricity': 'Listrik',
  'Water': 'Air',
  'Internet': 'Internet',
  'Gas Utility': 'Gas Rumah',
  'Home Maintenance': 'Perawatan Rumah',
  'Household Supplies': 'Kebutuhan Rumah Tangga',
  'Groceries': 'Belanja Harian',
  'Dining Out': 'Makan',
  'Coffee & Tea': 'Kopi & Teh',
  'Food Delivery': 'Antar Makanan',
  'Fuel': 'Bensin',
  'Parking': 'Parkir',
  'Public Transport': 'Transportasi Umum',
  'Ride Hailing': 'Ojek Online',
  'Vehicle Maintenance': 'Perawatan Kendaraan',
  'Toll': 'Tol',
  'Medical & Pharmacy': 'Medis & Apotek',
  'Health Insurance': 'Asuransi Kesehatan',
  'Fitness': 'Kebugaran',
  'Personal Care': 'Perawatan Pribadi',
  'Clothing': 'Pakaian',
  'Electronics & Gadgets': 'Elektronik & Gadget',
  'Subscriptions & Streaming': 'Langganan & Streaming',
  'Hobbies & Leisure': 'Hobi & Hiburan',
  'Gifts & Celebration': 'Hadiah & Perayaan',
  'Debt Payments': 'Cicilan/Hutang',
  'Taxes & Fees': 'Pajak & Biaya',
  'Bank Charges': 'Biaya Bank',
  'Childcare': 'Pengasuhan Anak',
  'Education': 'Pendidikan',
  'Pets': 'Hewan Peliharaan',
  'Travel': 'Perjalanan',
  'Business Expenses': 'Biaya Bisnis',
  'Charity & Donations': 'Donasi & Amal',
  'Emergency': 'Darurat',
  'Others': 'Lainnya',
  'Transfer': 'Transfer',
};

const en: Dictionary = {
  settings: 'Settings',
  customizeExperience: 'Customize your Fundy experience',
  appearance: 'Appearance',
  chooseTheme: 'Choose your preferred theme',
  language: 'Language',
  chooseLanguage: 'Choose your preferred language',
  english: 'English',
  indonesian: 'Indonesian',
  dashboard: 'Dashboard',
  wallets: 'Wallets',
  table: 'Table',
  settingsLabel: 'Settings',
  signOut: 'Sign out',
  totalAssets: 'Total Assets',
  combinedAccounts: 'Combined value of all accounts',
  savings: 'Savings',
  investment: 'Investment',
  incomeExpenseSummary: 'Income & Expense Summary',
  expenseIncomes: 'Expense & Incomes',
  totalIncomesThisMonth: 'Total incomes this month',
  totalOutcomesThisMonth: 'Total outcomes this month',
  ofIncomeUsed: ' of income used for expenses',
  noIncomeData: 'No income data available',
  recentTransactions: 'Recent Transactions',
  filterAll: 'All',
  filterTxn: 'Expense/Income',
  filterSavings: 'Savings',
  noTransactions: 'No transactions yet. Start by chatting with the AI assistant',
  addActivity: 'Add Activity',
  addExpense: 'Expense',
  addIncome: 'Income',
  addSavings: 'Savings',
  addInvestment: 'Investment',
  editTransaction: 'Edit transaction',
  deleteTransaction: 'Delete transaction',
  expenseBreakdown: 'Expense Breakdown',
  categoryAnalysis: 'Category-wise spending analysis',
  amountLabel: 'Amount',
  noExpenseData: 'No expense data available',
  startTracking: 'Start tracking expenses with the AI chat',
  myWallets: 'My Wallets',
  walletsCount: 'wallets',
  noWallets: 'No wallets added',
  manageWallets: 'Manage Wallets',
  totalWalletBalance: 'Total Wallet Balance',
  available: 'Available',
  acrossWallets: 'Across',
  addWalletsTrack: 'Add wallets to track balance',
  financialHealth: 'Financial Health',
  financialScore: 'Financial Score',
  monthlyBufferLabel: 'Monthly Buffer',
  totalAssetsLabel: 'Total Assets',
  savingsGoals: 'Savings Goals',
  manageGoals: 'Manage Goals',
  totalMoneySaved: 'Total Money Saved',
  goalsSet: 'goals set',
  availableToAllocate: 'available to allocate',
  noSavingsGoalsYet: 'No savings goals yet',
  createFirstGoal: 'Create your first goal',
  targetLabel: 'Target',
  noDeadline: 'No deadline set',
  viewAllGoals: 'View all goals',
  budgetTracking: 'Budget Tracking',
  addBudget: 'Add Budget',
  monthlyBudget: 'Monthly Budget',
  ofLabel: 'of',
  noBudgetsThisMonth: 'No budgets set for this month',
  setFirstBudget: 'Set Your First Budget',
  onTrack: 'On Track',
  overBudget: 'Over Budget',
  editBudget: 'Edit Budget',
  deleteBudget: 'Delete Budget',
};

const id: Dictionary = {
  settings: 'Pengaturan',
  customizeExperience: 'Sesuaikan pengalaman Anda di Fundy',
  appearance: 'Tampilan',
  chooseTheme: 'Pilih tema yang Anda sukai',
  language: 'Bahasa',
  chooseLanguage: 'Pilih bahasa yang Anda sukai',
  english: 'Inggris',
  indonesian: 'Indonesia',
  dashboard: 'Dasbor',
  wallets: 'Dompet',
  table: 'Tabel',
  settingsLabel: 'Pengaturan',
  signOut: 'Keluar',
  totalAssets: 'Total Aset',
  combinedAccounts: 'Gabungan nilai semua akun',
  savings: 'Tabungan',
  investment: 'Investasi',
  incomeExpenseSummary: 'Ringkasan Pemasukan & Pengeluaran',
  expenseIncomes: 'Pengeluaran & Pemasukan',
  totalIncomesThisMonth: 'Total pemasukan bulan ini',
  totalOutcomesThisMonth: 'Total pengeluaran bulan ini',
  ofIncomeUsed: ' dari pemasukan dipakai untuk pengeluaran',
  noIncomeData: 'Belum ada data pemasukan',
  recentTransactions: 'Transaksi Terbaru',
  filterAll: 'Semua',
  filterTxn: 'Pengeluaran/Pemasukan',
  filterSavings: 'Tabungan',
  noTransactions: 'Belum ada transaksi. Mulai dengan mengobrol dengan AI asisten',
  addActivity: 'Tambah Aktivitas',
  addExpense: 'Pengeluaran',
  addIncome: 'Pemasukan',
  addSavings: 'Tabungan',
  addInvestment: 'Investasi',
  editTransaction: 'Ubah transaksi',
  deleteTransaction: 'Hapus transaksi',
  expenseBreakdown: 'Rincian Pengeluaran',
  categoryAnalysis: 'Analisis pengeluaran per kategori',
  amountLabel: 'Jumlah',
  noExpenseData: 'Belum ada data pengeluaran',
  startTracking: 'Mulai catat pengeluaran dengan chat AI',
  myWallets: 'Dompet Saya',
  walletsCount: 'dompet',
  noWallets: 'Belum ada dompet',
  manageWallets: 'Kelola Dompet',
  totalWalletBalance: 'Total Saldo Dompet',
  available: 'Tersedia',
  acrossWallets: 'Di',
  addWalletsTrack: 'Tambah dompet untuk lacak saldo',
  financialHealth: 'Kesehatan Finansial',
  financialScore: 'Skor Finansial',
  monthlyBufferLabel: 'Buffer Bulanan',
  totalAssetsLabel: 'Total Aset',
  savingsGoals: 'Tujuan Tabungan',
  manageGoals: 'Kelola Tujuan',
  totalMoneySaved: 'Total Uang Tersimpan',
  goalsSet: 'tujuan dibuat',
  availableToAllocate: 'tersedia untuk dialokasikan',
  noSavingsGoalsYet: 'Belum ada tujuan tabungan',
  createFirstGoal: 'Buat tujuan pertamamu',
  targetLabel: 'Target',
  noDeadline: 'Belum ada tenggat',
  viewAllGoals: 'Lihat semua tujuan',
  budgetTracking: 'Pantauan Anggaran',
  addBudget: 'Tambah Anggaran',
  monthlyBudget: 'Anggaran Bulanan',
  ofLabel: 'dari',
  noBudgetsThisMonth: 'Belum ada anggaran untuk bulan ini',
  setFirstBudget: 'Atur Anggaran Pertama',
  onTrack: 'On Track',
  overBudget: 'Melebihi Anggaran',
  editBudget: 'Ubah Anggaran',
  deleteBudget: 'Hapus Anggaran',
};

const dictionaries: Record<SupportedLanguage, Dictionary> = { en, id };

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
  translateCategory: (category: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fundy-language') as SupportedLanguage | null;
      if (saved === 'en' || saved === 'id') {
        setLanguageState(saved);
      } else {
        // Simple default: use browser language
        const browser = (navigator.language || 'en').toLowerCase();
        if (browser.startsWith('id')) setLanguageState('id');
      }
    } catch {}
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try { localStorage.setItem('fundy-language', lang); } catch {}
    try { document.documentElement.setAttribute('lang', lang === 'id' ? 'id' : 'en'); } catch {}
  };

  const t = useMemo(() => {
    return (key: string) => dictionaries[language]?.[key] ?? dictionaries['en'][key] ?? key;
  }, [language]);

  const translateCategory = (category: string) => {
    const source = language === 'id' ? categoryLabelsId : categoryLabelsEn;
    return source[category] || category;
  };

  const value = useMemo(() => ({ language, setLanguage, t, translateCategory }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}


