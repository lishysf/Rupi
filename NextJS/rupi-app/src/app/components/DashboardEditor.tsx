'use client';

import { useState } from 'react';
import { Plus, Settings, X, GripVertical, Eye, EyeOff } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BalanceOverview from '@/app/components/BalanceOverview';
import IncomeExpenseSummary from '@/app/components/IncomeExpenseSummary';
import CategoryBreakdown from '@/app/components/CategoryBreakdown';
import TrendsChart from '@/app/components/TrendsChart';
import AIInsights from '@/app/components/AIInsights';
import RecentTransactions from '@/app/components/RecentTransactions';
import BudgetTracking from '@/app/components/BudgetTracking';
import SavingsGoals from '@/app/components/SavingsGoals';
import FinancialHealthScore from '@/app/components/FinancialHealthScore';

// Widget size definitions
const WIDGET_SIZES = {
  'square': { cols: 3, name: '1:1', icon: '⬜' },
  'half': { cols: 6, name: '1:2', icon: '▬' },
  'long': { cols: 12, name: '2:1', icon: '▭' }
};

// Available components
const AVAILABLE_COMPONENTS = {
  'balance-overview': {
    name: 'Balance Overview',
    component: BalanceOverview,
    defaultSize: 'half',
    description: 'Current balance and monthly progress'
  },
  'income-expense': {
    name: 'Income & Expense',
    component: IncomeExpenseSummary,
    defaultSize: 'square',
    description: 'Weekly and monthly summaries'
  },
  'category-breakdown': {
    name: 'Category Breakdown',
    component: CategoryBreakdown,
    defaultSize: 'square',
    description: 'Expense breakdown by category'
  },
  'trends-chart': {
    name: 'Trends Chart',
    component: TrendsChart,
    defaultSize: 'half',
    description: 'Interactive expense trends'
  },
  'ai-insights': {
    name: 'AI Insights',
    component: AIInsights,
    defaultSize: 'half',
    description: 'Smart suggestions and summaries'
  },
  'recent-transactions': {
    name: 'Recent Transactions',
    component: RecentTransactions,
    defaultSize: 'long',
    description: 'Latest transaction history'
  },
  'budget-tracking': {
    name: 'Budget Tracking',
    component: BudgetTracking,
    defaultSize: 'square',
    description: 'Monthly budget progress'
  },
  'savings-goals': {
    name: 'Savings Goals',
    component: SavingsGoals,
    defaultSize: 'square',
    description: 'Track your saving targets'
  },
  'financial-health': {
    name: 'Financial Health',
    component: FinancialHealthScore,
    defaultSize: 'square',
    description: 'Overall financial score'
  }
};

interface DashboardItem {
  id: string;
  componentKey: keyof typeof AVAILABLE_COMPONENTS;
  size: keyof typeof WIDGET_SIZES;
  order: number;
  visible: boolean;
}

