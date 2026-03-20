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
  engineerAmount?: string; // 추가: 첫 번째 기사 정산액
  engineer2?: string;      // 추가: 두 번째 기사 이름
  engineer2Amount?: string; // 추가: 두 번째 기사 정산액
  contractor: string;
  commissionRate: string; // String to allow empty "unknown" state
  payMethod: string;
  paid: '완료' | '미완료';
  memo: string;
  createdAt: number;
  fee?: number; // (App.tsx 사용 보정용)
  net?: number; // (App.tsx 사용 보정용)
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
