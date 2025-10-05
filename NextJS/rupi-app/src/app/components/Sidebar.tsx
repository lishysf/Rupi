'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { 
  HomeIcon, 
  ChartBarIcon, 
  CogIcon, 
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  currentPage?: string;
}

const getNavigationItems = (username: string) => [
  {
    name: 'Dashboard',
    href: `/${username}/dashboard`,
    icon: HomeIcon,
    current: true
  },
  {
    name: 'Analytics',
    href: `/${username}/analytics`,
    icon: ChartBarIcon,
    current: false
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    current: false
  }
];

export default function Sidebar({ currentPage = 'Dashboard' }: SidebarProps) {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const username = session?.user?.name || 'user';
  const navigationItems = getNavigationItems(username);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobileMenu}
          className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          ) : (
            <Bars3Icon className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          )}
        </button>
      </div>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:w-64
      `}>
        <div className="flex flex-col h-full min-h-0">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              Fundy
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = item.name === currentPage;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
                    ${isActive 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-400 dark:text-slate-500'
                    }
                  `} />
                  {item.name}
                </a>
              );
            })}
          </nav>

          {/* User info at bottom */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4">
            {session?.user && (
              <div className="space-y-4">
                {/* User profile */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex-shrink-0">
                    {session.user.image ? (
                      <img
                        className="h-10 w-10 rounded-full"
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>

                {/* Sign out button */}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                >
                  <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

