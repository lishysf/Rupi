'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle, RotateCcw } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  component: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  highlight?: boolean;
  // Manual positioning options
  manualPosition?: {
    top?: number;
    left?: number;
    offsetX?: number;
    offsetY?: number;
  };
}

interface TutorialBubbleProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Dashboard!',
    description: 'Welcome to your personal finance dashboard! Let\'s take a quick tour to show you what each section does and how to use it effectively.',
    component: 'balance-overview',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'balance-overview',
    title: 'Balance Overview',
    description: 'This shows your total balance across all wallets. It gives you a quick snapshot of your current financial position.',
    component: 'balance-overview',
    position: 'bottom',
    highlight: true,
    // Example of manual positioning - uncomment to use:
    // manualPosition: {
    //   offsetX: 50,  // Move 50px to the right from center
    //   offsetY: -20  // Move 20px up from center
    // }
  },
  {
    id: 'financial-summary',
    title: 'Financial Summary',
    description: 'Get a quick overview of your financial health with key metrics like net worth, savings rate, and financial trends.',
    component: 'financial-summary',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'income-expense',
    title: 'Income & Expense Summary',
    description: 'Track your monthly income vs expenses. This helps you understand your cash flow and spending patterns.',
    component: 'income-expense',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'financial-health',
    title: 'Financial Health Score',
    description: 'Your personalized financial health score based on spending habits, savings rate, and financial goals. Aim for 80+ for excellent health!',
    component: 'financial-health',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'trends-chart',
    title: 'Financial Trends',
    description: 'Visualize your financial data over time with interactive charts. See spending patterns, income trends, and financial growth.',
    component: 'trends-chart',
    position: 'top',
    highlight: true
  },
  {
    id: 'category-breakdown',
    title: 'Category Breakdown',
    description: 'See where your money goes with a detailed breakdown by spending categories. Helps identify areas for budget optimization.',
    component: 'category-breakdown',
    position: 'top',
    highlight: true
  },
  {
    id: 'savings-goals',
    title: 'Savings Goals',
    description: 'Set and track your financial goals. Create targets for vacations, emergency funds, or major purchases.',
    component: 'savings-goals',
    position: 'top',
    highlight: true
  },
  {
    id: 'recent-transactions',
    title: 'Recent Transactions',
    description: 'View your latest financial activity. Click on any transaction to edit, categorize, or get more details.',
    component: 'recent-transactions',
    position: 'top',
    highlight: true
  },
  {
    id: 'budget-tracking',
    title: 'Budget Tracking',
    description: 'Monitor your spending against your budget limits. Get alerts when you\'re approaching or exceeding budget categories.',
    component: 'budget-tracking',
    position: 'top',
    highlight: true
  },
  {
    id: 'complete',
    title: 'Tour Complete!',
    description: 'You\'re all set! You can restart this tour anytime by clicking the tutorial button. Start exploring your financial dashboard!',
    component: 'tutorial-button',
    position: 'bottom'
  }
];

