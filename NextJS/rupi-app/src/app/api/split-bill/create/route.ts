import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// In-memory storage for demo purposes
// In production, you would use a database
const splitBills = new Map<string, any>();

// Cleanup expired bills every 10 seconds
setInterval(() => {
  const now = Date.now();
  const expiredBills: string[] = [];
  
  for (const [id, bill] of splitBills.entries()) {
    const billAge = now - new Date(bill.createdAt).getTime();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours
    
    if (billAge > expirationTime) {
      expiredBills.push(id);
    }
  }
  
  // Remove expired bills
  expiredBills.forEach(id => {
    splitBills.delete(id);
    console.log(`Expired split bill: ${id}`);
  });
  
  if (expiredBills.length > 0) {
    console.log(`Cleaned up ${expiredBills.length} expired split bills`);
  }
}, 10000); // Check every 10 seconds

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, subtotal, tax, serviceCharge, deliveryFee, processingFee, otherFees, totalAmount, tipAmount, splitTip, amountPaid, items, participants, createdBy } = body;

    // Validate required fields
    if (!title || !items || !participants) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'At least one item is required' 
      }, { status: 400 });
    }

    if (participants.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'At least one participant is required' 
      }, { status: 400 });
    }

    // Generate unique ID and share link
    const shareId = generateShareId();
    const shareLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/split-bill/share/${shareId}`;

    // Create split bill object
    const now = new Date();
    const splitBill = {
      id: shareId,
      title: title.trim(),
      subtotal: subtotal || items.reduce((sum: number, item: any) => sum + item.amount, 0),
      tax: tax || 0,
      serviceCharge: serviceCharge || 0,
      deliveryFee: deliveryFee || 0,
      processingFee: processingFee || 0,
      otherFees: otherFees || 0,
      totalAmount: totalAmount || items.reduce((sum: number, item: any) => sum + item.amount, 0),
      tipAmount: tipAmount || 0,
      splitTip: splitTip !== undefined ? splitTip : true,
      amountPaid: amountPaid || totalAmount || items.reduce((sum: number, item: any) => sum + item.amount, 0),
      items: items.map((item: any, index: number) => ({
        ...item,
        id: item.id || `${shareId}-${index}`,
        participants: item.participants || [] // Use specific participants for each item
      })),
      participants,
      createdBy: createdBy || session.user?.name || 'Unknown',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      shareLink
    };

    // Store the split bill
    splitBills.set(shareId, splitBill);

    return NextResponse.json({
      success: true,
      splitBill
    });

  } catch (error) {
    console.error('Error creating split bill:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create split bill' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('id');

    if (!shareId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Share ID is required' 
      }, { status: 400 });
    }

    const splitBill = splitBills.get(shareId);
    
    if (!splitBill) {
      return NextResponse.json({ 
        success: false, 
        error: 'Split bill not found or has expired' 
      }, { status: 404 });
    }

    // Check if bill has expired
    const now = Date.now();
    const billAge = now - new Date(splitBill.createdAt).getTime();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours
    
    if (billAge > expirationTime) {
      // Remove expired bill
      splitBills.delete(shareId);
      return NextResponse.json({ 
        success: false, 
        error: 'Split bill has expired' 
      }, { status: 410 }); // 410 Gone
    }

    return NextResponse.json({
      success: true,
      splitBill
    });

  } catch (error) {
    console.error('Error retrieving split bill:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve split bill' 
    }, { status: 500 });
  }
}

function generateShareId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
