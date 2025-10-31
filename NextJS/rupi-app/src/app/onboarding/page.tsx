'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

type Step = 0 | 1 | 2 | 3 | 4 | 5;

export default function Onboarding() {
  const { data: session } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [occupation, setOccupation] = useState('');

  type NewWallet = { name: string; type: string; balance: string; color: string };
  const [wallets, setWallets] = useState<NewWallet[]>([
    { name: '', type: 'e_wallet', balance: '', color: '#10B981' }
  ]);

  const [financialGoalTarget, setFinancialGoalTarget] = useState<string>('');

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [language, setLanguage] = useState('en');

  const [discoverySource, setDiscoverySource] = useState('');

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [consentFinancialAnalysis, setConsentFinancialAnalysis] = useState(true);

  const gotoDashboard = () => {
    const username = session?.user?.name || 'user';
    router.push(`/${username}/dashboard`);
    router.refresh();
  };

  // If already completed, skip onboarding
  if ((session?.user as any)?.onboardingCompleted === true) {
    gotoDashboard();
    return null;
  }

  const skipForNow = () => {
    // Skip only the wallets step, continue onboarding
    setStep(2);
  };

  const next = () => setStep((s) => (Math.min(5, (s + 1) as Step)) as Step);
  const prev = () => setStep((s) => (Math.max(0, (s - 1) as Step)) as Step);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          currency,
          occupation,
          wallets: wallets
            .filter(w => w.name.trim().length > 0)
            .map(w => ({ name: w.name, type: w.type, balance: w.balance ? Number(w.balance) : 0, color: w.color })),
          financialGoalTarget: financialGoalTarget ? Number(financialGoalTarget) : null,
          theme,
          language,
          discoverySource,
          acceptedTerms,
          acceptedPrivacy,
          consentFinancialAnalysis,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save onboarding');
      }

      gotoDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 md:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Welcome to Fundy</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Let’s set up your account in a few quick steps.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-3 py-2 rounded-lg text-sm border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              >
                Log out
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">About You</h2>
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300">Name (what should we call you?)</label>
                <input className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g., Alex" />
              </div>
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300">Currency</label>
                <select className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100" value={currency} disabled>
                  <option value="IDR">IDR</option>
                </select>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Only IDR is supported at this time.</p>
              </div>
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300">Occupation</label>
                <input className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g., Software Engineer" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">Setup Initial Balance and Wallets</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Add one or more wallets with their current balances. You can skip and set this up later in the dashboard.</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">What is a wallet? Examples: BCA, BRI, Mandiri, Gopay, OVO, Dana, Cash, Bank Account, Bank Card.</p>

              <div className="space-y-4">
                {wallets.map((w, idx) => (
                  <div key={idx} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm text-neutral-700 dark:text-neutral-300">Wallet name</label>
                        <input className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100" value={w.name} onChange={(e) => {
                          const list = [...wallets];
                          list[idx] = { ...list[idx], name: e.target.value };
                          setWallets(list);
                        }} />
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-700 dark:text-neutral-300">Type</label>
                        <select className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100" value={w.type} onChange={(e) => {
                          const list = [...wallets];
                          list[idx] = { ...list[idx], type: e.target.value };
                          setWallets(list);
                        }}>
                          <option value="e_wallet">E-Wallet</option>
                          <option value="bank_card">Bank Card</option>
                          <option value="cash">Cash</option>
                          <option value="bank_account">Bank Account</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-700 dark:text-neutral-300">Initial balance</label>
                        <input type="number" inputMode="decimal" className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100" value={w.balance} onChange={(e) => {
                          const list = [...wallets];
                          list[idx] = { ...list[idx], balance: e.target.value };
                          setWallets(list);
                        }} placeholder="0" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-700 dark:text-neutral-300">Color</label>
                      <div className="mt-1 flex gap-2">
                        {['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              const list = [...wallets];
                              list[idx] = { ...list[idx], color };
                              setWallets(list);
                            }}
                            className={`w-7 h-7 rounded-full border-2 ${w.color === color ? 'border-neutral-400' : 'border-neutral-200'}`}
                            style={{ backgroundColor: color }}
                            aria-label={`Choose color ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      {wallets.length > 1 && (
                        <button type="button" className="text-sm text-red-600 dark:text-red-400" onClick={() => setWallets(wallets.filter((_, i) => i !== idx))}>Remove</button>
                      )}
                    </div>
                  </div>
                ))}

                <button type="button" className="px-3 py-2 rounded-lg text-sm border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200" onClick={() => setWallets([...wallets, { name: '', type: 'e_wallet', balance: '', color: '#10B981' }])}>Add another wallet</button>
              </div>

              {/* Skip button removed here to avoid duplication; footer contains the Skip control */}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">Financial Goal</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">This will be used for your financial health target (total assets / net worth).</p>
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300">Target amount</label>
                <input type="number" inputMode="decimal" className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100" value={financialGoalTarget} onChange={(e) => setFinancialGoalTarget(e.target.value)} placeholder="e.g., 10000" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">Preferences</h2>
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300">Theme</label>
                <select className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100" value={theme} onChange={(e) => setTheme(e.target.value as any)}>
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-neutral-700 dark:text-neutral-300">Language</label>
                <select className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="id">Bahasa Indonesia</option>
                  <option value="ms">Bahasa Melayu</option>
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">How did you find Fundy?</h2>
              <input className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100" value={discoverySource} onChange={(e) => setDiscoverySource(e.target.value)} placeholder="e.g., Friend, Twitter, Google" />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">Terms and Consent</h2>
              <label className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                <input type="checkbox" className="mt-1" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
                <span>I agree to the Terms and Conditions.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                <input type="checkbox" className="mt-1" checked={acceptedPrivacy} onChange={(e) => setAcceptedPrivacy(e.target.checked)} />
                <span>I agree to the Privacy Policy.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                <input type="checkbox" className="mt-1" checked={consentFinancialAnalysis} onChange={(e) => setConsentFinancialAnalysis(e.target.checked)} />
                <span>I allow Fundy to analyze my financial data.</span>
              </label>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button disabled={step === 0 || submitting} onClick={prev} className="px-4 py-2 rounded-lg text-sm border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 disabled:opacity-50">Back</button>
            {step < 5 ? (
              <div className="flex items-center gap-3">
                {step === 1 && (
                  <button type="button" onClick={skipForNow} className="px-4 py-2 rounded-lg text-sm text-emerald-600 dark:text-emerald-400">Skip</button>
                )}
                <button onClick={next} className="px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" disabled={submitting}>Next</button>
              </div>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || !acceptedTerms || !acceptedPrivacy} className="px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                {submitting ? 'Saving...' : 'Finish'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


