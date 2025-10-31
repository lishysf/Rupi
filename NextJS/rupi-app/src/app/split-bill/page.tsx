'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  CameraIcon, 
  DocumentTextIcon, 
  ShareIcon, 
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from '@/app/components/Sidebar';

interface SplitBillItem {
  id: string;
  name: string;
  amount: number;
  participants: string[];
}

interface ExtractedBillItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface SplitBill {
  id: string;
  title: string;
  subtotal?: number;
  tax?: number;
  serviceCharge?: number;
  totalAmount: number;
  items: SplitBillItem[];
  participants: string[];
  createdBy: string;
  createdAt: string;
  shareLink: string;
}

export default function SplitBillPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const language = useLanguage();
  const t = language?.t || ((key: string) => key);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [extractedItems, setExtractedItems] = useState<ExtractedBillItem[]>([]);
  const [billTitle, setBillTitle] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [processingFee, setProcessingFee] = useState(0);
  const [otherFees, setOtherFees] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [splitTip, setSplitTip] = useState(true);
  const [splitBill, setSplitBill] = useState<SplitBill | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'upload' | 'correct' | 'allocate' | 'complete'>('upload');

  // Allocation states
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [itemAllocations, setItemAllocations] = useState<Record<string, string[]>>({});

  // Validation states
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [isValidTotal, setIsValidTotal] = useState(true);

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  // Image compression utility
  const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original if compression fails
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // Compress the image
      console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      const compressedFile = await compressImage(file, 1920, 0.8);
      console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Compression ratio: ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`);

      // Convert to base64 for preview (use original for preview)
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Process the compressed image with Groq AI
      await processBillImage(compressedFile);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const processBillImage = async (file: File) => {
    setIsProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/split-bill/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const data = await response.json();
      
      if (data.success) {
        setExtractedText(data.extractedText);
        setExtractedItems(data.extractedItems || []);
        setBillTitle(data.billTitle || 'Bill from Image');
        setSubtotal(data.subtotal || 0);
        setTax(data.tax || 0);
        setServiceCharge(data.serviceCharge || 0);
        setDeliveryFee(data.deliveryFee || 0);
        setProcessingFee(data.processingFee || 0);
        setOtherFees(data.otherFees || 0);
        setTotalAmount(data.totalAmount || 0);
        setAmountPaid(data.amountPaid || data.totalAmount || 0);
        
        // Calculate tip amount
        const calculatedTip = (data.amountPaid || data.totalAmount || 0) - (data.totalAmount || 0);
        setTipAmount(Math.max(0, calculatedTip));
        
        // Validate the extracted data
        validateExtractedData(data.extractedItems || [], data.subtotal || 0, data.totalAmount || 0);
        
        setCurrentStep('correct');
      } else {
        setError(data.error || 'Failed to process bill image');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setError('Failed to process bill image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validateExtractedData = (items: ExtractedBillItem[], extractedSubtotal: number, extractedTotal: number) => {
    const warnings: string[] = [];
    
    // Calculate actual subtotal from items
    const actualSubtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const currentTax = tax || 0;
    const currentServiceCharge = serviceCharge || 0;
    const currentDeliveryFee = deliveryFee || 0;
    const currentProcessingFee = processingFee || 0;
    const currentOtherFees = otherFees || 0;
    const currentTip = tipAmount || 0;
    const calculatedTotal = actualSubtotal + currentTax + currentServiceCharge + currentDeliveryFee + currentProcessingFee + currentOtherFees;
    const calculatedAmountPaid = calculatedTotal + currentTip;
    
    setCalculatedTotal(calculatedTotal);
    
    // Check if subtotal matches
    const subtotalDiff = Math.abs(actualSubtotal - extractedSubtotal);
    if (subtotalDiff > 0.01) {
      warnings.push(`Subtotal mismatch: AI extracted ${Math.round(extractedSubtotal).toLocaleString()}, calculated ${Math.round(actualSubtotal).toLocaleString()} - Check item prices and quantities`);
    }
    
    // Check if total matches
    const totalDiff = Math.abs(calculatedTotal - extractedTotal);
    if (totalDiff > 0.01) {
      warnings.push(`Total mismatch: AI extracted ${Math.round(extractedTotal).toLocaleString()}, calculated ${Math.round(calculatedTotal).toLocaleString()} - Check tax and fees amounts`);
    }
    
    // Check for missing quantities
    const missingQuantities = items.filter(item => item.quantity <= 0);
    if (missingQuantities.length > 0) {
      warnings.push(`Invalid quantities found: ${missingQuantities.map(i => i.name).join(', ')} - Set quantity to 1 or more`);
    }
    
    // Check for zero prices
    const zeroPrices = items.filter(item => item.totalPrice <= 0);
    if (zeroPrices.length > 0) {
      warnings.push(`Zero prices found: ${zeroPrices.map(i => i.name).join(', ')} - Enter correct item prices`);
    }
    
    setValidationWarnings(warnings);
    setIsValidTotal(warnings.length === 0);
  };

  const updateItem = (itemId: string, field: keyof ExtractedBillItem, value: string | number) => {
    // Don't allow direct totalPrice updates - it should always be calculated
    if (field === 'totalPrice') {
      return;
    }

    setExtractedItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              [field]: value,
              // Always recalculate totalPrice when quantity or unitPrice changes
              totalPrice: (field === 'quantity' ? (value as number) : item.quantity) * 
                         (field === 'unitPrice' ? (value as number) : item.unitPrice)
            }
          : item
      )
    );
    
    // Re-validate after changes
    setTimeout(() => {
      const updatedItems = extractedItems.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              [field]: value,
              totalPrice: (field === 'quantity' ? (value as number) : item.quantity) * 
                         (field === 'unitPrice' ? (value as number) : item.unitPrice)
            }
          : item
      );
      validateExtractedData(updatedItems, subtotal, totalAmount);
    }, 100);
  };

  const removeItem = (itemId: string) => {
    setExtractedItems(items => items.filter(item => item.id !== itemId));
  };

  const addItem = () => {
    const newItem: ExtractedBillItem = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    };
    setExtractedItems([...extractedItems, newItem]);
  };

  const expandItemsByQuantity = (items: ExtractedBillItem[]) => {
    const expandedItems: ExtractedBillItem[] = [];
    
    items.forEach(item => {
      if (item.quantity > 1) {
        // Create separate items for each quantity
        for (let i = 0; i < item.quantity; i++) {
          expandedItems.push({
            id: `${item.id}-${i + 1}`,
            name: item.name,
            quantity: 1,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice
          });
        }
      } else {
        // Single item, keep as is
        expandedItems.push(item);
      }
    });
    
    return expandedItems;
  };

  const proceedToAllocation = () => {
    // Recalculate totals
    const newSubtotal = extractedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const newTotal = newSubtotal + tax + serviceCharge + deliveryFee + processingFee + otherFees;
    
    setSubtotal(newSubtotal);
    setTotalAmount(newTotal);
    
    // Expand items by quantity for allocation
    const expandedItems = expandItemsByQuantity(extractedItems);
    setExtractedItems(expandedItems);
    
    setCurrentStep('allocate');
  };

  const addParticipant = () => {
    if (!newParticipant.trim()) return;
    if (participants.includes(newParticipant.trim())) {
      setError('Participant already exists');
      return;
    }

    setParticipants([...participants, newParticipant.trim()]);
    setNewParticipant('');
    setError('');
  };

  const removeParticipant = (participant: string) => {
    setParticipants(participants.filter(p => p !== participant));
    // Remove participant from all item allocations
    const newAllocations = { ...itemAllocations };
    Object.keys(newAllocations).forEach(itemId => {
      newAllocations[itemId] = newAllocations[itemId].filter(p => p !== participant);
    });
    setItemAllocations(newAllocations);
  };

  const toggleItemParticipant = (itemId: string, participant: string) => {
    const currentAllocations = itemAllocations[itemId] || [];
    const isAllocated = currentAllocations.includes(participant);
    
    if (isAllocated) {
      setItemAllocations({
        ...itemAllocations,
        [itemId]: currentAllocations.filter(p => p !== participant)
      });
    } else {
      setItemAllocations({
        ...itemAllocations,
        [itemId]: [...currentAllocations, participant]
      });
    }
  };

  const createSplitBill = async () => {
    if (participants.length === 0) {
      setError('Please add at least one participant');
      return;
    }

    // Check if all items are allocated to at least one participant
    const unallocatedItems = extractedItems.filter(item => 
      !itemAllocations[item.id] || itemAllocations[item.id].length === 0
    );

    if (unallocatedItems.length > 0) {
      setError('Please allocate all items to participants');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const splitBillItems = extractedItems.map(item => ({
        id: item.id,
        name: item.name,
        amount: item.totalPrice, // Use totalPrice as the amount for splitting
        participants: itemAllocations[item.id] || []
      }));

      const splitBillData = {
        title: billTitle.trim(),
        subtotal,
        tax,
        serviceCharge,
        deliveryFee,
        processingFee,
        otherFees,
        totalAmount,
        tipAmount,
        splitTip,
        amountPaid,
        items: splitBillItems,
        participants,
        createdBy: session.user?.name || 'Unknown',
      };

      const response = await fetch('/api/split-bill/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(splitBillData),
      });

      if (!response.ok) {
        throw new Error('Failed to create split bill');
      }

      const data = await response.json();
      
      if (data.success) {
        setSplitBill(data.splitBill);
        setCurrentStep('complete');
        setSuccess('Split bill created successfully!');
      } else {
        setError(data.error || 'Failed to create split bill');
      }
    } catch (error) {
      console.error('Error creating split bill:', error);
      setError('Failed to create split bill. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyShareLink = () => {
    if (splitBill?.shareLink) {
      navigator.clipboard.writeText(splitBill.shareLink);
      setSuccess('Share link copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <Sidebar currentPage="Split Bill" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-12 lg:pt-0">
        {/* Header */}
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                  Split Bill
                </h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Upload a bill image or create manually to split expenses
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Step 1: Upload Image */}
        {currentStep === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
                Upload Bill Image
              </h2>
              
              <div className="space-y-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {uploadedImage ? (
                    <div className="space-y-4">
                      <img
                        src={uploadedImage}
                        alt="Uploaded bill"
                        className="mx-auto max-h-80 rounded-lg shadow-sm"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Click to change image
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <CameraIcon className="mx-auto h-16 w-16 text-gray-400" />
                      <div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          Upload a bill or receipt image
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          PNG, JPG, or WebP up to 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {(isUploading || isProcessing) && (
                  <div className="text-center">
                    <div className="inline-flex items-center px-6 py-3 text-lg font-medium text-emerald-600 dark:text-emerald-400">
                      <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-emerald-600 dark:text-emerald-400">
                        <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                      </div>
                      {isUploading ? 'Uploading...' : 'Processing with AI...'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Correct Extracted Data */}
        {currentStep === 'correct' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Review & Verify Bill Details
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please check and correct the extracted information before splitting the bill
              </p>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Bill Info & Fees */}
              <div className="lg:col-span-1 space-y-6">
                {/* Restaurant Info */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Restaurant Info
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Restaurant/Store Name
                    </label>
                    <input
                      type="text"
                      value={billTitle}
                      onChange={(e) => setBillTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter restaurant name"
                    />
                  </div>
                </div>

                {/* Fees & Charges */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Fees & Charges
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Tax
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={tax}
                          onChange={(e) => {
                            const newTax = parseFloat(e.target.value) || 0;
                            setTax(newTax);
                            setTimeout(() => {
                              validateExtractedData(extractedItems, subtotal, subtotal + newTax + serviceCharge + deliveryFee + processingFee + otherFees);
                            }, 100);
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Service Charge
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={serviceCharge}
                          onChange={(e) => {
                            const newServiceCharge = parseFloat(e.target.value) || 0;
                            setServiceCharge(newServiceCharge);
                            setTimeout(() => {
                              validateExtractedData(extractedItems, subtotal, subtotal + tax + newServiceCharge + deliveryFee + processingFee + otherFees);
                            }, 100);
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Delivery Fee
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={deliveryFee}
                          onChange={(e) => {
                            const newDeliveryFee = parseFloat(e.target.value) || 0;
                            setDeliveryFee(newDeliveryFee);
                            setTimeout(() => {
                              validateExtractedData(extractedItems, subtotal, subtotal + tax + serviceCharge + newDeliveryFee + processingFee + otherFees);
                            }, 100);
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Processing Fee
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={processingFee}
                          onChange={(e) => {
                            const newProcessingFee = parseFloat(e.target.value) || 0;
                            setProcessingFee(newProcessingFee);
                            setTimeout(() => {
                              validateExtractedData(extractedItems, subtotal, subtotal + tax + serviceCharge + deliveryFee + newProcessingFee + otherFees);
                            }, 100);
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Other Fees
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={otherFees}
                          onChange={(e) => {
                            const newOtherFees = parseFloat(e.target.value) || 0;
                            setOtherFees(newOtherFees);
                            setTimeout(() => {
                              validateExtractedData(extractedItems, subtotal, subtotal + tax + serviceCharge + deliveryFee + processingFee + newOtherFees);
                            }, 100);
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tip & Payment */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Tip & Payment
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tip Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tipAmount}
                        onChange={(e) => {
                          const newTip = parseFloat(e.target.value) || 0;
                          setTipAmount(newTip);
                          setAmountPaid(totalAmount + newTip);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount Paid
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={amountPaid}
                        onChange={(e) => {
                          const newAmountPaid = parseFloat(e.target.value) || 0;
                          setAmountPaid(newAmountPaid);
                          setTipAmount(Math.max(0, newAmountPaid - totalAmount));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={splitTip}
                        onChange={(e) => setSplitTip(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Split tip among participants
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {splitTip ? "Tip will be divided equally" : "You will pay the tip"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Items & Summary */}
              <div className="lg:col-span-2 space-y-6">
                {/* Items Editor */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Items ({extractedItems.length})
                    </h3>
                    <button
                      onClick={addItem}
                      className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Item
                      </button>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {extractedItems.map((item, index) => (
                      <div key={item.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        {/* Mobile Layout */}
                        <div className="block md:hidden space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Item #{index + 1}</span>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                              title="Remove item"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Item Name
                            </label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                              placeholder="Enter item name"
                            />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Qty
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Unit Price
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Total
                              </label>
                              <div className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                                Rp {item.totalPrice.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-5">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Item Name
                            </label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                              placeholder="Enter item name"
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Qty
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Unit Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                              placeholder="0.00"
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Total
                            </label>
                            <div className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                              Rp {item.totalPrice.toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="col-span-1">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="w-full px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                              title="Remove item"
                            >
                              <TrashIcon className="h-4 w-4 mx-auto" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Summary */}
                <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-emerald-200 dark:border-emerald-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="h-5 w-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Bill Summary
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Rp {subtotal.toLocaleString()}
                      </span>
                    </div>
                    
                    {tax > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Tax:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {tax.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {serviceCharge > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Service Charge:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {serviceCharge.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {deliveryFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Delivery Fee:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {deliveryFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {processingFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Processing Fee:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {processingFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {otherFees > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Other Fees:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {otherFees.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-600 pt-3">
                      <span className="text-base font-semibold text-gray-900 dark:text-white">Bill Total:</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        Rp {totalAmount.toLocaleString()}
                      </span>
                    </div>
                    
                    {tipAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Tip {splitTip ? '(split among all)' : '(paid by creator)'}:
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {tipAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {amountPaid !== totalAmount && (
                      <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-600 pt-3">
                        <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">Amount Paid:</span>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          Rp {amountPaid.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                </div>

                {/* Validation Status */}
                {validationWarnings.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                          Please check your calculations
                        </h3>
                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                          <ul className="list-disc list-inside space-y-1">
                            {validationWarnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Proceed Button */}
                <div className="text-center">
                  <button
                    onClick={proceedToAllocation}
                    className="inline-flex items-center px-8 py-3 bg-emerald-600 text-white text-lg font-medium rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 shadow-lg transition-all duration-200"
                  >
                    Proceed to Allocation
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Allocate Items */}
        {currentStep === 'allocate' && (
          <div className="space-y-8">
            {/* Bill Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Bill Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Restaurant/Store</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-4">{billTitle}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Rp {subtotal.toLocaleString()}
                      </span>
                    </div>
                    {tax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Tax:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {tax.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {serviceCharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Service Charge:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {serviceCharge.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Delivery Fee:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {deliveryFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {processingFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Processing Fee:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {processingFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {otherFees > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Other Fees:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {otherFees.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Bill Total:</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        Rp {totalAmount.toLocaleString()}
                      </span>
                    </div>
                    {tipAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Tip {splitTip ? '(split among all)' : '(paid by creator)'}:
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Rp {tipAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {amountPaid !== totalAmount && (
                      <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Amount Paid:</span>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          Rp {amountPaid.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Items to Allocate</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {extractedItems.length} individual items
                  </p>
                  
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {extractedItems.map((item, index) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 truncate">
                          {index + 1}. {item.name}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          Rp {item.totalPrice.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Participants */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Add Participants
                </h3>
                
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newParticipant}
                      onChange={(e) => setNewParticipant(e.target.value)}
                      placeholder="Add participant name"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                      onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                    />
                    <button
                      onClick={addParticipant}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {participants.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Participants:</p>
                      <div className="flex flex-wrap gap-2">
                        {participants.map((participant) => (
                          <span
                            key={participant}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                          >
                            <UserIcon className="h-3 w-3 mr-1" />
                            {participant}
                            <button
                              onClick={() => removeParticipant(participant)}
                              className="ml-2 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Allocation */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Allocate Items
                </h3>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {extractedItems.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Rp {item.totalPrice.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Item {index + 1}
                        </div>
                      </div>
                      
                      {participants.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Who should pay for this?</p>
                          <div className="flex flex-wrap gap-2">
                            {participants.map((participant) => {
                              const isAllocated = itemAllocations[item.id]?.includes(participant) || false;
                              return (
                                <button
                                  key={participant}
                                  onClick={() => toggleItemParticipant(item.id, participant)}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    isAllocated
                                      ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  {participant}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Add participants first to allocate items
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Error/Success Messages - Above Create Button */}
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex">
                  <XMarkIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}

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

            {/* Create Split Bill Button */}
            <div className="text-center">
              <button
                onClick={createSplitBill}
                disabled={isProcessing || participants.length === 0}
                className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin -ml-1 mr-3 h-4 w-4 text-white">
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    </div>
                    Creating Split Bill...
                  </>
                ) : (
                  <>
                    Create Split Bill
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 'complete' && splitBill && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <div className="text-center mb-8">
                <CheckIcon className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Split Bill Created Successfully!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Your split bill is ready to share with participants
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Bill Details
                  </h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Title:</span> {splitBill.title}</p>
                    <p><span className="font-medium">Total Amount:</span> Rp {splitBill.totalAmount.toLocaleString()}</p>
                    <p><span className="font-medium">Participants:</span> {splitBill.participants.join(', ')}</p>
                    <p><span className="font-medium">Created by:</span> {splitBill.createdBy}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Items Summary
                  </h3>
                  <div className="space-y-2">
                    {splitBill.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Rp {item.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-6">
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
        )}

          </div>
        </div>
      </div>
    </div>
  );
}
