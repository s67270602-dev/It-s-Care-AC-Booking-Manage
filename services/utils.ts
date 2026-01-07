import { Booking } from '../types';

const STORAGE_KEY = "itscare_ac_booking_mobile_v2";
const SMS_TEMPLATE_KEY = "itscare_ac_sms_template_v2";

export const DEFAULT_SMS_TEMPLATE = `[에어컨 청소 안내]
안녕하세요 😊 예약 안내드립니다.

✅ 청소 전 준비
- 가능하면 전원 OFF
- 실내 주변 정리(작업 공간 확보)

✅ 간단 진행 순서
1) 기기 정상 작동 확인
2) 에어컨 분해
3) 분해 후 오염 상태 확인
4) 친환경 세제로 부품 세척
5) 열교환기 고압 세척
6) 친환경 살균·탈취로 냄새 제거
7) 조립 및 작동 테스트
8) 에어컨 관리 요령 안내

이끌림잇츠케어~ 싹~ 시원하게!
울산 대표 클린 서비스
에어컨청소 · 제빙기청소까지
한 번 맡기면 기분까지 청소돼요~!
☎ 1577-7672 / 010-7711-8950`;

// --- Data Persistence ---
export const loadBookings = (): Booking[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load bookings", e);
    return [];
  }
};

export const saveBookings = (data: Booking[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save bookings", e);
  }
};

export const loadSmsTemplate = (): string => {
  return localStorage.getItem(SMS_TEMPLATE_KEY) || DEFAULT_SMS_TEMPLATE;
};

export const saveSmsTemplate = (tpl: string) => {
  localStorage.setItem(SMS_TEMPLATE_KEY, tpl);
};

// --- Calculation ---
export const parseMoney = (str: string | undefined): number => {
  if (!str) return 0;
  const num = parseInt(str.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(num) ? num : 0;
};

export const formatMoney = (num: number): string => {
  return num.toLocaleString("ko-KR");
};

export const getCommissionRate = (item: Booking): number | null => {
  const inputRate = item.commissionRate?.trim();
  if (inputRate && inputRate !== "") {
    const r = parseFloat(inputRate);
    return Number.isFinite(r) ? r : null;
  }
  
  // Defaults if empty
  if (item.contractor === "이끌림") return 30;
  if (item.contractor === "자체건") return 0;
  return null; // Samsung/HS etc unknown
};

export const calcFinancials = (item: Booking) => {
  const total = parseMoney(item.priceTotal);
  const rate = getCommissionRate(item);
  
  let fee: number | null = null;
  let net: number | null = null;

  if (rate !== null) {
    fee = Math.round(total * (rate / 100));
    net = Math.max(0, total - fee);
  }

  return { total, rate, fee, net };
};

// --- Date Utils ---
export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const isToday = (dateStr: string) => dateStr === formatDate(new Date());
export const isTomorrow = (dateStr: string) => {
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  return dateStr === formatDate(tom);
};
export const isThisMonth = (dateStr: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

// --- CSV Utils ---
const csvEscape = (val: string | number | undefined | null) => {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const downloadCSV = (filename: string, headers: string[], rows: any[]) => {
  const csvContent = [
    headers.map(csvEscape).join(","),
    ...rows.map(row => headers.map(h => csvEscape(row[h])).join(","))
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const parseCSV = (text: string): string[][] => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  const result: string[][] = [];
  
  for (const line of lines) {
    const row: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        row.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    row.push(cur.trim());
    result.push(row);
  }
  return result;
};
