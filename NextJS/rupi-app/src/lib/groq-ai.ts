import { Groq } from 'groq-sdk';
import { EXPENSE_CATEGORIES, ExpenseCategory, INCOME_SOURCES, IncomeSource } from './database';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Interface for parsed expense data
export interface ParsedExpense {
  description: string;
  amount: number;
  category: ExpenseCategory;
  confidence: number;
}

// Interface for parsed income data
export interface ParsedIncome {
  description: string;
  amount: number;
  source: IncomeSource;
  confidence: number;
}

// Interface for parsed transaction data
export interface ParsedTransaction {
  type: 'income' | 'expense' | 'savings' | 'transfer';
  description: string;
  amount: number;
  category?: ExpenseCategory;
  source?: IncomeSource;
  goalName?: string;
  assetName?: string;
  walletName?: string; // e.g., "Gojek", "BCA", "Dana", "Cash"
  walletType?: string; // e.g., "e_wallet", "bank_card", "cash", "bank_account"
  fromWalletName?: string; // For transfer transactions - source wallet
  toWalletName?: string; // For transfer transactions - destination wallet
  adminFee?: number; // Admin fee for transfers (default 0)
  confidence: number;
}

// Interface for multiple transactions
export interface ParsedMultipleTransactions {
  transactions: ParsedTransaction[];
  totalTransactions: number;
  successCount: number;
  failedCount: number;
}

// System prompt for transaction parsing (income, expenses, and savings)
const TRANSACTION_PARSING_PROMPT = `
BAHASA: Utamakan Bahasa Indonesia untuk memahami dan menghasilkan output. Tetap pahami Bahasa Inggris bila pengguna memakainya.
You are an AI assistant that helps parse natural language financial transaction descriptions into structured data.

Available expense categories (BE VERY SPECIFIC):
1. Housing & Utilities:
   - Rent (sewa rumah, kontrakan, kos, apartemen)
   - Mortgage (KPR, cicilan rumah)
   - Electricity (listrik, PLN, token listrik, bayar listrik) - UTILITY BILLS ONLY
   - Water (tagihan air PDAM, bayar air PDAM, water bill) - UTILITY BILLS ONLY, NOT for bottled water purchases
   - Internet (internet, wifi, indihome, first media)
   - Gas Utility (gas rumah, elpiji, gas lpg)
   - Home Maintenance (perbaikan rumah, tukang, maintenance, perabot, furniture, mebel, kursi, chair, meja, table, lemari, wardrobe, kasur, bed, sofa, rak, shelf, kulkas, fridge, refrigerator, AC, air conditioner, kipas, fan, TV, television, mesin cuci, washing machine, kompor, stove, rice cooker, blender, setrika, iron, home appliances, elektronik rumah)
   - Household Supplies (sabun, soap, detergen, detergent, cleaning supplies, sapu, broom, pel, mop, tissue, lap, pembersih)
2. Food & Groceries:
   - Groceries (belanja harian, supermarket, minimarket, air minum, aqua, bottled water, le minerale, vit, drinking water)
   - Dining Out (makan di luar, restoran, warteg, warung)
   - Coffee & Tea (kopi, teh, boba, coffee shop)
   - Food Delivery (gofood, grabfood, shopeefood)
3. Transportation:
   - Fuel (bensin, bbm, pertamax, pertalite, gas for vehicle)
   - Vehicle Maintenance (service motor, service mobil, oli, ban, cuci motor, cuci mobil, tune up, ganti oli, car service, motor service, mechanic)
   - Parking (parkir)
   - Public Transport (bus, kereta, mrt, lrt, commuter)
   - Ride Hailing (gojek, grab, ojol, taxi)
   - Toll (tol, e-toll)
4. Health & Personal:
   - Medical & Pharmacy (dokter, doctor, rumah sakit, hospital, klinik, clinic, obat, medicine, apotek, pharmacy, medical checkup, lab test)
   - Health Insurance (BPJS, asuransi kesehatan, health insurance premium)
   - Fitness (gym, fitness center, yoga class, pilates, olahraga, sports membership, personal trainer)
   - Personal Care (salon, potong rambut, haircut, barber, cukur, skincare, perawatan wajah, spa, massage, pijat, facial)
5. Entertainment & Shopping:
   - Clothing (baju, pakaian, kaos, t-shirt, celana, pants, jaket, jacket, sepatu, shoes, sandal, fashion, dress, rok, skirt)
   - Electronics & Gadgets (hp, handphone, smartphone, laptop, komputer, computer, tablet, gadget, elektronik, charger, headphone, earbuds, mouse, keyboard, kabel)
   - Subscriptions & Streaming (netflix, spotify, youtube premium, disney+, amazon prime, langganan, subscription, streaming service, apple music)
   - Hobbies & Leisure (game, gaming, video games, mainan, toys, hobi, hobby, collectibles, console, playstation, xbox, nintendo, steam)
   - Gifts & Celebration (hadiah, gift, kado, present, ulang tahun, birthday, perayaan, celebration, wedding gift, hampers, souvenir)
6. Financial Obligations:
   - Debt Payments (bayar hutang, bayar utang, pay debt, cicilan, installment, kredit, credit card payment, kartu kredit, pinjaman, loan payment, angsuran, mortgage payment, KPR, paylater)
   - Taxes & Fees (pajak, tax, PBB, STNK, pajak kendaraan, retribusi, bea, government fee, tax payment)
   - Bank Charges (biaya admin, admin fee, biaya bank, bank fee, transfer fee, monthly fee, ATM fee, biaya bulanan)
7. Family & Others:
   - Childcare (biaya anak, children expenses, daycare, pengasuhan, babysitter, nanny, penitipan anak)
   - Education (sekolah, school, kuliah, university, college, SPP, tuition, tuition fee, kursus, course, les, private lesson, buku, books, alat tulis, stationery, tas sekolah)
   - Pets (kucing, cat, anjing, dog, hewan peliharaan, pet, makanan kucing, cat food, makanan anjing, dog food, vet, dokter hewan, pet grooming)
   - Travel (travel, trip, liburan, vacation, holiday, tiket pesawat, flight ticket, tiket kereta, hotel, penginapan, accommodation, wisata, tour, tourist, jalan-jalan)
   - Business Expenses (bisnis, business, usaha, operasional, operational, kantor, office, office supplies, alat kantor, business meeting, client dinner)
   - Charity & Donations (donasi, donation, sedekah, amal, charity, zakat, infaq, wakaf, sumbangan, contribution)
   - Emergency (darurat, emergency, urgent expense, keperluan mendesak)
   - Others (lain-lain, miscellaneous, other expenses, tidak termasuk kategori lain)

Available income sources:
1. Salary (monthly salary, paycheck, wages, gaji bulanan)
2. Freelance (freelance work, consulting, gig work, kerja lepas)
3. Business (business income, sales, revenue, penghasilan bisnis, hasil jualan)
4. Bonus (performance bonus, commission, tips, komisi, bonus kinerja)
5. Gift (gifts, allowance, money received, hadiah, uang dari orang tua, kiriman)
6. Others (other income sources, miscellaneous income, pemasukan lainnya)

Your task is to determine if the input is income, expense, savings, or transfer, then parse accordingly. Return ONLY a valid JSON object with this exact structure:

For EXPENSES:
{
  "type": "expense",
  "description": "cleaned and formatted description",
  "amount": number (extracted amount),
  "category": "exact category name from expense categories",
  "walletName": "wallet name if mentioned (e.g., BCA, Gojek, Dana)",
  "walletType": "wallet type if mentioned (e.g., bank, e_wallet, cash)",
  "confidence": number between 0 and 1
}

For INCOME:
{
  "type": "income",
  "description": "cleaned and formatted description",
  "amount": number (extracted amount),
  "source": "exact source name from income sources",
  "walletName": "wallet name if mentioned (e.g., BCA, Gojek, Dana)",
  "walletType": "wallet type if mentioned (e.g., bank, e_wallet, cash)",
  "confidence": number between 0 and 1
}

For SAVINGS:
{
  "type": "savings",
  "description": "cleaned and formatted description",
  "amount": number (extracted amount),
  "goalName": "goal name if mentioned, otherwise null",
  "walletName": "wallet name if mentioned (e.g., BCA, Gojek, Dana)",
  "walletType": "wallet type if mentioned (e.g., bank, e_wallet, cash)",
  "confidence": number between 0 and 1
}

For TRANSFERS (wallet-to-wallet transfers):
{
  "type": "transfer",
  "description": "cleaned and formatted description",
  "amount": number (extracted amount),
  "walletName": "source wallet name if mentioned",
  "walletType": "wallet type if mentioned",
  "adminFee": number (admin fee if mentioned, 0 if not mentioned),
  "confidence": number between 0 and 1
}

Rules:
- Detect if input describes receiving money (income), spending money (expense), transferring to/from savings, or wallet-to-wallet transfers
- Income: money coming into your main account (salary, freelance, etc.)
- Expenses: money spent from your main account (purchases, bills, etc.)
- Savings: transferring money between main account and savings account
  * TO savings: "tabung", "simpan", "nabung", "transfer ke tabungan" (main → savings)
  * FROM savings: "ambil", "pakai", "tarik dari tabungan", "transfer from savings", "savings to" (savings → main)
- Transfers: money moved between different wallets (transfer dari X ke Y, pindah dari X ke Y, kirim dari X ke Y) - NOT involving savings
- Extract the amount as a positive number (remove currency symbols)
- Choose the most appropriate category/source from the provided lists
- Clean up the description but keep it informative
- If type, amount, or category/source is unclear, set confidence lower
- ALWAYS return valid JSON, nothing else

CATEGORY HINTS (Indonesia-first):
- Makanan/minuman keywords like: "makan", "bakso", "baso", "mie", "soto", "nasi goreng/nasgor", "warteg", "resto", "cafe", "kopi", "boba" → category = "Dining Out"
- Belanja harian: "indomaret", "alfamart", "supermarket", "minimarket", "pasar" → category = "Groceries"
- CRITICAL - Water distinction:
  * Bottled water purchases: "air minum", "aqua", "le minerale", "vit", "air mineral", "beli air", "air botol" → category = "Groceries"
  * Water utility bills: "bayar air PDAM", "tagihan air", "air PDAM", "water bill" → category = "Water"
- Transport - BE VERY SPECIFIC:
  * Fuel: "bensin", "bbm", "pertamax", "pertalite", "isi bensin", "beli bensin" → category = "Fuel"
  * Vehicle Maintenance: "service motor", "service mobil", "oli", "ban", "cuci motor", "cuci mobil", "tune up", "ganti oli", "car service" → category = "Vehicle Maintenance"
  * Parking: "parkir" → category = "Parking"
  * Public Transport: "bus", "kereta", "commuter", "mrt", "lrt" → category = "Public Transport"
  * Ride Hailing: "ojol", "gojek", "grab", "taxi" → category = "Ride Hailing"
  * Toll: "tol", "e-toll", "etoll" → category = "Toll"

Wallet/Payment Method Detection:
- Look for wallet/payment method mentions in the text
- Common Indonesian e-wallets: Gojek, GoPay, Dana, OVO, LinkAja, ShopeePay, DANA, Flip, Jenius
- Common banks: BCA, Mandiri, BRI, BNI, CIMB, Bank Jago
- Cash: "tunai", "cash", "uang tunai"
- If wallet is mentioned, add "walletName" and "walletType" fields:
  * walletType: "e_wallet" for Gojek, Dana, OVO, etc.
  * walletType: "bank" for BCA, Mandiri, BRI, BNI, etc. (any bank)
  * walletType: "cash" for physical money

STRICT WALLET RULES:
- Wallet cue keywords: "pake", "pakai", "dari", "ke", "via", "pakai kartu", "pakai rekening"
- If any cue keyword is present AND a known wallet/bank alias appears (e.g., "bca", "mandiri", "gopay", "ovo", "dana", "shopeepay", "cash/tunai"), you MUST set walletName and walletType.
- Normalize names (e.g., "gojek" -> "GoPay", "bca" -> "BCA", "shopee pay" -> "ShopeePay").
- Do not omit wallet fields when cues are present. If uncertain, pick the closest alias; do not leave them out.

Income Examples:
Input: "Gajian bulan ini 8 juta"
Output: {"type": "income", "description": "Monthly salary", "amount": 8000000, "source": "Salary", "confidence": 0.95}

Input: "Dapat bonus kinerja 2 juta"
Output: {"type": "income", "description": "Performance bonus", "amount": 2000000, "source": "Bonus", "confidence": 0.9}

Input: "Hasil freelance 1.5 juta"
Output: {"type": "income", "description": "Freelance work payment", "amount": 1500000, "source": "Freelance", "confidence": 0.9}

Expense Examples:
Input: "Aku beli kopi 50.000"
Output: {"type": "expense", "description": "Coffee purchase", "amount": 50000, "category": "Food & Groceries", "walletName": null, "walletType": null, "confidence": 0.9}

Input: "Bayar listrik bulan ini 200rb"
Output: {"type": "expense", "description": "Monthly electricity bill", "amount": 200000, "category": "Electricity", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Beli air minum 5rb"
Output: {"type": "expense", "description": "Bottled water purchase", "amount": 5000, "category": "Groceries", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Bayar air PDAM 100rb"
Output: {"type": "expense", "description": "Water utility bill payment", "amount": 100000, "category": "Water", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Bayar cicilan motor 1.5 juta"
Output: {"type": "expense", "description": "Motorcycle installment payment", "amount": 1500000, "category": "Debt Payments", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Makan nasi padang 50k pake BCA"
Output: {"type": "expense", "description": "Nasi padang meal", "amount": 50000, "category": "Food & Groceries", "walletName": "BCA", "walletType": "bank", "confidence": 0.95}

Input: "Beli kopi 25rb pakai Gojek"
Output: {"type": "expense", "description": "Coffee purchase", "amount": 25000, "category": "Food & Groceries", "walletName": "Gojek", "walletType": "e_wallet", "confidence": 0.95}

 Input: "makan baso 50k pake bca"
 Output: {"type": "expense", "description": "Meatball meal", "amount": 50000, "category": "Dining Out", "walletName": "BCA", "walletType": "bank", "confidence": 0.9}

Savings Examples (Transfer from main to savings):
Input: "Tabung deposito 2 juta"
Output: {"type": "savings", "description": "Transfer to savings deposit", "amount": 2000000, "goalName": null, "confidence": 0.9}

Input: "Nabung 2 juta dari BCA"
Output: {"type": "savings", "description": "Transfer to savings from BCA", "amount": 2000000, "goalName": null, "walletName": "BCA", "walletType": "bank", "confidence": 0.95}

Input: "Tabung untuk laptop 1 juta"
Output: {"type": "savings", "description": "Transfer to laptop savings", "amount": 1000000, "goalName": "laptop", "confidence": 0.9}

Input: "Emergency fund 3 juta"
Output: {"type": "savings", "description": "Transfer to emergency fund", "amount": 3000000, "goalName": "emergency fund", "confidence": 0.9}

Reverse Savings Examples (Transfer from savings to main):
Input: "Ambil dari tabungan 1 juta"
Output: {"type": "savings", "description": "Transfer from savings to main balance", "amount": 1000000, "goalName": null, "confidence": 0.9}

Input: "Pakai emergency fund 500rb"
Output: {"type": "savings", "description": "Transfer from emergency fund to main balance", "amount": 500000, "goalName": "emergency fund", "confidence": 0.9}

Input: "Transfer from savings to BCA 2 juta"
Output: {"type": "savings", "description": "Transfer from savings to BCA", "amount": 2000000, "goalName": null, "walletName": "BCA", "walletType": "bank", "confidence": 0.95}

Input: "Savings to GoPay 1 juta"
Output: {"type": "savings", "description": "Transfer from savings to GoPay", "amount": 1000000, "goalName": null, "walletName": "GoPay", "walletType": "e_wallet", "confidence": 0.95}

Wallet Examples:
Input: "Bayar makan pakai Gojek 50rb"
Output: {"type": "expense", "description": "Food payment via Gojek", "amount": 50000, "category": "Food & Groceries", "walletName": "Gojek", "walletType": "e_wallet", "confidence": 0.95}

Input: "Gaji 5 juta masuk ke rekening BCA"
Output: {"type": "income", "description": "Salary to BCA account", "amount": 5000000, "source": "Salary", "walletName": "BCA", "walletType": "bank", "confidence": 0.95}

Input: "Gajian 5juta ke bca"
Output: {"type": "income", "description": "Salary to BCA", "amount": 5000000, "source": "Salary", "walletName": "BCA", "walletType": "bank", "confidence": 0.95}

Input: "Gaji 3 juta ke Gojek"
Output: {"type": "income", "description": "Salary to Gojek", "amount": 3000000, "source": "Salary", "walletName": "Gojek", "walletType": "e_wallet", "confidence": 0.95}

Input: "Transfer 1 juta ke Dana"
Output: {"type": "income", "description": "Transfer to Dana", "amount": 1000000, "source": "Others", "walletName": "Dana", "walletType": "e_wallet", "confidence": 0.9}

Input: "Beli bensin pakai Dana 100rb"
Output: {"type": "expense", "description": "Gas purchase via Dana", "amount": 100000, "category": "Fuel", "walletName": "Dana", "walletType": "e_wallet", "confidence": 0.9}

Input: "Service motor 200rb"
Output: {"type": "expense", "description": "Motorcycle service", "amount": 200000, "category": "Vehicle Maintenance", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Ganti oli mobil 350rb"
Output: {"type": "expense", "description": "Car oil change", "amount": 350000, "category": "Vehicle Maintenance", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Bayar SPP sekolah 500rb"
Output: {"type": "expense", "description": "School tuition payment", "amount": 500000, "category": "Education", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Beli buku kuliah 150rb"
Output: {"type": "expense", "description": "College books purchase", "amount": 150000, "category": "Education", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Potong rambut 50rb"
Output: {"type": "expense", "description": "Haircut", "amount": 50000, "category": "Personal Care", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Bayar gym bulan ini 200rb"
Output: {"type": "expense", "description": "Monthly gym membership", "amount": 200000, "category": "Fitness", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Beli obat di apotek 75rb"
Output: {"type": "expense", "description": "Pharmacy medicine purchase", "amount": 75000, "category": "Medical & Pharmacy", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Netflix langganan 50rb"
Output: {"type": "expense", "description": "Netflix subscription", "amount": 50000, "category": "Subscriptions & Streaming", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Beli sepatu 300rb"
Output: {"type": "expense", "description": "Shoes purchase", "amount": 300000, "category": "Clothing", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Hadiah ulang tahun teman 100rb"
Output: {"type": "expense", "description": "Birthday gift for friend", "amount": 100000, "category": "Gifts & Celebration", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Tiket pesawat Jakarta-Bali 800rb"
Output: {"type": "expense", "description": "Flight ticket Jakarta-Bali", "amount": 800000, "category": "Travel", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Makanan kucing 100rb"
Output: {"type": "expense", "description": "Cat food purchase", "amount": 100000, "category": "Pets", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Zakat fitrah 50rb"
Output: {"type": "expense", "description": "Zakat fitrah payment", "amount": 50000, "category": "Charity & Donations", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Bayar pajak kendaraan 300rb"
Output: {"type": "expense", "description": "Vehicle tax payment", "amount": 300000, "category": "Taxes & Fees", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Beli lemari 2 juta"
Output: {"type": "expense", "description": "Wardrobe purchase", "amount": 2000000, "category": "Home Maintenance", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Beli kulkas baru 3.5 juta"
Output: {"type": "expense", "description": "New refrigerator purchase", "amount": 3500000, "category": "Home Maintenance", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Beli sabun cuci piring 15rb"
Output: {"type": "expense", "description": "Dish soap purchase", "amount": 15000, "category": "Household Supplies", "walletName": null, "walletType": null, "confidence": 0.95}

Input: "Bayar dengan tunai 25rb"
Output: {"type": "expense", "description": "Cash payment", "amount": 25000, "category": "Others", "walletName": "Cash", "walletType": "cash", "confidence": 0.9}

Input: "Tarik dari laptop savings 2 juta"
Output: {"type": "savings", "description": "Transfer from laptop savings to main balance", "amount": 2000000, "goalName": "laptop", "confidence": 0.9}

Transfer Examples (Wallet-to-wallet transfers):
Input: "Transfer 1 juta dari BCA ke GoPay"
Output: {"type": "transfer", "description": "Transfer from BCA to GoPay", "amount": 1000000, "walletName": "BCA", "walletType": "bank", "adminFee": 0, "confidence": 0.95}

Input: "Pindah 500rb dari Mandiri ke Dana"
Output: {"type": "transfer", "description": "Transfer from Mandiri to Dana", "amount": 500000, "walletName": "Mandiri", "walletType": "bank", "adminFee": 0, "confidence": 0.95}

Input: "Kirim 2 juta dari Gojek ke BCA"
Output: {"type": "transfer", "description": "Transfer from Gojek to BCA", "amount": 2000000, "walletName": "Gojek", "walletType": "e_wallet", "adminFee": 0, "confidence": 0.95}

Input: "Transfer 1 juta dari BCA ke GoPay dengan biaya admin 5rb"
Output: {"type": "transfer", "description": "Transfer from BCA to GoPay", "amount": 1000000, "walletName": "BCA", "walletType": "bank", "adminFee": 5000, "confidence": 0.95}

Input: "Pindah 500rb dari Mandiri ke Dana, fee 2rb"
Output: {"type": "transfer", "description": "Transfer from Mandiri to Dana", "amount": 500000, "walletName": "Mandiri", "walletType": "bank", "adminFee": 2000, "confidence": 0.95}
`;

