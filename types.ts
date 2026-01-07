export interface Booking {
  id: string; // Using timestamp or uuid
  customer: string;
  phone: string;
  address: string;
  group: string;
  model: string;
  type: string;
  qty: number;
  scope: string;
  priceTotal: string; // Keeping as string to match input behavior, parsed for calcs
  bookDate: string; // YYYY-MM-DD
  bookTime: string; // HH:mm
  ampm: '오전' | '오후';
  engineer: string;
  contractor: string;
  commissionRate: string; // String to allow empty "unknown" state
  payMethod: string;
  paid: '완료' | '미완료';
  memo: string;
  createdAt: number;
}

export interface SummaryStats {
  count: number;
  sales: number;
  fee: number;
  net: number;
  unknown: number;
}

export type FilterType = 'all' | 'tomorrow' | 'today' | 'month' | 'due';
export type SortType = 'default' | 'date' | 'name' | 'net';