export default function TutorialBubble({ isOpen, onClose, onStart }: TutorialBubbleProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ top: 200, left: 200 });
  const [isUpdatingPosition, setIsUpdatingPosition] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true); // Default to true to prevent auto-start
  const bubbleRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const currentStepData = TUTORIAL_STEPS[currentStep];

  // Check if user is new and should see tutorial
  useEffect(() => {
    const tutorialSeen = localStorage.getItem('dashboard-tutorial-seen');
    const isNewUser = !tutorialSeen;
    
    if (isNewUser) {
      console.log('👋 New user detected, auto-starting tutorial');
      setHasSeenTutorial(false);
      // Auto-start tutorial after a short delay
      setTimeout(() => {
        handleStart();
      }, 1000);
    } else {
      setHasSeenTutorial(true);
    }
  }, []);

  // Calculate bubble position based on target element
  const updateBubblePosition = () => {
    if (!isActive || !currentStepData || isUpdatingPosition) return;
    
    console.log('🔄 updateBubblePosition called');
    setIsUpdatingPosition(true);

    let top = 0;
    let left = 0;
    const bubble = bubbleRef.current;
    if (!bubble) return;

    const bubbleRect = bubble.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Debug logging
    console.log('Updating position for step:', currentStepData.id, 'component:', currentStepData.component);

    // Regular positioning for all steps
    const targetElement = document.querySelector(`[data-tutorial="${currentStepData.component}"]`) as HTMLElement;
    console.log('Looking for element with data-tutorial:', currentStepData.component);
    console.log('Found target element:', targetElement);
    
    if (!targetElement) {
      console.warn('Target element not found for:', currentStepData.component);
      return;
    }

    targetRef.current = targetElement;
    const rect = targetElement.getBoundingClientRect();
    console.log('Target element rect:', rect);
    
    // Check if element is properly positioned (not at 0,0 or very small)
    if (rect.width === 0 || rect.height === 0 || rect.top === 0) {
      console.warn('Target element not properly positioned, retrying...');
      setTimeout(updateBubblePosition, 100);
      return;
    }

    // Check for manual positioning first
    if (currentStepData.manualPosition) {
      if (currentStepData.manualPosition.top !== undefined && currentStepData.manualPosition.left !== undefined) {
        // Absolute positioning
        top = currentStepData.manualPosition.top;
        left = currentStepData.manualPosition.left;
      } else {
        // Offset positioning from component
        const baseTop = rect.top + (rect.height / 2) - (bubbleRect.height / 2);
        const baseLeft = rect.left + (rect.width / 2) - (bubbleRect.width / 2);
        
        top = baseTop + (currentStepData.manualPosition.offsetY || 0);
        left = baseLeft + (currentStepData.manualPosition.offsetX || 0);
      }
    } else {
      // Calculate position based on preferred position - centered with component
      switch (currentStepData.position) {
        case 'top':
          top = rect.top - bubbleRect.height - 20;
          left = rect.left + (rect.width / 2) - (bubbleRect.width / 2);
          break;
        case 'bottom':
          top = rect.bottom + 20;
          left = rect.left + (rect.width / 2) - (bubbleRect.width / 2);
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (bubbleRect.height / 2);
          left = rect.left - bubbleRect.width - 20;
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (bubbleRect.height / 2);
          left = rect.right + 20;
          break;
      }
    }

    // Ensure bubble stays within viewport
    if (left < 20) left = 20;
    if (left + bubbleRect.width > viewportWidth - 20) {
      left = viewportWidth - bubbleRect.width - 20;
    }
    if (top < 20) top = 20;
    if (top + bubbleRect.height > viewportHeight - 20) {
      top = viewportHeight - bubbleRect.height - 20;
    }

    console.log('Calculated position:', { top, left });
    setBubblePosition({ top, left });
    setIsUpdatingPosition(false);
    setIsPositioned(true);
    console.log('✅ Bubble positioned and visible');
  };

  // Reset all tutorial states
  const resetTutorialStates = () => {
    setCurrentStep(0);
    setIsInitialized(false);
    setIsPositioned(false);
    setIsUpdatingPosition(false);
    setBubblePosition({ top: 200, left: 200 });
  };

  // Start tutorial
  const handleStart = () => {
    console.log('🚀 Starting tutorial');
    resetTutorialStates();
    setIsActive(true);
    onStart();
    
    // Wait for DOM to be ready, then initialize position
    setTimeout(() => {
      console.log('⏰ Timeout executed, initializing position');
      setIsInitialized(true);
      updateBubblePosition();
    }, 500);
    
    // Fallback: show bubble after 1 second even if positioning fails
    setTimeout(() => {
      if (!isPositioned) {
        console.log('⚠️ Fallback: showing bubble without proper positioning');
        setIsPositioned(true);
      }
    }, 1000);
  };

  // Navigate steps
  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      // Don't call updateBubblePosition here - let useEffect handle it
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Don't call updateBubblePosition here - let useEffect handle it
    }
  };

  const handleComplete = () => {
    console.log('✅ Tutorial completed');
    // Mark tutorial as seen
    localStorage.setItem('dashboard-tutorial-seen', 'true');
    setHasSeenTutorial(true);
    setIsActive(false);
    resetTutorialStates();
    onClose();
  };

  const restartTutorial = () => {
    console.log('🔄 Restarting tutorial');
    resetTutorialStates();
    setTimeout(() => {
      setIsInitialized(true);
      updateBubblePosition();
    }, 200);
  };

  // Update position when step changes
  useEffect(() => {
    if (isActive && isInitialized && currentStepData && !isUpdatingPosition) {
      // Clear any existing timeouts to prevent conflicts
      const timeoutId = setTimeout(() => {
        updateBubblePosition();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentStep, isInitialized]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isActive) return;

    const handleUpdate = () => {
      setTimeout(updateBubblePosition, 100);
    };

    window.addEventListener('scroll', handleUpdate);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isActive, currentStep]);

  // Highlight target element
  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const targetElement = document.querySelector(`[data-tutorial="${currentStepData.component}"]`);
    if (targetElement && currentStepData.highlight) {
      targetElement.classList.add('tutorial-highlight');
    }

    return () => {
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [isActive, currentStep, currentStepData]);

  if (!isOpen && !isActive) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2">
        {/* Help Button */}
        <button
          onClick={handleStart}
          className="bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 w-10 h-10 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
          title="Dashboard Help & Tutorial"
          data-tutorial="tutorial-button"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
        
        {/* Skip Tutorial Button for New Users */}
        {!hasSeenTutorial && (
          <button
            onClick={() => {
              localStorage.setItem('dashboard-tutorial-seen', 'true');
              setHasSeenTutorial(true);
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 text-xs px-2 py-1 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
            title="Skip Tutorial"
          >
            Skip
          </button>
        )}
      </div>
    );
  }

  if (!isActive) return null;

  console.log('🎨 Rendering tutorial bubble:', { 
    isActive, 
    isPositioned, 
    isInitialized, 
    currentStep, 
    bubblePosition 
  });

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40 tutorial-overlay" />
      
      {/* Tutorial Bubble - show when positioned or after timeout */}
      {(isPositioned || isInitialized) && (
        <div
          ref={bubbleRef}
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 sm:w-96 max-w-[calc(100vw-2rem)] p-4 sm:p-6 tutorial-bubble"
          style={{
            top: `${bubblePosition.top}px`,
            left: `${bubblePosition.left}px`,
          }}
        >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">
                {currentStep + 1}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {currentStep + 1} of {TUTORIAL_STEPS.length}
            </span>
          </div>
          <button
            onClick={handleComplete}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
            {currentStepData.title}
          </h3>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={restartTutorial}
              className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Restart</span>
            </button>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="p-1.5 sm:p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            
            <button
              onClick={nextStep}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-sm"
            >
              <span className="hidden sm:inline">
                {currentStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'}
              </span>
              <span className="sm:hidden">
                {currentStep === TUTORIAL_STEPS.length - 1 ? '✓' : '→'}
              </span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
        </div>
      )}

      {/* Arrow pointing to target */}
      {isPositioned && currentStepData.highlight && targetRef.current && (
        (() => {
          const targetRect = targetRef.current.getBoundingClientRect();
          const bubbleRect = bubbleRef.current?.getBoundingClientRect();
          if (!bubbleRect) return null;
          
          let arrowTop = 0;
          let arrowLeft = 0;
          let borderStyle = '';
          
          switch (currentStepData.position) {
            case 'top':
              arrowTop = bubblePosition.top + bubbleRect.height;
              arrowLeft = bubblePosition.left + (bubbleRect.width / 2);
              borderStyle = 'border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white';
              break;
            case 'bottom':
              arrowTop = bubblePosition.top - 8;
              arrowLeft = bubblePosition.left + (bubbleRect.width / 2);
              borderStyle = 'border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white';
              break;
            case 'left':
              arrowTop = bubblePosition.top + (bubbleRect.height / 2);
              arrowLeft = bubblePosition.left + bubbleRect.width;
              borderStyle = 'border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-white';
              break;
            case 'right':
              arrowTop = bubblePosition.top + (bubbleRect.height / 2);
              arrowLeft = bubblePosition.left - 8;
              borderStyle = 'border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white';
              break;
          }
          
          return (
            <div
              className={`fixed z-45 w-0 h-0 ${borderStyle}`}
              style={{
                top: `${arrowTop}px`,
                left: `${arrowLeft}px`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        })()
      )}
    </>
  );
}