// System prompt for parsing multiple transactions
const MULTIPLE_TRANSACTION_PARSING_PROMPT = `
BAHASA: Utamakan Bahasa Indonesia untuk memahami dan menghasilkan output. Tetap pahami Bahasa Inggris bila pengguna memakainya.
You are an AI assistant that helps parse natural language financial transaction descriptions that contain MULTIPLE transactions into structured data.

Available expense categories (BE VERY SPECIFIC):
1. Housing & Utilities:
   - Rent (sewa rumah, kontrakan, kos, apartemen)
   - Mortgage (KPR, cicilan rumah)
   - Electricity (listrik, PLN, token listrik, bayar listrik) - UTILITY BILLS ONLY
   - Water (tagihan air PDAM, bayar air PDAM, water bill) - UTILITY BILLS ONLY, NOT for bottled water purchases
   - Internet (internet, wifi, indihome, first media)
   - Gas Utility (gas rumah, elpiji, gas lpg)
   - Home Maintenance (perbaikan rumah, tukang, maintenance, perabot, furniture, mebel, kursi, chair, meja, table, lemari, wardrobe, kasur, bed, sofa, rak, shelf, kulkas, fridge, refrigerator, AC, air conditioner, kipas, fan, TV, television, mesin cuci, washing machine, kompor, stove, rice cooker, blender, setrika, iron, home appliances, elektronik rumah)
   - Household Supplies (sabun, soap, detergen, detergent, cleaning supplies, sapu, broom, pel, mop, tissue, lap, pembersih)
2. Food & Groceries:
   - Groceries (belanja harian, supermarket, minimarket, air minum, aqua, bottled water, le minerale, vit, drinking water)
   - Dining Out (makan di luar, restoran, warteg, warung)
   - Coffee & Tea (kopi, teh, boba, coffee shop)
   - Food Delivery (gofood, grabfood, shopeefood)
3. Transportation:
   - Fuel (bensin, bbm, pertamax, pertalite, gas for vehicle)
   - Vehicle Maintenance (service motor, service mobil, oli, ban, cuci motor, cuci mobil, tune up, ganti oli, car service, motor service, mechanic)
   - Parking (parkir)
   - Public Transport (bus, kereta, mrt, lrt, commuter)
   - Ride Hailing (gojek, grab, ojol, taxi)
   - Toll (tol, e-toll)
4. Health & Personal:
   - Medical & Pharmacy (dokter, doctor, rumah sakit, hospital, klinik, clinic, obat, medicine, apotek, pharmacy, medical checkup, lab test)
   - Health Insurance (BPJS, asuransi kesehatan, health insurance premium)
   - Fitness (gym, fitness center, yoga class, pilates, olahraga, sports membership, personal trainer)
   - Personal Care (salon, potong rambut, haircut, barber, cukur, skincare, perawatan wajah, spa, massage, pijat, facial)
5. Entertainment & Shopping:
   - Clothing (baju, pakaian, kaos, t-shirt, celana, pants, jaket, jacket, sepatu, shoes, sandal, fashion, dress, rok, skirt)
   - Electronics & Gadgets (hp, handphone, smartphone, laptop, komputer, computer, tablet, gadget, elektronik, charger, headphone, earbuds, mouse, keyboard, kabel)
   - Subscriptions & Streaming (netflix, spotify, youtube premium, disney+, amazon prime, langganan, subscription, streaming service, apple music)
   - Hobbies & Leisure (game, gaming, video games, mainan, toys, hobi, hobby, collectibles, console, playstation, xbox, nintendo, steam)
   - Gifts & Celebration (hadiah, gift, kado, present, ulang tahun, birthday, perayaan, celebration, wedding gift, hampers, souvenir)
6. Financial Obligations:
   - Debt Payments (bayar hutang, bayar utang, pay debt, cicilan, installment, kredit, credit card payment, kartu kredit, pinjaman, loan payment, angsuran, mortgage payment, KPR, paylater)
   - Taxes & Fees (pajak, tax, PBB, STNK, pajak kendaraan, retribusi, bea, government fee, tax payment)
   - Bank Charges (biaya admin, admin fee, biaya bank, bank fee, transfer fee, monthly fee, ATM fee, biaya bulanan)
7. Family & Others:
   - Childcare (biaya anak, children expenses, daycare, pengasuhan, babysitter, nanny, penitipan anak)
   - Education (sekolah, school, kuliah, university, college, SPP, tuition, tuition fee, kursus, course, les, private lesson, buku, books, alat tulis, stationery, tas sekolah)
   - Pets (kucing, cat, anjing, dog, hewan peliharaan, pet, makanan kucing, cat food, makanan anjing, dog food, vet, dokter hewan, pet grooming)
   - Travel (travel, trip, liburan, vacation, holiday, tiket pesawat, flight ticket, tiket kereta, hotel, penginapan, accommodation, wisata, tour, tourist, jalan-jalan)
   - Business Expenses (bisnis, business, usaha, operasional, operational, kantor, office, office supplies, alat kantor, business meeting, client dinner)
   - Charity & Donations (donasi, donation, sedekah, amal, charity, zakat, infaq, wakaf, sumbangan, contribution)
   - Emergency (darurat, emergency, urgent expense, keperluan mendesak)
   - Others (lain-lain, miscellaneous, other expenses, tidak termasuk kategori lain)

Available income sources:
1. Salary (monthly salary, paycheck, wages, gaji bulanan)
2. Freelance (freelance work, consulting, gig work, kerja lepas)
3. Business (business income, sales, revenue, penghasilan bisnis, hasil jualan)
4. Bonus (performance bonus, commission, tips, komisi, bonus kinerja)
5. Gift (gifts, allowance, money received, hadiah, uang dari orang tua, kiriman)
6. Others (other income sources, miscellaneous income, pemasukan lainnya)

Your task is to identify and parse ALL transactions mentioned in the input. Look for multiple transactions separated by commas, "terus", "lalu", "kemudian", or other connecting words.

Return ONLY a valid JSON object with this exact structure:

{
  "transactions": [
    {
      "type": "expense|income|savings|transfer",
      "description": "cleaned and formatted description",
      "amount": number (extracted amount),
      "category": "exact category name from expense categories" (for expenses only),
      "source": "exact source name from income sources" (for income only),
      "goalName": "goal name if mentioned, otherwise null" (for savings only),
      "assetName": "asset name if mentioned, otherwise null" (for investments only),
       "walletName": "wallet name if mentioned (e.g., BCA, Gojek, Dana)",
       "walletType": "wallet type if mentioned (e.g., bank, e_wallet, cash)",
       "adminFee": number (admin fee for transfers, 0 if not mentioned),
      "confidence": number between 0 and 1
    }
  ]
}

Rules:
- Parse EACH transaction separately
- Income: money coming into your main account (salary, freelance, etc.)
- Expenses: money spent from your main account (purchases, bills, etc.)
- Savings: transferring money FROM main account TO savings account
- Transfer: moving money between wallets (e.g., "transfer dari BCA ke GoPay")
- Extract amounts as positive numbers (remove currency symbols)
- Choose the most appropriate category/source from the provided lists
- Clean up descriptions but keep them informative
- If any transaction is unclear, set confidence lower but still include it
- ALWAYS return valid JSON, nothing else

CRITICAL CATEGORY DISTINCTIONS:
- Bottled water purchases ("air minum", "aqua", "le minerale") → "Groceries", NOT "Water"
- Water utility bills ("bayar air PDAM", "tagihan air") → "Water"
- Vehicle fuel ("bensin", "bbm") → "Fuel", NOT "Vehicle Maintenance"
- Vehicle service ("service motor", "ganti oli") → "Vehicle Maintenance", NOT "Fuel"
- Electricity bills ("bayar listrik", "token PLN") → "Electricity"

IMPORTANT: Wallet-to-wallet transfers should be classified as "transfer", NOT "savings"

Multiple Transaction Examples:
Input: "hari ini aku beli kopi 50k, makan di warteg 10k, terus dapat gaji 1 juta"
Output: {
  "transactions": [
    {"type": "expense", "description": "Coffee purchase", "amount": 50000, "category": "Food & Groceries", "walletName": null, "walletType": null, "confidence": 0.9},
    {"type": "expense", "description": "Meal at warteg", "amount": 10000, "category": "Food & Groceries", "walletName": null, "walletType": null, "confidence": 0.9},
    {"type": "income", "description": "Salary received", "amount": 1000000, "source": "Salary", "walletName": null, "walletType": null, "confidence": 0.95}
  ]
}

Input: "bayar listrik 200rb, bensin 50rb, terus tabung 500rb"
Output: {
  "transactions": [
    {"type": "expense", "description": "Electricity bill payment", "amount": 200000, "category": "Electricity", "walletName": null, "walletType": null, "confidence": 0.95},
    {"type": "expense", "description": "Fuel purchase", "amount": 50000, "category": "Fuel", "walletName": null, "walletType": null, "confidence": 0.9},
    {"type": "savings", "description": "Transfer to savings", "amount": 500000, "goalName": null, "walletName": null, "walletType": null, "confidence": 0.9}
  ]
}

Input: "beli air minum 5rb, bayar air PDAM 100rb"
Output: {
  "transactions": [
    {"type": "expense", "description": "Bottled water purchase", "amount": 5000, "category": "Groceries", "walletName": null, "walletType": null, "confidence": 0.95},
    {"type": "expense", "description": "Water utility bill payment", "amount": 100000, "category": "Water", "walletName": null, "walletType": null, "confidence": 0.95}
  ]
}

Input: "makan nasgor 50k pake bca, naik gojek 10k pake gopay, beli jas ujan 20k pake bca"
Output: {
  "transactions": [
    {"type": "expense", "description": "Nasi goreng meal", "amount": 50000, "category": "Food & Groceries", "walletName": "BCA", "walletType": "bank", "confidence": 0.95},
    {"type": "expense", "description": "Gojek ride", "amount": 10000, "category": "Transportation", "walletName": "GoPay", "walletType": "e_wallet", "confidence": 0.95},
    {"type": "expense", "description": "Rain jacket purchase", "amount": 20000, "category": "Entertainment & Shopping", "walletName": "BCA", "walletType": "bank", "confidence": 0.95}
  ]
}

Input: "transfer dari bca ke gopay 5 juta"
Output: {
  "transactions": [
    {"type": "transfer", "description": "Transfer from BCA to GoPay", "amount": 5000000, "walletName": "BCA", "walletType": "bank", "adminFee": 0, "confidence": 0.95}
  ]
}

Input: "transfer dari bca ke gopay 5 juta dengan biaya admin 5rb"
Output: {
  "transactions": [
    {"type": "transfer", "description": "Transfer from BCA to GoPay", "amount": 5000000, "walletName": "BCA", "walletType": "bank", "adminFee": 5000, "confidence": 0.95}
  ]
}
`;

