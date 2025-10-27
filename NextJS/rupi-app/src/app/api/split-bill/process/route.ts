import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Invalid file type' }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageFile.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Process with Groq AI
    const extractedText = await extractTextFromImage(dataUrl);
    
    if (!extractedText) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not extract text from image' 
      }, { status: 400 });
    }

    // Parse the extracted text to get bill data
    const billData = await parseBillText(extractedText, session.user?.name || 'Unknown');

    return NextResponse.json({
      success: true,
      extractedText,
      billTitle: billData.title,
      subtotal: billData.subtotal,
      tax: billData.tax,
      serviceCharge: billData.serviceCharge,
      deliveryFee: billData.deliveryFee,
      processingFee: billData.processingFee,
      otherFees: billData.otherFees,
      totalAmount: billData.totalAmount,
      amountPaid: billData.amountPaid,
      extractedItems: billData.items
    });

  } catch (error) {
    console.error('Error processing bill image:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process image' 
    }, { status: 500 });
  }
}

async function extractTextFromImage(dataUrl: string): Promise<string | null> {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this bill/receipt image. Include item names, prices, quantities, and any other relevant information. Return the text exactly as it appears in the image."
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.1,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
      stop: null
    });

    return chatCompletion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Error extracting text with Groq AI:', error);
    return null;
  }
}

async function parseBillText(text: string, createdBy: string): Promise<any> {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that parses bill/receipt text and extracts structured data for split bill functionality.

Parse the provided bill text and extract:
1. Restaurant/store name (use as bill title)
2. Individual items with names, quantities, unit prices, and total prices
3. Subtotal (sum of all items before any fees)
4. Tax amount (VAT, sales tax, etc.)
5. Service charge/fee (service fee, gratuity, tip)
6. Delivery fee (if any)
7. Processing fee (if any)
8. Other fees (any other additional charges)
9. Total amount (final bill total including all fees)
10. Amount paid (what customer actually paid - may include tip, rounding, etc.)

IMPORTANT: Return ONLY a valid JSON object. Do not include any explanatory text, comments, or additional content. Start your response with { and end with }.

Return this exact JSON structure:
{
  "title": "Restaurant/Store Name",
  "subtotal": number,
  "tax": number,
  "serviceCharge": number,
  "deliveryFee": number,
  "processingFee": number,
  "otherFees": number,
  "totalAmount": number,
  "amountPaid": number,
  "items": [
    {
      "id": "unique_id",
      "name": "Item Name",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number
    }
  ]
}

Rules:
- Extract exact item names and quantities from the text
- Calculate unitPrice = totalPrice / quantity
- Generate unique IDs for each item (use timestamp + index)
- If quantity is not mentioned, assume 1
- Be very careful with numbers and calculations
- If you see "2x Pizza" or "Pizza x2", quantity should be 2
- If you see "Pizza 25.00", assume quantity is 1 and unitPrice is 25.00
- Convert all amounts to numbers (remove currency symbols)

CRITICAL DISTINCTION:
- "totalAmount" = Bill total (subtotal + all fees) - this is what the restaurant charges
- "amountPaid" = What customer actually paid (may include additional tip, rounding, etc.)
- If you see "Total: $50.00" and "Paid: $55.00", then totalAmount=50, amountPaid=55
- If you see "Total: $50.00" and "Amount: $50.00", then totalAmount=50, amountPaid=50
- If only one amount is shown, use it for both totalAmount and amountPaid

FEE DETECTION:
- Look for: "Tax", "VAT", "Sales Tax", "GST" → tax
- Look for: "Service Charge", "Service Fee", "Gratuity", "Tip" → serviceCharge  
- Look for: "Delivery Fee", "Delivery Charge" → deliveryFee
- Look for: "Processing Fee", "Card Fee", "Transaction Fee" → processingFee
- Look for: "Convenience Fee", "Booking Fee", "Admin Fee" → otherFees

Example input: "Restaurant ABC\nPizza - $15.00\nPasta - $12.00\nTotal: $27.00"

Example output:
{
  "title": "Restaurant ABC",
  "totalAmount": 27.00,
  "items": [
    {
      "id": "1",
      "name": "Pizza",
      "amount": 15.00
    },
    {
      "id": "2", 
      "name": "Pasta",
      "amount": 12.00
    }
  ],
  "participants": ["Person1", "Person2", "Person3"],
  "createdBy": "${createdBy}",
  "createdAt": "${new Date().toISOString()}"
}`
        },
        {
          role: "user",
          content: text
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_completion_tokens: 1024,
      top_p: 0.9,
      stream: false,
      stop: null
    });

    const response = chatCompletion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    console.log('AI Response:', response);

    // Parse JSON response - handle cases where AI returns text with JSON
    let parsedData;
    try {
      // Try to parse directly first
      parsedData = JSON.parse(response.trim());
    } catch (error) {
      console.log('Direct JSON parsing failed, attempting to extract JSON from response');
      // If direct parsing fails, try to extract JSON from the response
      // Look for JSON object that starts with { and ends with }
      const jsonMatch = response.match(/\{[\s\S]*?\}(?=\s*$|\s*[^}])/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted and parsed JSON');
        } catch (parseError) {
          console.error('Error parsing extracted JSON:', parseError);
          console.error('Extracted text:', jsonMatch[0]);
          throw new Error('Could not parse AI response as JSON');
        }
      } else {
        console.error('No JSON object found in AI response');
        console.error('Full response:', response);
        throw new Error('No JSON found in AI response');
      }
    }
    
    return {
      title: parsedData.title,
      subtotal: parsedData.subtotal || 0,
      tax: parsedData.tax || 0,
      serviceCharge: parsedData.serviceCharge || 0,
      deliveryFee: parsedData.deliveryFee || 0,
      processingFee: parsedData.processingFee || 0,
      otherFees: parsedData.otherFees || 0,
      totalAmount: parsedData.totalAmount || 0,
      amountPaid: parsedData.amountPaid || parsedData.totalAmount || 0,
      items: parsedData.items || []
    };

  } catch (error) {
    console.error('Error parsing bill text:', error);
    
    // Fallback: create a basic bill structure
    return {
      title: "Bill from Image",
      subtotal: 0,
      tax: 0,
      serviceCharge: 0,
      deliveryFee: 0,
      processingFee: 0,
      otherFees: 0,
      totalAmount: 0,
      amountPaid: 0,
      items: []
    };
  }
}

function generateShareId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
