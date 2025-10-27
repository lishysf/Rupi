'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  HomeIcon, 
  ChartBarIcon, 
  CogIcon, 
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  WalletIcon,
  BanknotesIcon,
  ChartPieIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface SidebarProps {
  currentPage?: string;
}

const getNavigationItems = (username: string, t: (k: string) => string) => [
  {
    name: t('dashboard'),
    href: `/${username}/dashboard`,
    icon: HomeIcon,
    current: true
  },
  {
    name: t('wallets'),
    href: `/wallets`,
    icon: WalletIcon,
    current: false
  },
  {
    name: 'Savings Goals',
    href: `/savings-goals`,
    icon: BanknotesIcon,
    current: false
  },
  {
    name: 'Budget Tracking',
    href: `/budgets`,
    icon: ChartBarIcon,
    current: false
  },
  {
    name: 'Split Bill',
    href: `/split-bill`,
    icon: ShareIcon,
    current: false
  },
  {
    name: t('table'),
    href: `/table`,
    icon: ChartBarIcon,
    current: false
  },
  {
    name: 'Analytics',
    href: `/analytics`,
    icon: ChartPieIcon,
    current: false
  },
  {
    name: t('settingsLabel'),
    href: '/settings',
    icon: CogIcon,
    current: false
  }
];

export default function Sidebar({ currentPage = 'Dashboard' }: SidebarProps) {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const router = useRouter();
  
  // Language context with safe fallback
  const language = useLanguage();
  const t = language?.t || ((key: string) => key);
  
  const username = session?.user?.name || 'user';
  const navigationItems = getNavigationItems(username, t);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigation = (href: string, name: string) => {
    setNavigatingTo(name);
    setIsMobileMenuOpen(false);
    router.push(href);
    // Reset navigation state after a short delay
    setTimeout(() => setNavigatingTo(null), 1000);
  };
  

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center h-12 px-4">
          {/* Menu button */}
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
            ) : (
              <Bars3Icon className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
            )}
          </button>
          
          {/* App title */}
          <div className="ml-4 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            Fundy
          </div>
        </div>
      </div>

      {/* Mobile backdrop - subtle overlay to show content behind */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-56 sm:w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:w-64
        lg:shadow-none
        ${isMobileMenuOpen ? 'shadow-2xl' : ''}
      `}>
        <div className="flex flex-col h-full min-h-0">
          {/* Logo */}
          <div className="flex items-center justify-center h-14 sm:h-16 px-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              Fundy
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = item.name === currentPage;
              const isLoading = navigatingTo === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href, item.name)}
                  disabled={isLoading}
                  className={`
                    flex items-center px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200 w-full text-left
                    ${isActive 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }
                    ${isLoading ? 'opacity-70 cursor-wait' : ''}
                  `}
                >
                  <item.icon className={`
                    mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0
                    ${isActive 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-neutral-400 dark:text-neutral-500'
                    }
                    ${isLoading ? 'animate-pulse' : ''}
                  `} />
                  {item.name}
                  {isLoading && (
                    <div className="ml-auto">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User info at bottom */}
          <div className="border-t border-neutral-200 dark:border-neutral-700 p-3 sm:p-4">
            {session?.user && (
              <div className="space-y-3 sm:space-y-4">
                {/* User profile */}
                <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                  <div className="flex-shrink-0">
                    {(session.user as any)?.image ? (
                      <img
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
                        src={(session.user as any).image}
                        alt={session.user.name || 'User'}
                      />
                    ) : (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>

                {/* Sign out button */}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                >
                  <ArrowRightOnRectangleIcon className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
                  {t('signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