export class GroqAIService {
  // Try to parse JSON, tolerate leading/trailing prose by extracting first {...}
  private static tryParseJson<T = unknown>(text: string): T | null {
    try {
      return JSON.parse(text);
    } catch {}
    if (!text) return null;
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = text.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {}
    }
    return null;
  }
  // Try to coerce slightly-invalid AI output into our stricter ParsedTransaction
  private static coerceParsedTransaction(maybe: unknown): ParsedTransaction | null {
    if (!maybe || typeof maybe !== 'object') return null;
    const obj = maybe as Record<string, unknown>;
    const type = obj.type;
    const description = typeof obj.description === 'string' ? obj.description : '';
    const amount = typeof obj.amount === 'number' ? obj.amount : NaN;
    const confidence = typeof obj.confidence === 'number' ? obj.confidence : 0.5;
    if (!type || !description || !Number.isFinite(amount) || amount <= 0) return null;

    const walletName = typeof obj.walletName === 'string' ? obj.walletName : undefined;
    const walletType = typeof obj.walletType === 'string' ? obj.walletType : undefined;
    const adminFee = typeof obj.adminFee === 'number' ? obj.adminFee : undefined;

    if (type === 'expense') {
      let category = typeof obj.category === 'string' ? obj.category : undefined;
      const lower = (category || '').toLowerCase();
      const descLower = description.toLowerCase();
      // Expanded keyword-based normalization for Indonesian users
      const isDiningOut = /(makan|resto|restoran|warteg|warung|sushi|ayam|nasi goreng|nasgor|nasi padang|kopi|coffee|boba|cafe|bakso|baso|mie ayam|mie\b|soto|kuliner)/.test(descLower);
      const isBottledWater = /(air minum|aqua|le minerale|vit\b|air mineral|beli air|air botol|drinking water|bottled water)/.test(descLower);
      const isWaterBill = /(bayar air|tagihan air|air pdam|water bill|pdam)/.test(descLower);
      const isFurniture = /(perabot|furniture|mebel|kursi|chair|meja|table|lemari|wardrobe|kasur|bed|sofa|rak|shelf|kulkas|fridge|refrigerator|ac\b|air conditioner|kipas|fan|tv\b|television|mesin cuci|washing machine|kompor|stove|rice cooker|blender|setrika|iron)/.test(descLower);
      const isHouseholdSupplies = /(sabun|soap|detergen|detergent|cleaning|sapu|broom|pel|mop|tissue|lap|pembersih)/.test(descLower);
      const isGroceries = /(belanja( harian| bulanan)?|indomaret|alfamart|supermarket|minimarket|pasar|grocery|grocer)/.test(descLower) || isBottledWater;
      const isFuel = /(bensin|bbm|pertamax|pertalite|isi bensin|beli bensin)/.test(descLower);
      const isVehicleMaintenance = /(service motor|service mobil|oli|ban|cuci motor|cuci mobil|tune up|ganti oli|car service|motor service|mechanic|servis motor|servis mobil)/.test(descLower);
      const isParking = /(parkir)/.test(descLower);
      const isPublicTransport = /(bus|kereta|commuter|mrt|lrt|angkot)/.test(descLower);
      const isRideHailing = /(gojek|grab|ojol)/.test(descLower);
      const isToll = /(\bto(l|ll)\b|e-?toll|etoll)/.test(descLower);
      const isMedical = /(dokter|doctor|obat|medicine|apotek|pharmacy|klinik|clinic|rumah sakit|hospital|medical|farmasi|checkup|lab test)/.test(descLower);
      const isHealthInsurance = /(bpjs|asuransi kesehatan|health insurance)/.test(descLower);
      const isFitness = /(gym|fitness|yoga|pilates|olahraga|sports membership|personal trainer)/.test(descLower);
      const isPersonalCare = /(salon|potong rambut|haircut|barber|cukur|skincare|perawatan|spa|massage|pijat|facial)/.test(descLower);
      const isClothing = /(baju|pakaian|kaos|t-shirt|celana|pants|jaket|jacket|sepatu|shoes|sandal|fashion|dress|rok|skirt)/.test(descLower);
      const isElectronics = /(hp|handphone|smartphone|laptop|komputer|computer|tablet|gadget|elektronik|electronics|charger|headphone|earbuds|mouse|keyboard|kabel)/.test(descLower);
      const isSubscriptions = /(netflix|spotify|youtube premium|disney|amazon prime|langganan|subscription|streaming|apple music)/.test(descLower);
      const isHobbies = /(game|gaming|video games|gim|mainan|toys|hobi|hobby|collectibles|console|playstation|xbox|nintendo|steam)/.test(descLower);
      const isGifts = /(hadiah|gift|kado|present|ultah|ulang tahun|birthday|perayaan|celebration|wedding gift|hampers|souvenir)/.test(descLower);
      const isDebt = /(bayar (hutang|utang)|hutang|utang|cicilan|installment|kredit|credit card|kartu kredit|pinjaman|loan|debt|angsuran|kpr|paylater)/.test(descLower);
      const isTaxesFees = /(pajak|tax|bea|retribusi|pbb|stnk|pajak kendaraan|government fee)/.test(descLower);
      const isBankCharges = /(biaya admin|admin fee|biaya bank|bank fee|fee bank|admin bank|transfer fee|monthly fee|atm fee|biaya bulanan)/.test(descLower);
      const isChildcare = /(biaya anak|children|daycare|pengasuhan|babysitter|nanny|penitipan anak)/.test(descLower);
      const isEducation = /(sekolah|school|kuliah|university|college|spp|tuition|pendidikan|kursus|course|kelas|les|lesson|buku|books|alat tulis|stationery|tas sekolah)/.test(descLower);
      const isPets = /(kucing|cat|anjing|dog|hewan peliharaan|pet|makanan kucing|cat food|makanan anjing|dog food|vet|dokter hewan|grooming)/.test(descLower);
      const isTravel = /(travel|trip|liburan|vacation|holiday|tiket pesawat|flight|tiket kereta|hotel|penginapan|accommodation|wisata|tour|tourist|jalan-jalan)/.test(descLower);
      const isBusiness = /(bisnis|business|usaha|operasional|operational|kantor|office|alat kantor|office supplies|meeting|client)/.test(descLower);
      const isCharity = /(donasi|donation|sedekah|amal|charity|zakat|infaq|wakaf|sumbangan|contribution)/.test(descLower);
      const isEmergency = /(darurat|emergency|urgent|mendesak)/.test(descLower);

      // CRITICAL: Override "Water" if it's actually bottled water purchase
      if (lower === 'water' && isBottledWater) {
        category = 'Groceries';
      }
      // If AI returned a generic/foreign label, normalize using description cues
      if (!category || lower === 'others' || lower === 'food & groceries' || lower === 'food & dining' || lower === 'makanan' || lower === 'minuman' || lower === 'kuliner') {
        if (isDiningOut) category = 'Dining Out';
        else if (isGroceries) category = 'Groceries';
      }
      // Housing items
      if (!category || lower === 'housing & utilities' || lower === 'rumah' || lower === 'home') {
        if (isFurniture) category = 'Home Maintenance';
        else if (isHouseholdSupplies) category = 'Household Supplies';
      }
      if (!category) {
        // Housing & Utilities
        if (isFurniture) category = 'Home Maintenance';
        else if (isHouseholdSupplies) category = 'Household Supplies';
        // Transportation
        else if (isFuel) category = 'Fuel';
        else if (isVehicleMaintenance) category = 'Vehicle Maintenance';
        else if (isParking) category = 'Parking';
        else if (isPublicTransport) category = 'Public Transport';
        else if (isRideHailing) category = 'Ride Hailing';
        else if (isToll) category = 'Toll';
        // Health & Personal
        else if (isHealthInsurance) category = 'Health Insurance';
        else if (isMedical) category = 'Medical & Pharmacy';
        else if (isFitness) category = 'Fitness';
        else if (isPersonalCare) category = 'Personal Care';
        // Entertainment & Shopping
        else if (isClothing) category = 'Clothing';
        else if (isElectronics) category = 'Electronics & Gadgets';
        else if (isSubscriptions) category = 'Subscriptions & Streaming';
        else if (isHobbies) category = 'Hobbies & Leisure';
        else if (isGifts) category = 'Gifts & Celebration';
        // Financial Obligations
        else if (isDebt) category = 'Debt Payments';
        else if (isTaxesFees) category = 'Taxes & Fees';
        else if (isBankCharges) category = 'Bank Charges';
        // Family & Others
        else if (isChildcare) category = 'Childcare';
        else if (isEducation) category = 'Education';
        else if (isPets) category = 'Pets';
        else if (isTravel) category = 'Travel';
        else if (isBusiness) category = 'Business Expenses';
        else if (isCharity) category = 'Charity & Donations';
        else if (isEmergency) category = 'Emergency';
      }
      // Generic buckets mapped using description cues when AI returns broad labels
      if ((lower === 'food & dining' || lower === 'makanan' || lower === 'minuman' || lower === 'kuliner') && isDiningOut) category = 'Dining Out';
      if ((lower === 'food & groceries' || lower === 'belanja' || lower === 'belanja harian') && !isDiningOut && isGroceries) category = 'Groceries';
      if (lower === 'transportation' || lower === 'transportasi') category = 'Fuel';
      if (lower === 'health & personal' || lower === 'kesehatan' || lower === 'personal') category = 'Medical & Pharmacy';
      if (lower === 'entertainment & shopping' || lower === 'hiburan' || lower === 'belanja') {
        if (!category) category = isClothing ? 'Clothing' : isElectronics ? 'Electronics & Gadgets' : isSubscriptions ? 'Subscriptions & Streaming' : isGifts ? 'Gifts & Celebration' : isHobbies ? 'Hobbies & Leisure' : undefined;
      }
      if (lower === 'debt payments' || lower === 'hutang' || lower === 'utang' || lower === 'pinjaman' || lower === 'cicilan') category = 'Debt Payments';
      if (lower === 'taxes & fees' || lower === 'pajak' || lower === 'biaya') category = 'Taxes & Fees';
      if (lower === 'bank charges' || lower === 'biaya admin' || lower === 'admin bank') category = 'Bank Charges';
      if (lower === 'family & others' || lower === 'keluarga' || lower === 'lainnya' || lower === 'others') {
        if (isChildcare) category = 'Childcare';
        else if (isEducation) category = 'Education';
        else if (isPets) category = 'Pets';
        else if (isCharity) category = 'Charity & Donations';
        else if (!category) category = 'Others';
      }
      if (lower === 'business expenses' || lower === 'bisnis' || lower === 'usaha' || lower === 'operasional') category = 'Business Expenses';
      if (lower === 'travel' || lower === 'perjalanan' || lower === 'wisata') category = 'Travel';

      if (category && EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
        return { type: 'expense', description, amount, category: category as ExpenseCategory, walletName, walletType, adminFee, confidence };
      }
      // Final fallback: if category is still invalid, use description cues before defaulting to Others
      // Housing & Utilities
      if (isFurniture) return { type: 'expense', description, amount, category: 'Home Maintenance', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isHouseholdSupplies) return { type: 'expense', description, amount, category: 'Household Supplies', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      // Food & Groceries
      if (isDiningOut) return { type: 'expense', description, amount, category: 'Dining Out', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isGroceries) return { type: 'expense', description, amount, category: 'Groceries', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      // Transportation
      if (isFuel) return { type: 'expense', description, amount, category: 'Fuel', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isVehicleMaintenance) return { type: 'expense', description, amount, category: 'Vehicle Maintenance', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isParking) return { type: 'expense', description, amount, category: 'Parking', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isPublicTransport) return { type: 'expense', description, amount, category: 'Public Transport', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isRideHailing) return { type: 'expense', description, amount, category: 'Ride Hailing', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isToll) return { type: 'expense', description, amount, category: 'Toll', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      // Health & Personal
      if (isHealthInsurance) return { type: 'expense', description, amount, category: 'Health Insurance', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isMedical) return { type: 'expense', description, amount, category: 'Medical & Pharmacy', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isFitness) return { type: 'expense', description, amount, category: 'Fitness', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isPersonalCare) return { type: 'expense', description, amount, category: 'Personal Care', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      // Entertainment & Shopping
      if (isClothing) return { type: 'expense', description, amount, category: 'Clothing', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isElectronics) return { type: 'expense', description, amount, category: 'Electronics & Gadgets', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isSubscriptions) return { type: 'expense', description, amount, category: 'Subscriptions & Streaming', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isHobbies) return { type: 'expense', description, amount, category: 'Hobbies & Leisure', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isGifts) return { type: 'expense', description, amount, category: 'Gifts & Celebration', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      // Financial Obligations
      if (isDebt) return { type: 'expense', description, amount, category: 'Debt Payments', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isTaxesFees) return { type: 'expense', description, amount, category: 'Taxes & Fees', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isBankCharges) return { type: 'expense', description, amount, category: 'Bank Charges', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      // Family & Others
      if (isChildcare) return { type: 'expense', description, amount, category: 'Childcare', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isEducation) return { type: 'expense', description, amount, category: 'Education', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isPets) return { type: 'expense', description, amount, category: 'Pets', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isTravel) return { type: 'expense', description, amount, category: 'Travel', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isBusiness) return { type: 'expense', description, amount, category: 'Business Expenses', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isCharity) return { type: 'expense', description, amount, category: 'Charity & Donations', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      if (isEmergency) return { type: 'expense', description, amount, category: 'Emergency', walletName, walletType, adminFee, confidence } as ParsedTransaction;
      return { type: 'expense', description, amount, category: 'Others', walletName, walletType, adminFee, confidence } as ParsedTransaction;
    }
    if (type === 'income') {
      const source = typeof obj.source === 'string' ? obj.source : 'Others';
      return { type: 'income', description, amount, source, walletName, walletType, confidence } as ParsedTransaction;
    }
    if (type === 'savings') {
      return { type: 'savings', description, amount, goalName: obj.goalName ?? null, walletName, walletType, confidence } as ParsedTransaction;
    }
    if (type === 'transfer') {
      return { type: 'transfer', description, amount, walletName, walletType, adminFee, confidence } as ParsedTransaction;
    }
    return null;
  }
  // Unified decision: intent + optional parsed transactions in one go
  static async decideAndParse(userInput: string, userId?: number): Promise<{
    intent: 'transaction' | 'multiple_transaction' | 'data_analysis' | 'general_chat',
    transactions?: ParsedTransaction[]
  }> {
    // Build wallet context to improve walletName selection
    let walletContext = '';
    if (userId) {
      try {
        const { UserWalletDatabase } = await import('./database');
        const wallets = await UserWalletDatabase.getAllWallets(userId);
        if (wallets && wallets.length > 0) {
          const list = wallets.map(w => `- ${w.name} (${w.type})`).join('\n');
          walletContext = `\nAvailable wallets for this user:\n${list}\n`;
        }
      } catch {}
    }

    const DECIDE_PROMPT = `
BAHASA: Utamakan Bahasa Indonesia untuk memahami dan menghasilkan output. Tetap pahami Bahasa Inggris bila pengguna memakainya.
You are an AI for a finance app. Decide the user's intent and, if applicable, parse transactions.

Intent values:
- transaction: single financial transaction
- multiple_transaction: multiple transactions in one message
- data_analysis: user asks about their data/summary/insights
- general_chat: normal chat/questions about the app

${walletContext}

If intent is transaction or multiple_transaction, parse using the SAME schema as before (types: expense|income|savings|transfer). Apply STRICT WALLET RULES and Indonesian cues (pake/pakai/dari/ke/via). Normalize aliases (e.g., gojek->GoPay, shopee pay->ShopeePay, cash/tunai).

Return ONLY JSON in this structure:
{
  "intent": "transaction|multiple_transaction|data_analysis|general_chat",
  "transactions": [
    {
      "type": "expense|income|savings|transfer",
      "description": "...",
      "amount": number,
      "category": "..." (for expense),
      "source": "..." (for income),
      "goalName": "..." or null (for savings),
      "assetName": "..." or null (for investments),
      "walletName": "..." or null,
      "walletType": "bank|e_wallet|cash" or null,
      "adminFee": number (for transfer, default 0),
      "confidence": number 0..1
    }
  ]
}`;

    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: DECIDE_PROMPT },
          { role: 'user', content: userInput }
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
        max_completion_tokens: 400,
        top_p: 0.9,
        stream: false,
        stop: null
      });

      const response = chatCompletion.choices[0]?.message?.content;
      // Debug: show raw AI response for decideAndParse
      try { console.log('AI decideAndParse raw response:', response); } catch {}
      if (!response) throw new Error('No response from AI');
      const parsed = JSON.parse(response.trim());

      // Validate intent
      const intent = parsed.intent as 'transaction' | 'multiple_transaction' | 'data_analysis' | 'general_chat';
      if (!intent) throw new Error('Missing intent');

      // Validate transactions if present
      let transactions: ParsedTransaction[] | undefined = undefined;
      if (Array.isArray(parsed.transactions)) {
        const valid = parsed.transactions
          .map((t: unknown) => (this.isValidParsedTransaction(t) ? t : this.coerceParsedTransaction(t)))
          .filter(Boolean);
        transactions = valid as ParsedTransaction[];
      }
      return { intent, transactions };
    } catch (error) {
      // Fallback to existing pipeline
      const intent = await this.analyzeMessageIntent(userInput, userId);
      return { intent };
    }
  }
  // Parse multiple transactions from natural language
  static async parseMultipleTransactions(userInput: string, userId?: number): Promise<ParsedMultipleTransactions> {
    try {
      // Optionally include user's wallets to help the model pick walletName for each transaction
      let walletContext = '';
      if (userId) {
        try {
          const { UserWalletDatabase } = await import('./database');
          const wallets = await UserWalletDatabase.getAllWallets(userId);
          if (wallets && wallets.length > 0) {
            const list = wallets.map(w => `- ${w.name} (${w.type})`).join('\n');
            walletContext = `\nAvailable wallets for this user:\n${list}\n\nRULE: If a transaction contains wallet cues (pake/pakai/dari/ke/via) and any of the names above (or their aliases), you MUST set walletName to the closest match and walletType accordingly for that transaction.`;
          }
        } catch {}
      }
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: MULTIPLE_TRANSACTION_PARSING_PROMPT + walletContext
          },
          {
            role: "user",
            content: userInput
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1, // Low temperature for consistent parsing
        max_completion_tokens: 500, // Reduced for faster response
        top_p: 0.9,
        stream: false,
        stop: null
      });

      const response = chatCompletion.choices[0]?.message?.content;
      // Debug: show raw AI response for single transaction parsing
      try { console.log('AI parseTransaction raw response:', response); } catch {}
      
      if (!response) {
        throw new Error('No response from AI');
      }

      // Parse the JSON response
      console.log('Multiple transaction parsing response:', response);
      const parsedData = this.tryParseJson<{ transactions: unknown[] }>(response.trim());
      if (!parsedData || !Array.isArray(parsedData.transactions)) {
        throw new Error('AI did not return valid JSON for multiple transactions');
      }
      
      console.log('Parsed multiple transactions:', parsedData);
      
      // Validate each transaction
      const validTransactions = parsedData.transactions
        .map(t => (this.isValidParsedTransaction(t) ? t : this.coerceParsedTransaction(t)))
        .filter(Boolean) as ParsedTransaction[];

      return {
        transactions: validTransactions,
        totalTransactions: parsedData.transactions.length,
        successCount: validTransactions.length,
        failedCount: parsedData.transactions.length - validTransactions.length
      };

    } catch (error) {
      console.error('Error parsing multiple transactions with Groq AI:', error);
      
      // Fallback: try to parse as single transaction
      try {
        const singleTransaction = await this.parseTransaction(userInput);
        return {
          transactions: [singleTransaction],
          totalTransactions: 1,
          successCount: 1,
          failedCount: 0
        };
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        return {
          transactions: [],
          totalTransactions: 0,
          successCount: 0,
          failedCount: 0
        };
      }
    }
  }

  // Parse transaction (income, expense, or savings) from natural language
  static async parseTransaction(userInput: string, userId?: number): Promise<ParsedTransaction> {
    try {
      // Optionally include user's wallets to help the model pick walletName
      let walletContext = '';
      if (userId) {
        try {
          const { UserWalletDatabase } = await import('./database');
          const wallets = await UserWalletDatabase.getAllWallets(userId);
          if (wallets && wallets.length > 0) {
            const list = wallets.map(w => `- ${w.name} (${w.type})`).join('\n');
            walletContext = `\nAvailable wallets for this user:\n${list}\n\nRULE: If message contains wallet cues (pake/pakai/dari/ke/via) and any of the names above (or their aliases), you MUST set walletName to the closest match and walletType accordingly.`;
          }
        } catch {}
      }

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: TRANSACTION_PARSING_PROMPT + walletContext
          },
          {
            role: "user",
            content: userInput
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1, // Low temperature for consistent parsing
        max_completion_tokens: 200, // Slightly higher to reduce truncation
        top_p: 0.9,
        stream: false,
        stop: null
      });

      const response = chatCompletion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response from AI');
      }

      // Parse the JSON response
      const candidate = this.tryParseJson(response.trim());
      // Validate or coerce the parsed transaction
      if (this.isValidParsedTransaction(candidate)) {
        return candidate as ParsedTransaction;
      }
      const coerced = this.coerceParsedTransaction(candidate);
      if (coerced) return coerced;
      throw new Error('Invalid transaction format from AI');

    } catch (error) {
      console.error('Error parsing transaction with Groq AI:', error);
      
      // Fallback parsing if AI fails
      return this.fallbackParseTransaction(userInput);
    }
  }

  // Legacy method for backward compatibility
  static async parseExpense(userInput: string): Promise<ParsedExpense> {
    const transaction = await this.parseTransaction(userInput);
    if (transaction.type === 'expense') {
      return {
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category!,
        confidence: transaction.confidence
      };
    } else {
      // If detected as income, return as miscellaneous expense with low confidence
      return {
        description: transaction.description,
        amount: transaction.amount,
        category: 'Others',
        confidence: 0.1
      };
    }
  }

  // Validate parsed transaction data
  private static isValidParsedTransaction(transaction: unknown): transaction is ParsedTransaction {
    if (!transaction || typeof transaction !== 'object') return false;
    const obj = transaction as Record<string, unknown>;
    const hasValidType = obj.type === 'income' || obj.type === 'expense' || obj.type === 'savings' || obj.type === 'transfer';
    const hasValidBasics = (
      typeof obj.description === 'string' &&
      typeof obj.amount === 'number' &&
      typeof obj.confidence === 'number' &&
      obj.amount > 0 &&
      obj.confidence >= 0 && obj.confidence <= 1
    );

    if (!hasValidType || !hasValidBasics) return false;

    if (obj.type === 'expense') {
      return (
        typeof obj.category === 'string' &&
        EXPENSE_CATEGORIES.includes(obj.category as ExpenseCategory)
      );
    }

    if (obj.type === 'income') {
      return (
        typeof obj.source === 'string' &&
        INCOME_SOURCES.includes(obj.source as IncomeSource)
      );
    }

    if (obj.type === 'savings') {
      return (
        obj.goalName === null || typeof obj.goalName === 'string'
      );
    }

    if (obj.type === 'transfer') {
      return (
        (obj.walletName === null || typeof obj.walletName === 'string') &&
        (obj.walletType === null || typeof obj.walletType === 'string') &&
        (obj.adminFee === undefined || (typeof obj.adminFee === 'number' && obj.adminFee >= 0))
      );
    }

    return false;
  }

  // Validate parsed expense data (legacy)
  private static isValidParsedExpense(expense: unknown): expense is ParsedExpense {
    if (!expense || typeof expense !== 'object') return false;
    const obj = expense as Record<string, unknown>;
    return (
      typeof obj.description === 'string' &&
      typeof obj.amount === 'number' &&
      typeof obj.category === 'string' &&
      typeof obj.confidence === 'number' &&
      obj.amount > 0 &&
      obj.confidence >= 0 && obj.confidence <= 1 &&
      EXPENSE_CATEGORIES.includes(obj.category as ExpenseCategory)
    );
  }

  // Fallback parsing method for transactions
  private static fallbackParseTransaction(userInput: string): ParsedTransaction {
    // First determine if it's income or expense
    const incomeKeywords = ['gaji', 'salary', 'bonus', 'dapat', 'terima', 'income', 'freelance', 'bisnis', 'dividen', 'hadiah'];
    const lowerInput = userInput.toLowerCase();
    
    const isIncome = incomeKeywords.some(keyword => lowerInput.includes(keyword));
    
    if (isIncome) {
      return this.fallbackParseIncome(userInput);
    } else {
      const expense = this.fallbackParseExpense(userInput);
      return {
        type: 'expense',
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        confidence: expense.confidence
      };
    }
  }

  // Fallback parsing method for income
  private static fallbackParseIncome(userInput: string): ParsedTransaction {
    // Extract amount using regex (supports various formats)
    const amountRegex = /(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:rb|ribu|k|juta|jt)?/i;
    const amountMatch = userInput.match(amountRegex);
    
    let amount = 0;
    if (amountMatch) {
      const amountStr = amountMatch[1].replace(/[.,]/g, '');
      amount = parseInt(amountStr);
      
      // Handle multipliers
      if (userInput.toLowerCase().includes('juta') || userInput.toLowerCase().includes('jt')) {
        amount *= 1000000;
      } else if (userInput.toLowerCase().includes('rb') || userInput.toLowerCase().includes('ribu')) {
        amount *= 1000;
      } else if (userInput.toLowerCase().includes('k')) {
        amount *= 1000;
      }
    }

    // Simple source detection based on keywords
    const sourceKeywords = {
      'Salary': ['gaji', 'salary', 'paycheck', 'wages'],
      'Freelance': ['freelance', 'consulting', 'gig'],
      'Business': ['bisnis', 'business', 'sales', 'revenue'],
      'Bonus': ['bonus', 'commission', 'tips'],
      'Gift': ['hadiah', 'gift', 'allowance', 'dapat', 'terima'],
      'Others': []
    };

    let detectedSource: IncomeSource = 'Others';
    let confidence = 0.3;

    const lowerInput = userInput.toLowerCase();
    for (const [source, keywords] of Object.entries(sourceKeywords)) {
      for (const keyword of keywords) {
        if (lowerInput.includes(keyword)) {
          detectedSource = source as IncomeSource;
          confidence = 0.7;
          break;
        }
      }
      if (confidence > 0.3) break;
    }

    return {
      type: 'income',
      description: userInput.trim(),
      amount: amount || 0,
      source: detectedSource,
      confidence: amount > 0 ? confidence : 0.2
    };
  }

  // Fallback parsing method for expenses (legacy)
  private static fallbackParseExpense(userInput: string): ParsedExpense {
    // Extract amount using regex (supports various formats)
    const amountRegex = /(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:rb|ribu|k)?/i;
    const amountMatch = userInput.match(amountRegex);
    
    let amount = 0;
    if (amountMatch) {
      const amountStr = amountMatch[1].replace(/[.,]/g, '');
      amount = parseInt(amountStr);
      
      // Handle "rb", "ribu", "k" multipliers
      if (userInput.toLowerCase().includes('rb') || userInput.toLowerCase().includes('ribu')) {
        amount *= 1000;
      } else if (userInput.toLowerCase().includes('k')) {
        amount *= 1000;
      }
    }

    // Simple category detection based on keywords (mapped to specific categories)
    const categoryKeywords: Record<string, string[]> = {
      // Housing & Utilities
      'Electricity': ['listrik', 'pln', 'token'],
      'Water': ['air', 'pdam'],
      'Internet': ['internet', 'wifi'],
      'Rent': ['sewa', 'kontrakan', 'kos', 'kost', 'apartemen'],
      'Gas Utility': ['gas rumah', 'elpiji', 'elpiji', 'elpiji 3kg'],
      'Home Maintenance': ['tukang', 'service rumah', 'perbaikan', 'maintenance rumah'],
      'Household Supplies': ['sabun', 'detergen', 'alat kebersihan', 'household'],

      // Food & Dining
      'Groceries': ['belanja', 'indomaret', 'alfamart', 'supermarket', 'minimarket', 'pasar'],
      'Dining Out': ['makan', 'resto', 'warteg', 'rumah makan', 'nasgor', 'padang'],
      'Coffee & Tea': ['kopi', 'coffee', 'tea', 'boba'],
      'Food Delivery': ['gofood', 'grabfood', 'shopeefood', 'foodpanda'],

      // Transportation
      'Fuel': ['bensin', 'bbm', 'pertalite', 'pertamax'],
      'Parking': ['parkir'],
      'Public Transport': ['bus', 'kereta', 'commuter', 'mrt', 'lrt'],
      'Ride Hailing': ['gojek', 'grab', 'ojol'],
      'Vehicle Maintenance': ['service motor', 'service mobil', 'oli', 'ban'],
      'Toll': ['tol', 'etoll', 'e-toll'],

      // Health & Personal
      'Medical & Pharmacy': ['dokter', 'obat', 'apotek', 'klinik', 'rumah sakit'],
      'Health Insurance': ['asuransi kesehatan', 'bpjs'],
      'Fitness': ['gym', 'fitness', 'yoga'],
      'Personal Care': ['salon', 'potong rambut', 'barber', 'skincare'],

      // Entertainment & Shopping
      'Clothing': ['baju', 'pakaian', 'kaos', 'jaket', 'sepatu'],
      'Electronics & Gadgets': ['hp', 'laptop', 'gadget', 'elektronik'],
      'Subscriptions & Streaming': ['netflix', 'spotify', 'youtube premium', 'langganan'],
      'Hobbies & Leisure': ['game', 'mainan', 'hobi'],
      'Gifts & Celebration': ['hadiah', 'kado', 'ultah', 'perayaan'],

      // Financial Obligations
      'Debt Payments': ['bayar hutang', 'cicilan', 'kredit', 'kartu kredit', 'pinjaman', 'loan', 'debt'],
      'Taxes & Fees': ['pajak', 'bea', 'retribusi'],
      'Bank Charges': ['biaya admin', 'biaya bank', 'fee bank', 'admin bank'],

      // Family & Education
      'Childcare': ['anak', 'daycare', 'sekolah'],
      'Education': ['kursus', 'kelas', 'pendidikan', 'kuliah', 'buku'],
      'Pets': ['kucing', 'anjing', 'hewan peliharaan', 'makanan kucing', 'makanan anjing'],

      // Misc
      'Travel': ['travel', 'tiket', 'hotel', 'penginapan', 'wisata'],
      'Business Expenses': ['bisnis', 'usaha', 'operasional'],
      'Charity & Donations': ['donasi', 'sedekah', 'amal', 'zakat'],
      'Emergency': ['darurat', 'emergency'],
      'Others': []
    };

    let detectedCategory: ExpenseCategory = 'Others';
    let confidence = 0.3;

    const lowerInput = userInput.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerInput.includes(keyword)) {
          detectedCategory = category as ExpenseCategory;
          confidence = 0.7;
          break;
        }
      }
      if (confidence > 0.3) break;
    }

    return {
      description: userInput.trim(),
      amount: amount || 0,
      category: detectedCategory,
      confidence: amount > 0 ? confidence : 0.2
    };
  }

  // Check if input is likely a transaction (income or expense)
  static isTransactionMessage(message: string): boolean {
    const transactionKeywords = [
      // Expense keywords
      'beli', 'bayar', 'buat', 'spend', 'spent', 'purchase', 'bought', 'buy',
      'kopi', 'makan', 'bensin', 'listrik', 'air', 'sewa', 'cicilan',
      // Income keywords  
      'gaji', 'salary', 'bonus', 'dapat', 'terima', 'income', 'freelance', 'bisnis',
      // Amount indicators
      'rp', 'rupiah', '000', 'ribu', 'rb', 'juta', 'jt', 'k'
    ];
    
    const lowerMessage = message.toLowerCase();
    return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Check if input likely contains multiple transactions
  static isMultipleTransactionMessage(message: string): boolean {
    const multipleTransactionIndicators = [
      ',', 'terus', 'lalu', 'kemudian', 'dan', 'plus', 'juga', 'sama',
      'selanjutnya', 'setelah itu', 'abis itu'
    ];
    
    const lowerMessage = message.toLowerCase();
    const hasMultipleIndicators = multipleTransactionIndicators.some(indicator => 
      lowerMessage.includes(indicator)
    );
    
    // Also check if there are multiple amounts mentioned
    const amountPattern = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:rb|ribu|k|juta|jt)?/gi;
    const amountMatches = message.match(amountPattern);
    const hasMultipleAmounts = amountMatches ? amountMatches.length > 1 : false;
    
    return hasMultipleIndicators || hasMultipleAmounts;
  }

  // Detect time period from user message
  static detectTimePeriod(message: string): 'today' | 'weekly' | 'monthly' | 'all' {
    const lowerMessage = message.toLowerCase();
    
    // Today keywords
    const todayKeywords = ['hari ini', 'today', 'sekarang', 'pagi ini', 'siang ini', 'malam ini'];
    if (todayKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'today';
    }
    
    // Weekly keywords
    const weeklyKeywords = ['minggu ini', 'this week', 'seminggu', '7 hari', 'satu minggu', 'pekan ini'];
    if (weeklyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'weekly';
    }
    
    // Monthly keywords
    const monthlyKeywords = ['bulan ini', 'this month', 'sebulan', '30 hari', 'satu bulan'];
    if (monthlyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'monthly';
    }
    
    // Default to all data if no specific time period mentioned
    return 'all';
  }

  // Enhanced intent detection with confidence scoring
  static async analyzeMessageIntent(message: string, userId?: number): Promise<'transaction' | 'multiple_transaction' | 'data_analysis' | 'general_chat'> {
    try {
      let walletContext = '';
      if (userId) {
        try {
          const { UserWalletDatabase } = await import('./database');
          const wallets = await UserWalletDatabase.getAllWallets(userId);
          if (wallets && wallets.length > 0) {
            const list = wallets.map(w => w.name).join(', ');
            walletContext = `\nUser Wallets: ${list}`;
          }
        } catch {}
      }

      const intentPrompt = `
BAHASA: Utamakan Bahasa Indonesia untuk memahami dan menghasilkan output. Tetap pahami Bahasa Inggris bila pengguna memakainya.
You are an AI intent classifier for a financial assistant. Analyze the user's message and determine the most appropriate response type.

Response types:
1. "transaction" - User wants to record a single financial transaction (income, expense, savings)
2. "multiple_transaction" - User wants to record multiple transactions in one message
3. "data_analysis" - User is asking questions about their financial data, wants analysis, or wants to see their financial information
4. "general_chat" - General conversation, questions about the app, or unclear intent

STRICT CLASSIFICATION RULES:
- TRANSACTION: Contains amount + action (beli, bayar, gaji, tabung, makan) + no analysis keywords + no multiple indicators
- MULTIPLE_TRANSACTION: Contains multiple amounts OR multiple actions OR connecting words (terus, lalu, kemudian, dan) OR comma-separated items
- DATA_ANALYSIS: Contains analysis keywords (berapa, analisis, breakdown, ringkasan, tampilkan, lihat, cek, total, rata-rata, terbesar, terkecil, pola, trend, perbandingan, statistik, laporan, report, kategori, category, spending, budget, pengeluaran, pemasukan, tabungan, investasi, belanja, bulan ini, minggu ini, hari ini, sebulan, seminggu, sekarang, pagi ini, siang ini, malam ini) OR time period keywords
- GENERAL_CHAT: Greetings, app questions, unclear intent, or no financial context

IMPORTANT: Single action + amount + wallet mention (like "makan nasi padang 50k pake BCA") should be classified as "transaction", NOT "multiple_transaction"

EXAMPLES:
- "Beli kopi 25rb" → transaction (amount + action)
- "Gajian 5 juta" → transaction (amount + income action)
- "Tabung 1 juta" → transaction (amount + savings action)
- "Makan nasi padang 50k pake BCA" → transaction (amount + action + wallet mention)
- "Beli kopi 25rb pakai Gojek" → transaction (amount + action + wallet mention)
- "Hari ini aku beli kopi 50k, makan di warteg 10k, terus dapat gaji 1 juta" → multiple_transaction (multiple amounts + connecting words)
- "Bayar listrik 200rb, bensin 50rb, terus tabung 500rb" → multiple_transaction (multiple amounts + connecting words)
- "Berapa total pengeluaran bulan ini?" → data_analysis (analysis keyword + time period)
- "Analisis pengeluaran hari ini" → data_analysis (analysis keyword + time period)
- "Breakdown minggu ini" → data_analysis (analysis keyword + time period)
- "Ringkasan bulanan" → data_analysis (analysis keyword + time period)
- "Tampilkan ringkasan keuangan saya" → data_analysis (analysis keyword)
- "Berapa pengeluaran terbesar?" → data_analysis (analysis keyword)
- "Pola spending saya" → data_analysis (analysis keyword)
- "Bagaimana cara menggunakan aplikasi ini?" → general_chat (app question)
- "Hello" → general_chat (greeting)
- "Terima kasih" → general_chat (gratitude)
- "Apa kabar?" → general_chat (greeting)

IMPORTANT: If message contains BOTH transaction elements AND analysis keywords, prioritize analysis keywords and classify as data_analysis.

Return ONLY one of these exact words: transaction, multiple_transaction, data_analysis, general_chat
      `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: intentPrompt + walletContext
          },
          {
            role: "user",
            content: message
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1, // Low temperature for consistent classification
        max_completion_tokens: 5, // Reduced for faster response
        top_p: 0.9,
        stream: false,
        stop: null
      });

      const response = chatCompletion.choices[0]?.message?.content?.trim().toLowerCase();
      
      // Validate response
      if (response === 'transaction' || response === 'multiple_transaction' || 
          response === 'data_analysis' || response === 'general_chat') {
        return response as 'transaction' | 'multiple_transaction' | 'data_analysis' | 'general_chat';
      }
      
      // Fallback to enhanced keyword-based detection if AI response is invalid
      console.log('AI intent detection failed, using fallback detection');
      return this.enhancedFallbackIntentDetection(message);
      
    } catch (error) {
      console.error('Error analyzing message intent:', error);
      // Fallback to enhanced keyword-based detection
      return this.enhancedFallbackIntentDetection(message);
    }
  }

  // Enhanced fallback intent detection with confidence scoring
  private static enhancedFallbackIntentDetection(message: string): 'transaction' | 'multiple_transaction' | 'data_analysis' | 'general_chat' {
    const lowerMessage = message.toLowerCase();
    
    // Calculate confidence scores for each intent type
    const scores = {
      transaction: 0,
      multiple_transaction: 0,
      data_analysis: 0,
      general_chat: 0
    };
    
    // Multiple transaction detection with scoring
    const multipleIndicators = [',', 'terus', 'lalu', 'kemudian', 'dan', 'plus', 'juga', 'sama', 'selanjutnya', 'setelah itu', 'abis itu', 'dan juga', 'serta'];
    const multipleIndicatorCount = multipleIndicators.filter(indicator => lowerMessage.includes(indicator)).length;
    scores.multiple_transaction += multipleIndicatorCount * 2;
    
    // Amount pattern detection
    const amountPattern = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:rb|ribu|k|juta|jt|ribu|thousand|million)?/gi;
    const amountMatches = message.match(amountPattern);
    const amountCount = amountMatches ? amountMatches.length : 0;
    
    if (amountCount > 1) {
      scores.multiple_transaction += 5;
    } else if (amountCount === 1) {
      scores.transaction += 3;
    }
    
    // Action word detection
    const actionWords = ['beli', 'bayar', 'gaji', 'tabung', 'invest', 'makan', 'bensin', 'listrik', 'air', 'sewa', 'cicilan'];
    const actionCount = actionWords.filter(action => lowerMessage.includes(action)).length;
    
    if (actionCount > 1) {
      scores.multiple_transaction += 3;
    } else if (actionCount === 1) {
      scores.transaction += 2;
    }
    
    // Data analysis keywords with weighted scoring
    const highPriorityAnalysisKeywords = [
      'berapa', 'how much', 'how many', 'analisis', 'analysis', 'ringkasan', 'summary',
      'breakdown', 'kategori', 'category', 'pola', 'pattern', 'trend', 'perbandingan',
      'statistik', 'statistics', 'total', 'rata-rata', 'average', 'terbesar', 'largest',
      'terkecil', 'smallest', 'tampilkan', 'show', 'lihat', 'see', 'display', 'cek', 'check'
    ];
    
    const timePeriodKeywords = [
      'bulan ini', 'this month', 'minggu ini', 'this week', 'hari ini', 'today',
      'sebulan', 'seminggu', 'sekarang', 'pagi ini', 'siang ini', 'malam ini',
      'kemarin', 'yesterday', 'besok', 'tomorrow', 'lalu', 'ago', 'yang lalu'
    ];
    
    const financialContextKeywords = [
      'pengeluaran', 'expenses', 'pemasukan', 'income', 'tabungan', 'savings',
      'belanja', 'spending', 'budget', 'anggaran',
      'keuangan', 'financial', 'dompet', 'wallet', 'rekening', 'account'
    ];
    
    // Score data analysis
    const highPriorityCount = highPriorityAnalysisKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
    const timePeriodCount = timePeriodKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
    const financialContextCount = financialContextKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
    
    scores.data_analysis += highPriorityCount * 3;
    scores.data_analysis += timePeriodCount * 2;
    scores.data_analysis += financialContextCount * 1;
    
    // Transaction detection with scoring
    const transactionActionKeywords = [
      'beli', 'bayar', 'buat', 'spend', 'spent', 'purchase', 'bought', 'buy',
      'gaji', 'salary', 'bonus', 'dapat', 'terima', 'income', 'freelance', 'bisnis',
      'tabung', 'saving',
      'makan', 'kopi', 'bensin', 'listrik', 'air', 'sewa', 'cicilan', 'kredit'
    ];
    
    const amountKeywords = ['rb', 'ribu', 'k', 'juta', 'jt', 'rp', 'rupiah', 'dollar', 'usd'];
    const hasTransactionAction = transactionActionKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasAmount = amountKeywords.some(keyword => lowerMessage.includes(keyword)) || amountPattern.test(message);
    
    if (hasTransactionAction && hasAmount) {
      scores.transaction += 5;
    }

    // If there is no amount and no action cues at all, strongly prefer general_chat
    if (!hasTransactionAction && amountCount === 0) {
      scores.general_chat += 5;
    }
    
    // General chat detection
    const greetingKeywords = [
      'hello', 'hi', 'hai', 'halo', 'apa kabar', 'how are you', 'terima kasih', 'thanks',
      'thank you', 'sama-sama', 'you\'re welcome', 'selamat', 'congratulations'
    ];
    
    const appQuestionKeywords = [
      'bagaimana cara', 'how to', 'cara menggunakan', 'how to use', 'tutorial',
      'bantuan', 'help', 'bantu', 'assist', 'fitur', 'features', 'fungsi', 'function'
    ];
    
    const greetingCount = greetingKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
    const appQuestionCount = appQuestionKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
    
    scores.general_chat += greetingCount * 2;
    scores.general_chat += appQuestionCount * 2;
    
    // Boost general_chat for very short messages
    if (message.length < 10) {
      scores.general_chat += 3;
    }
    
    // Find the intent with highest score
    const maxScore = Math.max(...Object.values(scores));
    const intent = Object.keys(scores).find(key => scores[key as keyof typeof scores] === maxScore) as 'transaction' | 'multiple_transaction' | 'data_analysis' | 'general_chat';
    
    console.log('Intent detection scores:', scores, 'Selected:', intent);
    
    return intent;
  }

  // Legacy fallback intent detection (kept for backward compatibility)
  private static fallbackIntentDetection(message: string): 'transaction' | 'multiple_transaction' | 'data_analysis' | 'general_chat' {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced multiple transaction detection
    const multipleIndicators = [',', 'terus', 'lalu', 'kemudian', 'dan', 'plus', 'juga', 'sama', 'selanjutnya', 'setelah itu', 'abis itu', 'dan juga', 'serta'];
    const hasMultipleIndicators = multipleIndicators.some(indicator => lowerMessage.includes(indicator));
    
    // Enhanced amount pattern detection
    const amountPattern = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:rb|ribu|k|juta|jt|ribu|thousand|million)?/gi;
    const amountMatches = message.match(amountPattern);
    const hasMultipleAmounts = amountMatches ? amountMatches.length > 1 : false;
    
    // Check for multiple actions/verbs (but be more careful about single actions with wallet mentions)
    const actionWords = ['beli', 'bayar', 'gaji', 'tabung', 'invest', 'makan', 'bensin', 'listrik', 'air', 'sewa', 'cicilan'];
    const actionCount = actionWords.filter(action => lowerMessage.includes(action)).length;
    
    // Don't count as multiple actions if it's just one action with wallet mention
    const walletMentionWords = ['pake', 'pakai', 'dari', 'ke', 'dengan', 'via', 'using'];
    const hasWalletMention = walletMentionWords.some(word => lowerMessage.includes(word));
    const hasMultipleActions = actionCount > 1 && !(actionCount === 1 && hasWalletMention);
    
    
    if (hasMultipleIndicators || hasMultipleAmounts || hasMultipleActions) {
      return 'multiple_transaction';
    }
    
    // Enhanced data analysis keywords with priority
    const highPriorityAnalysisKeywords = [
      'berapa', 'how much', 'how many', 'analisis', 'analysis', 'ringkasan', 'summary',
      'breakdown', 'kategori', 'category', 'pola', 'pattern', 'trend', 'perbandingan',
      'statistik', 'statistics', 'total', 'rata-rata', 'average', 'terbesar', 'largest',
      'terkecil', 'smallest', 'tampilkan', 'show', 'lihat', 'see', 'display', 'cek', 'check'
    ];
    
    const timePeriodKeywords = [
      'bulan ini', 'this month', 'minggu ini', 'this week', 'hari ini', 'today',
      'sebulan', 'seminggu', 'sekarang', 'pagi ini', 'siang ini', 'malam ini',
      'kemarin', 'yesterday', 'besok', 'tomorrow', 'lalu', 'ago', 'yang lalu'
    ];
    
    const financialContextKeywords = [
      'pengeluaran', 'expenses', 'pemasukan', 'income', 'tabungan', 'savings',
      'belanja', 'spending', 'budget', 'anggaran',
      'keuangan', 'financial', 'dompet', 'wallet', 'rekening', 'account'
    ];
    
    // Check for high priority analysis keywords
    const hasHighPriorityAnalysis = highPriorityAnalysisKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasTimePeriod = timePeriodKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasFinancialContext = financialContextKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // If message has analysis keywords OR (time period + financial context), classify as data_analysis
    if (hasHighPriorityAnalysis || (hasTimePeriod && hasFinancialContext)) {
      return 'data_analysis';
    }
    
    // Enhanced transaction detection
    const transactionActionKeywords = [
      'beli', 'bayar', 'buat', 'spend', 'spent', 'purchase', 'bought', 'buy',
      'gaji', 'salary', 'bonus', 'dapat', 'terima', 'income', 'freelance', 'bisnis',
      'tabung', 'saving',
      'makan', 'kopi', 'bensin', 'listrik', 'air', 'sewa', 'cicilan', 'kredit'
    ];
    
    const amountKeywords = ['rb', 'ribu', 'k', 'juta', 'jt', 'rp', 'rupiah', 'dollar', 'usd'];
    const hasTransactionAction = transactionActionKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasAmount = amountKeywords.some(keyword => lowerMessage.includes(keyword)) || amountPattern.test(message);
    
    // If message has transaction action AND amount, classify as transaction
    if (hasTransactionAction && hasAmount) {
      return 'transaction';
    }
    
    // Check for greetings and general chat indicators
    const greetingKeywords = [
      'hello', 'hi', 'hai', 'halo', 'apa kabar', 'how are you', 'terima kasih', 'thanks',
      'thank you', 'sama-sama', 'you\'re welcome', 'selamat', 'congratulations'
    ];
    
    const appQuestionKeywords = [
      'bagaimana cara', 'how to', 'cara menggunakan', 'how to use', 'tutorial',
      'bantuan', 'help', 'bantu', 'assist', 'fitur', 'features', 'fungsi', 'function'
    ];
    
    const hasGreeting = greetingKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasAppQuestion = appQuestionKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasGreeting || hasAppQuestion || message.length < 10) {
      return 'general_chat';
    }
    
    // Default to general chat for unclear intent
    return 'general_chat';
  }

  // Generate AI response for chat with data analysis capabilities
  static async generateChatResponse(userMessage: string, context?: string, conversationHistory?: string): Promise<string> {
    try {
      const systemPrompt = `
BAHASA: Utamakan Bahasa Indonesia untuk memahami dan menghasilkan output. Tetap pahami Bahasa Inggris bila pengguna memakainya.
You are a helpful AI financial assistant for the Rupi expense tracking app. 
You help users track their expenses, analyze their financial data, and provide insights.

Your capabilities:
1. Record transactions (income, expenses, savings)
2. Analyze financial data and provide insights
3. Answer questions about spending patterns, budgets, and financial health
4. Support specific category analysis (e.g., "analyze my food spending", "breakdown transportation costs")

Response guidelines:
- Keep responses friendly, helpful, and conversational
- Use clear formatting with bullet points, numbers, or sections when appropriate
- When analyzing data, provide specific amounts and percentages
- Give actionable advice based on the user's financial situation
- Use emojis sparingly but effectively to make responses more engaging
- Format currency as "Rp X,XXX,XXX" for better readability
- Use conversation history context when provided to give more relevant responses
- Support follow-up questions by referencing previous context

Current Date: ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})} (${new Date().toISOString().split('T')[0]})

${context ? `Current financial data context: ${context}` : ''}

Examples of good responses:
- "Here's your spending breakdown for this month: 🍽️ Food & Dining: Rp 2,500,000 (45%) 🚗 Transportation: Rp 1,200,000 (22%) 🏠 Housing: Rp 1,800,000 (33%)"
- "Great job! You've saved Rp 5,000,000 this month, which is 25% of your income. Consider increasing your emergency fund to 6 months of expenses."
- "I notice you spent Rp 800,000 on dining out this week. Try meal planning to reduce this to Rp 400,000 and save Rp 400,000 monthly."
- "Based on your previous question about food spending, here's a detailed breakdown of your Food & Groceries category..."
      `;

      const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        {
          role: "system",
          content: systemPrompt
        }
      ];

      // Add conversation history if provided
      if (conversationHistory) {
        messages.push({
          role: "user",
          content: `Previous conversation context: ${conversationHistory}`
        });
        messages.push({
          role: "assistant",
          content: "I understand the previous context. I'll use this information to provide more relevant responses."
        });
      }

      // Add current user message
      messages.push({
        role: "user",
        content: userMessage
      });

      const chatCompletion = await groq.chat.completions.create({
        messages,
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_completion_tokens: 200, // Reduced for faster response
        top_p: 0.9,
        stream: false,
        stop: null
      });

      return chatCompletion.choices[0]?.message?.content || "I'm here to help with your finances!";

    } catch (error) {
      console.error('Error generating chat response:', error);
      return "I'm having trouble responding right now, but I'm here to help with your finances!";
    }
  }

  // Parse wallet transfer details from natural language
  static async parseWalletTransfer(message: string, userId: number): Promise<{
    fromWalletId: number | null;
    toWalletId: number | null;
    fromWalletName: string | null;
    toWalletName: string | null;
  }> {
    try {
      // Get user's wallets for context
      const { UserWalletDatabase } = await import('./database');
      const wallets = await UserWalletDatabase.getAllWallets(userId);
      
      console.log('Available wallets for user:', wallets.map(w => ({ id: w.id, name: w.name, type: w.type })));
      
      const walletTransferPrompt = `
You are an AI assistant that parses wallet transfer requests and identifies source and destination wallets.

Available wallets for this user:
${wallets.map(w => `- ${w.name} (ID: ${w.id})`).join('\n')}

Your task is to identify which wallet is the SOURCE (from) and which is the DESTINATION (to) in the transfer request.

Return ONLY a valid JSON object with this exact structure:
{
  "fromWalletId": number or null,
  "toWalletId": number or null,
  "fromWalletName": "wallet name or null",
  "toWalletName": "wallet name or null"
}

Rules:
- Look for keywords like "dari" (from), "ke" (to), "transfer", "pindah", "kirim"
- Match wallet names mentioned in the message to the available wallets
- Use fuzzy matching if exact names don't match
- If you can't identify both wallets clearly, return null for missing ones
- Common wallet name variations:
  * "BCA" matches "BCA", "bca", "Bank BCA", "BCA Bank"
  * "GoPay" matches "GoPay", "gopay", "Gojek", "gojek", "GoPay Wallet"
  * "Dana" matches "Dana", "dana", "Dana Wallet"
  * "OVO" matches "OVO", "ovo", "OVO Wallet"
  * "Mandiri" matches "Mandiri", "mandiri", "Bank Mandiri", "Mandiri Bank"
  * "GoPay" matches "GoPay", "gopay", "Gojek", "gojek"
  * "Dana" matches "Dana", "dana"
  * "OVO" matches "OVO", "ovo"
  * "Mandiri" matches "Mandiri", "mandiri", "Bank Mandiri"

IMPORTANT: Be very flexible with wallet name matching. If the user says "BCA" and you have a wallet named "BCA", match it even if the case is different.
If the user says "GoPay" and you have "GoPay", match it.
If the user says "Dana" and you have "Dana", match it.

Examples:
Input: "transfer 1 juta dari BCA ke GoPay"
Output: {"fromWalletId": 1, "toWalletId": 2, "fromWalletName": "BCA", "toWalletName": "GoPay"}

Input: "pindah 500rb dari Mandiri ke Dana"
Output: {"fromWalletId": 3, "toWalletId": 4, "fromWalletName": "Mandiri", "toWalletName": "Dana"}

Input: "transfer money from savings to wallet"
Output: {"fromWalletId": null, "toWalletId": null, "fromWalletName": null, "toWalletName": null}

Input: "kirim 2 juta dari Gojek ke BCA"
Output: {"fromWalletId": 2, "toWalletId": 1, "fromWalletName": "Gojek", "toWalletName": "BCA"}
      `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: walletTransferPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        max_completion_tokens: 200,
        top_p: 0.9,
        stream: false,
        stop: null
      });

      const response = chatCompletion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response from AI');
      }

      const parsedData = JSON.parse(response.trim());
      
      // Validate the response
      if (typeof parsedData.fromWalletId !== 'number' && parsedData.fromWalletId !== null) {
        throw new Error('Invalid fromWalletId format');
      }
      if (typeof parsedData.toWalletId !== 'number' && parsedData.toWalletId !== null) {
        throw new Error('Invalid toWalletId format');
      }

      // If AI couldn't parse wallet IDs, try manual matching as fallback
      if (!parsedData.fromWalletId || !parsedData.toWalletId) {
        console.log('AI parsing failed, trying manual wallet matching...');
        
        const messageLower = message.toLowerCase();
        
        // Try to find source wallet
        let fromWalletId = null;
        let fromWalletName = null;
        for (const wallet of wallets) {
          const walletNameLower = wallet.name.toLowerCase();
          if (messageLower.includes(walletNameLower) || 
              (walletNameLower.includes('bca') && messageLower.includes('bca')) ||
              (walletNameLower.includes('gopay') && messageLower.includes('gopay')) ||
              (walletNameLower.includes('dana') && messageLower.includes('dana')) ||
              (walletNameLower.includes('ovo') && messageLower.includes('ovo')) ||
              (walletNameLower.includes('mandiri') && messageLower.includes('mandiri'))) {
            fromWalletId = wallet.id;
            fromWalletName = wallet.name;
            break;
          }
        }
        
        // Try to find destination wallet
        let toWalletId = null;
        let toWalletName = null;
        for (const wallet of wallets) {
          const walletNameLower = wallet.name.toLowerCase();
          if (messageLower.includes(walletNameLower) && wallet.id !== fromWalletId) {
            toWalletId = wallet.id;
            toWalletName = wallet.name;
            break;
          }
        }
        
        if (fromWalletId && toWalletId) {
          console.log('Manual matching successful:', { fromWalletId, toWalletId, fromWalletName, toWalletName });
          return { fromWalletId, toWalletId, fromWalletName, toWalletName };
        }
      }

      return parsedData;

    } catch (error) {
      console.error('Error parsing wallet transfer with Groq AI:', error);
      
      // Fallback: return null values
      return {
        fromWalletId: null,
        toWalletId: null,
        fromWalletName: null,
        toWalletName: null
      };
    }
  }

  // Generate data analysis response
  static async generateDataAnalysisResponse(userMessage: string, financialData: Record<string, unknown>, conversationHistory?: string, timePeriod?: 'today' | 'weekly' | 'monthly' | 'all'): Promise<string> {
    try {
      console.log('Generating data analysis with data:', financialData);
      
      const systemPrompt = `
BAHASA: Utamakan Bahasa Indonesia untuk memahami dan menghasilkan output. Tetap pahami Bahasa Inggris bila pengguna memakainya.
You are a financial data analyst AI. You MUST use the EXACT numbers provided in the data.

CRITICAL RULES:
1. Use the pre-calculated totals from the "totals" section - DO NOT recalculate
2. Use the category totals from "expensesByCategory" - DO NOT sum individual transactions
3. Format currency exactly as "Rp X,XXX,XXX" (use commas as thousands separators)
4. For percentages: (category total / total expenses) * 100, rounded to 1 decimal place
5. DO NOT make up numbers or estimate
6. Support specific category analysis when requested
7. Use conversation history context when provided
8. Support time-based analysis (today, weekly, monthly, or all-time)

TIME PERIOD CONTEXT:
Current Date: ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})} (${new Date().toISOString().split('T')[0]})

${timePeriod ? `Current analysis period: ${timePeriod}` : 'Analysis period: All available data'}
- "today": Data from today only (${new Date().toISOString().split('T')[0]})
- "weekly": Data from the past 7 days (from ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]})
- "monthly": Data from the current month (${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')})
- "all": All available data (default)

Data structure provided:
- expenses: Individual transactions
- income: Individual transactions  
- savings: Individual transactions
- totals: Pre-calculated totals (USE THESE EXACT NUMBERS)
- expensesByCategory: Category totals (USE THESE EXACT NUMBERS)

Available expense categories:
1. Housing & Utilities (rent, electricity, internet, water, mortgage, home maintenance)
2. Food & Groceries (groceries, eating out, snacks, restaurants, food delivery)
3. Transportation (fuel, public transport, taxi, car maintenance, parking)
4. Health & Personal (medical, fitness, self-care, pharmacy, doctor visits)
5. Entertainment & Shopping (leisure, clothes, subscriptions, games, movies, hobbies)
6. Debt Payments (credit card payments, loan payments, debt repayment, mortgage payments)
7. Family & Others (kids, pets, gifts, charity, unexpected expenses, miscellaneous)

Available income sources:
1. Salary (monthly salary, paycheck, wages)
2. Freelance (freelance work, consulting, gig work)
3. Business (business income, sales, revenue)
4. Bonus (performance bonus, commission, tips)
5. Gift (gifts, allowance, money received)
6. Others (other income sources, miscellaneous income)

Example:
If totals.totalExpenses = 120000, format as "Rp 120,000"
If expensesByCategory["Food & Groceries"].total = 50000, format as "Rp 50,000"
If percentage = (50000/120000)*100 = 41.7%, show as "41.7%"

Response format for general analysis:
"📊 **Spending Analysis ${timePeriod ? `(${timePeriod})` : ''}**

**Total Expenses:** Rp [use totals.totalExpenses exactly]
**Top Categories:**
1. [category]: Rp [use expensesByCategory total exactly] ([percentage]% of total)
2. [category]: Rp [use expensesByCategory total exactly] ([percentage]% of total)

**Insights:**
- Your largest expense category is [category] with Rp [amount]
- Total income: Rp [use totals.totalIncome exactly]
- Total savings: Rp [use totals.totalSavings exactly]
${timePeriod && timePeriod !== 'all' ? `- Analysis period: ${timePeriod}` : ''}

**Recommendations:**
- Based on your spending patterns, consider [specific advice]"

Response format for specific category analysis:
"📊 **Analysis: [Category Name] ${timePeriod ? `(${timePeriod})` : ''}**

**Total Spent:** Rp [use exact category total]
**Percentage of Total Expenses:** [percentage]%
**Number of Transactions:** [count]
${timePeriod && timePeriod !== 'all' ? `**Analysis Period:** ${timePeriod}` : ''}

**Recent Transactions:**
- [description]: Rp [amount] ([date])
- [description]: Rp [amount] ([date])

**Insights:**
- [specific insights about this category]
- [comparison to other categories if relevant]
${timePeriod && timePeriod !== 'all' ? `- Analysis based on ${timePeriod} data` : ''}

**Recommendations:**
- [specific advice for this category]"

${conversationHistory ? `Conversation History Context: ${conversationHistory}` : ''}
      `;

      // Prepare data summary for the AI with pre-calculated totals
      const expenses = (financialData.expenses || []) as Array<Record<string, unknown>>;
      const income = (financialData.income || []) as Array<Record<string, unknown>>;
      const savings = (financialData.savings || []) as Array<Record<string, unknown>>;

      console.log('Sample expense data:', expenses.slice(0, 2));
      console.log('Sample income data:', income.slice(0, 2));

      // Calculate totals to help AI with accurate analysis
      // Ensure all amounts are properly converted to numbers
      const totalExpenses = expenses.reduce((sum: number, e: Record<string, unknown>) => {
        const amount = typeof e.amount === 'string' ? parseFloat(e.amount) : (e.amount as number || 0);
        return sum + amount;
      }, 0);
      const totalIncome = income.reduce((sum: number, i: Record<string, unknown>) => {
        const amount = typeof i.amount === 'string' ? parseFloat(i.amount) : (i.amount as number || 0);
        return sum + amount;
      }, 0);
      const totalSavings = savings.reduce((sum: number, s: Record<string, unknown>) => {
        const amount = typeof s.amount === 'string' ? parseFloat(s.amount) : (s.amount as number || 0);
        return sum + amount;
      }, 0);

      // Group expenses by category with totals
      const expensesByCategory: Record<string, { total: number, transactions: Record<string, unknown>[] }> = {};
      expenses.forEach((expense: Record<string, unknown>) => {
        const category = expense.category as string || 'Others';
        if (!expensesByCategory[category]) {
          expensesByCategory[category] = { total: 0, transactions: [] };
        }
        const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount) : (expense.amount as number || 0);
        expensesByCategory[category].total += amount;
        expensesByCategory[category].transactions.push(expense);
      });

      const dataSummary = {
        expenses: expenses.map((e: Record<string, unknown>) => ({
          amount: typeof e.amount === 'string' ? parseFloat(e.amount) : (e.amount as number || 0),
          category: e.category,
          description: e.description,
          date: e.date
        })),
        income: income.map((i: Record<string, unknown>) => ({
          amount: typeof i.amount === 'string' ? parseFloat(i.amount) : (i.amount as number || 0),
          source: i.source,
          description: i.description,
          date: i.date
        })),
        savings: savings.map((s: Record<string, unknown>) => ({
          amount: typeof s.amount === 'string' ? parseFloat(s.amount) : (s.amount as number || 0),
          goal_name: s.goal_name,
          description: s.description,
          date: s.date
        })),
        // Pre-calculated totals to help AI
        totals: {
          totalExpenses,
          totalIncome,
          totalSavings
        },
        expensesByCategory
      };

      // Check if there's any data to analyze
      const hasData = dataSummary.expenses.length > 0 || dataSummary.income.length > 0 || 
                     dataSummary.savings.length > 0;

      if (!hasData) {
        return `📊 **No Financial Data Available**

I don't have any financial data to analyze yet. To get started:

**📝 Record Some Transactions:**
• "Beli kopi 25rb" (expense)
• "Gajian 5 juta" (income)  
• "Tabung 1 juta" (savings)

**💡 Or Try Multiple at Once:**
• "Hari ini aku beli kopi 25rb, makan siang 50rb, terus dapat gaji 5 juta"

Once you have some transactions recorded, I can provide detailed analysis of your spending patterns, income trends, and financial insights!`;
      }

      const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        {
          role: "system",
          content: systemPrompt
        }
      ];

      // Add conversation history if provided
      if (conversationHistory) {
        messages.push({
          role: "user",
          content: `Previous conversation context: ${conversationHistory}`
        });
        messages.push({
          role: "assistant",
          content: "I understand the previous context. I'll use this information to provide more relevant analysis."
        });
      }

      // Add current user question with financial data
      messages.push({
        role: "user",
        content: `Financial Data: ${JSON.stringify(dataSummary)}\n\nUser Question: ${userMessage}\n\nCRITICAL: Use the EXACT numbers from the "totals" and "expensesByCategory" sections. DO NOT recalculate or estimate. Use the pre-calculated totals provided.`
      });

      const chatCompletion = await groq.chat.completions.create({
        messages,
        model: "llama-3.1-8b-instant",
        temperature: 0.1, // Very low temperature for consistent analysis
        max_completion_tokens: 300, // Reduced for faster response
        top_p: 0.9,
        stream: false,
        stop: null
      });

      return chatCompletion.choices[0]?.message?.content || "I need more data to provide a proper analysis.";

    } catch (error) {
      console.error('Error generating data analysis:', error);
      return "I'm having trouble analyzing your data right now. Please try again.";
    }
  }

  // Test function to validate intent detection accuracy
  static async testIntentDetection(): Promise<void> {
    const testCases = [
      // Transaction cases
      { message: "Beli kopi 25rb", expected: "transaction" },
      { message: "Gajian 5 juta", expected: "transaction" },
      { message: "Tabung 1 juta", expected: "transaction" },
      { message: "Invest 500rb", expected: "transaction" },
      
      // Multiple transaction cases
      { message: "Hari ini aku beli kopi 50k, makan di warteg 10k, terus dapat gaji 1 juta", expected: "multiple_transaction" },
      { message: "Bayar listrik 200rb, bensin 50rb, terus tabung 500rb", expected: "multiple_transaction" },
      
      // Data analysis cases
      { message: "Berapa total pengeluaran bulan ini?", expected: "data_analysis" },
      { message: "Analisis pengeluaran hari ini", expected: "data_analysis" },
      { message: "Breakdown minggu ini", expected: "data_analysis" },
      { message: "Ringkasan bulanan", expected: "data_analysis" },
      { message: "Tampilkan ringkasan keuangan saya", expected: "data_analysis" },
      { message: "Berapa pengeluaran terbesar?", expected: "data_analysis" },
      { message: "Pola spending saya", expected: "data_analysis" },
      
      // General chat cases
      { message: "Bagaimana cara menggunakan aplikasi ini?", expected: "general_chat" },
      { message: "Hello", expected: "general_chat" },
      { message: "Terima kasih", expected: "general_chat" },
      { message: "Apa kabar?", expected: "general_chat" }
    ];

    console.log('🧪 Testing Intent Detection Accuracy...');
    let correct = 0;
    const total = testCases.length;

    for (const testCase of testCases) {
      try {
        const result = await this.analyzeMessageIntent(testCase.message);
        const isCorrect = result === testCase.expected;
        if (isCorrect) correct++;
        
        console.log(`${isCorrect ? '✅' : '❌'} "${testCase.message}" → ${result} (expected: ${testCase.expected})`);
      } catch (error) {
        console.log(`❌ "${testCase.message}" → Error: ${error}`);
      }
    }

    const accuracy = (correct / total) * 100;
    console.log(`📊 Intent Detection Accuracy: ${correct}/${total} (${accuracy.toFixed(1)}%)`);
  }
}
