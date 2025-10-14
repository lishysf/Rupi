'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Add error handling for theme context
  let theme: 'light' | 'dark' = 'light';
  let setTheme = (theme: 'light' | 'dark') => {};
  
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    setTheme = themeContext.setTheme;
  } catch (error) {
    console.warn('Theme context not available:', error);
  }

  // Language context (optional fallback)
  let language: 'en' | 'id' = 'en';
  let setLanguage = (lang: 'en' | 'id') => {};
  let t = (key: string) => key;
  try {
    const langCtx = useLanguage();
    language = langCtx.language;
    setLanguage = langCtx.setLanguage as (l: 'en' | 'id') => void;
    t = langCtx.t;
  } catch (error) {
    console.warn('Language context not available:', error);
  }

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
            Fundy
          </div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const themeOptions = [
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Clean and bright interface'
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Easy on the eyes'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar currentPage="Settings" />
      <div className="flex-1 lg:ml-64">
        <main className="px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8 pb-20 lg:pb-8">
          <div className="p-4 md:p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100">{t('settings')}</h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-2">{t('customizeExperience')}</p>
            </div>

            {/* Theme Settings */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('appearance')}</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('chooseTheme')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {themeOptions.map((option) => {
                    const IconComponent = option.icon;
                    const isSelected = theme === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as 'light' | 'dark')}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-neutral-200 dark:border-transparent hover:border-neutral-300 dark:hover:border-transparent'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected 
                              ? 'bg-emerald-100 dark:bg-emerald-800' 
                              : 'bg-neutral-100 dark:bg-neutral-800'
                          }`}>
                            <IconComponent className={`w-4 h-4 ${
                              isSelected 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-neutral-600 dark:text-neutral-400'
                            }`} />
                          </div>
                          <span className={`font-medium ${
                            isSelected 
                              ? 'text-emerald-900 dark:text-emerald-100' 
                              : 'text-neutral-900 dark:text-neutral-100'
                          }`}>
                            {option.label}
                          </span>
                        </div>
                        
                        <p className={`text-sm text-left ${
                          isSelected 
                            ? 'text-emerald-700 dark:text-emerald-300' 
                            : 'text-neutral-600 dark:text-neutral-400'
                        }`}>
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent shadow-sm mt-8">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <span className="w-5 h-5 text-emerald-600 dark:text-emerald-400">🌐</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('language')}</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('chooseLanguage')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setLanguage('id')}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                      language === 'id'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-neutral-200 dark:border-transparent hover:border-neutral-300 dark:hover:border-transparent'
                    }`}
                  >
                    {language === 'id' && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{t('indonesian')}</div>
                  </button>

                  <button
                    onClick={() => setLanguage('en')}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                      language === 'en'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-neutral-200 dark:border-transparent hover:border-neutral-300 dark:hover:border-transparent'
                    }`}
                  >
                    {language === 'en' && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{t('english')}</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Additional Settings Sections */}
            <div className="mt-8 space-y-6">
              {/* Account Settings */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Account</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Profile Information</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Update your personal details</p>
                      </div>
                      <button className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                        Edit
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Security</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Manage your password and security</p>
                      </div>
                      <button className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* App Settings */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-transparent shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Application</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Notifications</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Manage notification preferences</p>
                      </div>
                      <button className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                        Configure
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Data Export</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Export your financial data</p>
                      </div>
                      <button className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                        Export
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}