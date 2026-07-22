export type Role = 'admin' | 'user';

export interface User {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressReference?: string;
  role: Role;
  createdAt: number;
  emailVerified?: boolean;
  cookieConsentAt?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'refeicao' | 'bebida';
  available: boolean;
  options?: string[]; // e.g., ['batata frita', 'legumes', 'verduras']
  priceOption2?: number; // Price for 2 pieces for meals
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedOption?: string;
  selectedSize?: '1 pedaço' | '2 pedaços';
  totalPrice: number;
}

export type OrderStatus = 'pending_payment' | 'preparing' | 'delivering' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  userName: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: 'pix' | 'credit' | 'debit' | 'cash';
  receiptUrl?: string;
  createdAt: number;
  updatedAt: number;
  address?: string;
  changeRequested?: boolean;
  changeFor?: number;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  createdAt: number;
}

export interface FinanceEntry {
  id: string;
  type: 'income' | 'fixed_cost' | 'variable_cost';
  amount: number;
  description: string;
  date: number;
  createdAt: number;
}

export interface DayHours {
  isOpen: boolean;
  openTime: string; // e.g. "11:00"
  closeTime: string; // e.g. "23:00"
}

export interface CompanyInfo {
  name: string;
  phone: string;
  address: string;
  pixKey: string;
  pixKeyName: string;
  logoUrl?: string;
  forceClosed?: boolean;
  openingHours?: {
    [key: string]: DayHours;
  };
}