// Sortable component wrapper
function SortableWidget({ 
  item, 
  isEditing, 
  getColSpanClass, 
  getAvailableSizes, 
  updateComponentSize, 
  toggleComponentVisibility, 
  removeComponent 
}: {
  item: DashboardItem;
  isEditing: boolean;
  getColSpanClass: (size: keyof typeof WIDGET_SIZES) => string;
  getAvailableSizes: (componentKey: keyof typeof AVAILABLE_COMPONENTS) => (keyof typeof WIDGET_SIZES)[];
  updateComponentSize: (id: string, newSize: keyof typeof WIDGET_SIZES) => void;
  toggleComponentVisibility: (id: string) => void;
  removeComponent: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const Component = AVAILABLE_COMPONENTS[item.componentKey].component;
  const componentInfo = AVAILABLE_COMPONENTS[item.componentKey];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${getColSpanClass(item.size)} relative group`}
    >
      {/* Drag Handle */}
      {isEditing && (
        <div 
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 p-1 bg-slate-600 hover:bg-slate-700 text-white rounded cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}

      {/* Edit Controls */}
      {isEditing && (
        <div className="absolute -top-3 -right-3 z-10 flex gap-2">
          <button
            onClick={() => toggleComponentVisibility(item.id)}
            className="p-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs"
            title={item.visible ? 'Hide' : 'Show'}
          >
            {item.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          <button
            onClick={() => removeComponent(item.id)}
            className="p-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
            title="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Size Controls */}
      {isEditing && (
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 z-10 flex gap-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
          {getAvailableSizes(item.componentKey).map((sizeKey) => {
            const sizeInfo = WIDGET_SIZES[sizeKey];
            return (
              <button
                key={sizeKey}
                onClick={() => updateComponentSize(item.id, sizeKey)}
                className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  item.size === sizeKey
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
                title={`${sizeInfo.name} - ${sizeKey === 'square' ? '4 per row' : sizeKey === 'half' ? '2 per row' : 'Full width, 2 rows tall'}`}
              >
                <span>{sizeInfo.icon}</span>
                <span>{sizeInfo.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Component Label in Edit Mode */}
      {isEditing && (
        <div className="absolute top-2 right-2 z-10 bg-slate-900 text-white text-xs px-2 py-1 rounded">
          {componentInfo.name}
        </div>
      )}

      {/* Actual Component */}
      <div className={`${isEditing ? 'ring-2 ring-emerald-300 dark:ring-emerald-600 ring-opacity-50' : ''} ${
        item.size === 'square' ? 'h-72' : 
        item.size === 'half' ? 'h-72' : 
        'h-[36rem]'
      }`}>
        <div className="h-full">
          <Component widgetSize={item.size} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardEditor() {
  const [isEditing, setIsEditing] = useState(false);
  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([
    { id: '1', componentKey: 'balance-overview', size: 'half', order: 1, visible: true },
    { id: '2', componentKey: 'financial-health', size: 'square', order: 2, visible: true },
    { id: '3', componentKey: 'income-expense', size: 'square', order: 3, visible: true },
    // Test case: square + half + square layout (3+6+3=12)
    { id: '4', componentKey: 'category-breakdown', size: 'square', order: 4, visible: true },
    { id: '5', componentKey: 'ai-insights', size: 'half', order: 5, visible: true },
    { id: '6', componentKey: 'budget-tracking', size: 'square', order: 6, visible: true },
    { id: '7', componentKey: 'trends-chart', size: 'half', order: 7, visible: true },
    { id: '8', componentKey: 'savings-goals', size: 'square', order: 8, visible: true },
    { id: '9', componentKey: 'recent-transactions', size: 'long', order: 9, visible: true },
  ]);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Custom collision detection that respects grid layout
  const customCollisionDetection = (args: any) => {
    const { droppableContainers, droppableRects, active, collisionRect } = args;
    
    // Use rectIntersection as base
    const rectIntersectionCollisions = rectIntersection(args);
    
    // If we have collisions, return them
    if (rectIntersectionCollisions.length > 0) {
      return rectIntersectionCollisions;
    }
    
    // Fallback to pointer detection for better grid awareness
    return pointerWithin(args);
  };

  const addComponent = (componentKey: keyof typeof AVAILABLE_COMPONENTS) => {
    const defaultSize = AVAILABLE_COMPONENTS[componentKey].defaultSize;
    const availableSizes = getAvailableSizes(componentKey);
    
    // Ensure the default size is allowed for this component, fallback to first available
    const finalSize = availableSizes.includes(defaultSize) ? defaultSize : availableSizes[0];
    
    const newItem: DashboardItem = {
      id: Date.now().toString(),
      componentKey,
      size: finalSize,
      order: dashboardItems.length + 1,
      visible: true
    };
    setDashboardItems([...dashboardItems, newItem]);
    setShowAddMenu(false);
  };

  const removeComponent = (id: string) => {
    setDashboardItems(dashboardItems.filter(item => item.id !== id));
  };

  const updateComponentSize = (id: string, newSize: keyof typeof WIDGET_SIZES) => {
    setDashboardItems(dashboardItems.map(item => {
      if (item.id === id) {
        const availableSizes = getAvailableSizes(item.componentKey);
        // Only update if the new size is allowed for this component
        if (availableSizes.includes(newSize)) {
          return { ...item, size: newSize };
        }
      }
      return item;
    }));
  };

  const toggleComponentVisibility = (id: string) => {
    setDashboardItems(dashboardItems.map(item => 
      item.id === id ? { ...item, visible: !item.visible } : item
    ));
  };

  // Handle drag start event
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  // Handle drag over event for real-time reordering
  const handleDragOver = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over?.id && over) {
      const oldIndex = dashboardItems.findIndex(item => item.id === active.id);
      const newIndex = dashboardItems.findIndex(item => item.id === over.id);
      
      if (oldIndex !== newIndex) {
        setDashboardItems(arrayMove(dashboardItems, oldIndex, newIndex));
      }
    }
  };

  // Handle drag end event
  const handleDragEnd = (event: any) => {
    setActiveId(null);
  };

  // Handle drag cancel event
  const handleDragCancel = () => {
    setActiveId(null);
  };

  const usedComponents = new Set(dashboardItems.map(item => item.componentKey));
  const availableToAdd = Object.entries(AVAILABLE_COMPONENTS).filter(
    ([key]) => !usedComponents.has(key as keyof typeof AVAILABLE_COMPONENTS)
  );

  const visibleItems = dashboardItems.filter(item => item.visible);

  // Function to get available sizes for a component
  const getAvailableSizes = (componentKey: keyof typeof AVAILABLE_COMPONENTS): (keyof typeof WIDGET_SIZES)[] => {
    // Only trends-chart and recent-transactions can use 'long' size
    if (componentKey === 'trends-chart' || componentKey === 'recent-transactions') {
      return ['square', 'half', 'long'];
    }
    // All other components can only use square and half
    return ['square', 'half'];
  };

  // Get proper Tailwind class for grid column span
  const getColSpanClass = (size: keyof typeof WIDGET_SIZES) => {
    switch (size) {
      case 'square':
        return 'lg:col-span-3';
      case 'half':
        return 'lg:col-span-6';
      case 'long':
        return 'lg:col-span-12';
      default:
        return 'lg:col-span-3';
    }
  };

  return (
    <div className="relative">
      {/* Edit Toggle Button */}
      <div className="fixed top-20 right-4 z-50">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isEditing 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <Settings className="w-4 h-4 mr-2 inline" />
          {isEditing ? 'Exit Edit' : 'Edit Dashboard'}
        </button>
      </div>

      {/* Add Component Menu */}
      {isEditing && (
        <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Customize Dashboard
            </h3>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Component
            </button>
          </div>

          {/* Available Components to Add */}
          {showAddMenu && availableToAdd.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {availableToAdd.map(([key, component]) => (
                <button
                  key={key}
                  onClick={() => addComponent(key as keyof typeof AVAILABLE_COMPONENTS)}
                  className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors text-left"
                >
                  <div className="font-medium text-slate-900 dark:text-white text-sm">
                    {component.name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {component.description}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showAddMenu && availableToAdd.length === 0 && (
            <div className="text-center py-4 text-slate-600 dark:text-slate-400">
              All components are already added to your dashboard
            </div>
          )}
        </div>
      )}

      {/* Dashboard Grid with Drag and Drop */}
      <DndContext 
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext 
          items={visibleItems.map(item => item.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-max">
            {visibleItems.map((item) => (
              <SortableWidget
                key={item.id}
                item={item}
                isEditing={isEditing}
                getColSpanClass={getColSpanClass}
                getAvailableSizes={getAvailableSizes}
                updateComponentSize={updateComponentSize}
                toggleComponentVisibility={toggleComponentVisibility}
                removeComponent={removeComponent}
              />
            ))}
          </div>
        </SortableContext>
        
        <DragOverlay adjustScale={false}>
          {activeId ? (
            <div className="opacity-90 transform rotate-2 shadow-2xl pointer-events-none">
              {(() => {
                const activeItem = dashboardItems.find(item => item.id === activeId);
                if (!activeItem) return null;
                
                const Component = AVAILABLE_COMPONENTS[activeItem.componentKey].component;
                
                // Fixed width based on component size to prevent size changes during drag
                const getFixedWidth = (size: keyof typeof WIDGET_SIZES) => {
                  switch (size) {
                    case 'square':
                      return 'w-72'; // Fixed 288px width for square
                    case 'half':
                      return 'w-96'; // Fixed 384px width for half
                    case 'long':
                      return 'w-[48rem]'; // Fixed 768px width for long
                    default:
                      return 'w-72';
                  }
                };
                
                return (
                  <div className={`${getFixedWidth(activeItem.size)} relative`}>
                    <div className={`${
                      activeItem.size === 'square' ? 'h-72' : 
                      activeItem.size === 'half' ? 'h-72' : 
                      'h-[36rem]'
                    } ring-4 ring-emerald-400 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-xl`}>
                      <div className="h-full">
                        <Component widgetSize={activeItem.size} />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Instructions */}
      {isEditing && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            💡 How to Customize:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• <strong>Add:</strong> Click "Add Component" to add new widgets</li>
            <li>• <strong>Remove:</strong> Click the X button to remove a component</li>
            <li>• <strong>Resize:</strong> Use widget size buttons (⬜ 1:1: 4 per row, ▬ 1:2: 2 per row, ▭ 2:1: Full width, 2 rows tall)</li>
            <li>• <strong>Reorder:</strong> Drag the grip handle (⋮⋮) to rearrange components</li>
            <li>• <strong>Hide:</strong> Use the eye icon to hide/show components</li>
          </ul>
        </div>
      )}
    </div>
  );
}
