import React, { useState, useEffect, useMemo } from 'react';
import { Booking } from './types';
import { downloadCSV, calcFinancials } from './services/utils';
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import CalendarView from './components/CalendarView';
import SummaryView from './components/SummaryView';
import DetailModal from './components/DetailModal';
import MonthlySettlementView from './components/MonthlySettlementView'; // [새로 추가됨] 월별 정산 컴포넌트
import { Download, LogOut, ChevronLeft } from 'lucide-react';

type Tab = 'home' | 'list' | 'settlement' | 'settings'; // [수정됨] 'settlement' 탭 추가
type Role = 'admin' | 'engineer' | null;

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx8tgtYkrVcwdEYxrpgQfqwouVfanNm2qB_A27j8bl3hhKf-a1xLTLfFFKJFqqUXwIZ/exec";

const parseNum = (val: any) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;
};

const App: React.FC = () => {
  const [role, setRole] = useState<Role>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showFormModal, setShowFormModal] = useState(false);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const ADMIN_PASS = "081607";
  const ENGINEER_PASS = "7672";

  useEffect(() => {
    if (!role) return;
    const loadFromServer = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        const mapped: Booking[] = (data.bookings || []).map((row: any, idx: number) => {
          return {
            id: `ac_${idx}_${Date.now()}`,
            customer: row[0],
            phone: row[1],
            address: row[2],
            group: row[3],
            model: row[4],
            type: row[5],
            qty: Number(row[6]),
            scope: row[7],
            bookDate: row[8],
            ampm: (row[9] || '').split(' ')[0],
            bookTime: (row[9] || '').split(' ')[1],
            engineer: row[10],
            net: parseNum(row[11]),
            engineer2: row[12],
            net2: parseNum(row[13]),
            contractor: row[14],
            commissionRate: row[15],
            priceTotal: row[16],
            fee: parseNum(row[17]),
            paid: row[19],
            memo: row[20],
            createdAt: Date.now()
          };
        });
        setBookings(mapped);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    loadFromServer();
  }, [role]);

  const sendToServer = async (payload: any) => {
    try { await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) }); }
    catch (e) { alert("서버 저장 실패"); }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASS) setRole('admin');
    else if (passwordInput === ENGINEER_PASS) setRole('engineer');
    else { alert("비밀번호가 틀렸습니다."); setPasswordInput(''); }
  };

  const handleLogout = () => { if(window.confirm("로그아웃 하시겠습니까?")) { setRole(null); setPasswordInput(''); } };

  const handleSave = (data: any) => {
    const { fee: calcFee } = calcFinancials(data);
    
    // 구글 시트에서 가져온 값 최우선 존중
    let n1 = 0;
    if (data.net !== undefined && data.net !== '') {
        n1 = parseNum(data.net);
    } else if (data["기사1 정산액"] !== undefined && data["기사1 정산액"] !== '') {
        n1 = parseNum(data["기사1 정산액"]);
    }

    let n2 = 0;
    if (data.net2 !== undefined && data.net2 !== '') {
        n2 = parseNum(data.net2);
    } else if (data["기사2 정산액"] !== undefined && data["기사2 정산액"] !== '') {
        n2 = parseNum(data["기사2 정산액"]);
    }

    let f = (data.fee !== undefined && data.fee !== '') ? parseNum(data.fee) : calcFee;

    // 완전 신규 예약 추가 시에만 자동 계산 허용
    if (!data.id && n1 === 0 && n2 === 0 && parseNum(data.priceTotal) > 0) {
      n1 = parseNum(data.priceTotal) - f;
    }

    const payload = {
      action: data.id ? 'UPDATE' : 'ADD',
      "고객명": data.customer,
      "연락처": data.phone,
      "주소": data.address,
      "업종": data.group,
      "모델": data.model,
      "종류": data.type,
      "대수": data.qty,
      "범위": data.scope,
      "예약일": data.bookDate,
      "시간": (data.ampm || "오전") + " " + (data.bookTime || ""),
      "담당기사1": data.engineer,
      "기사1 정산액": n1,
      "담당기사2": data.engineer2,
      "기사2 정산액": n2,
      "도급업체": data.contractor,
      "수수료율": data.commissionRate,
      "총금액": data.priceTotal,
      "수수료": f,
      "결제": data.paid,
      "비고": data.memo
    };

    if (data.id && bookings.some(b => b.id === data.id)) {
      setBookings(bookings.map(b => b.id === data.id ? { ...b, ...data, net: n1, net2: n2, fee: f } : b));
    } else {
      const newBooking = { ...data, id: `ac_${Date.now()}`, net: n1, net2: n2, fee: f, createdAt: Date.now() };
      setBookings([...bookings, newBooking]);
    }
    
    sendToServer(payload);
    setEditingBooking(null);
    setShowFormModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      const target = bookings.find(b => b.id === id);
      if (!target) return;
      setBookings(prev => prev.filter(b => b.id !== id));
      sendToServer({ action: 'DELETE', "고객명": target.customer, "연락처": target.phone });
      setDetailBooking(null);
    }
  };

  const handleTogglePaid = (booking: Booking) => {
    const newVal = booking.paid === '완료' ? '미완료' : '완료';
    if (!window.confirm(`${newVal} 처리하시겠습니까?`)) return;
    const updated = { ...booking, paid: newVal };
    setBookings(bookings.map(b => b.id === booking.id ? updated : b));
    if (detailBooking?.id === booking.id) setDetailBooking(updated);
    
    sendToServer({ 
      action: 'UPDATE', 
      "고객명": updated.customer, 
      "연락처": updated.phone,
      "주소": updated.address,
      "업종": updated.group,
      "모델": updated.model,
      "종류": updated.type,
      "대수": updated.qty,
      "범위": updated.scope,
      "예약일": updated.bookDate,
      "시간": updated.ampm + " " + updated.bookTime,
      "담당기사1": updated.engineer,
      "기사1 정산액": updated.net,
      "담당기사2": updated.engineer2,
      "기사2 정산액": updated.net2,
      "도급업체": updated.contractor,
      "수수료율": updated.commissionRate,
      "총금액": updated.priceTotal,
      "수수료": updated.fee,
      "결제": updated.paid,
      "비고": updated.memo
    });
  };

  const filteredBookings = useMemo(() => bookings.filter(b => b.customer.includes(searchQuery) || b.phone.includes(searchQuery)).sort((a,b) => (a.bookDate || '9').localeCompare(b.bookDate || '9')), [bookings, searchQuery]);

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-[32px] p-10 shadow-2xl text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-6 shadow-lg">잇</div>
          <h2 className="text-xl font-black text-slate-800 mb-2">잇츠케어에어컨케어</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="비밀번호 입력"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-bold outline-none focus:border-blue-500" autoFocus />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">접속하기</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-12 font-sans">
      {isLoading && <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center font-black text-blue-600 animate-pulse">데이터 동기화 중...</div>}
      <header className="bg-white border-b sticky top-0 z-40 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg text-white font-black text-xl">잇</div>
          <h1 className="text-xl font-black leading-none">잇츠케어_에어컨</h1>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
      </header>

      {role === 'admin' && (
        <div className="max-w-[1920px] mx-auto px-4 mt-6">
          <div className="flex bg-slate-200/50 p-1 rounded-[22px] w-fit gap-1 shadow-inner overflow-x-auto">
            {(['home', 'list', 'settlement', 'settings'] as const).map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-6 py-2.5 rounded-[18px] text-sm font-black transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                {tab === 'home' ? '대시보드' : tab === 'list' ? '예약목록' : tab === 'settlement' ? '월별정산' : '설정'}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-[1920px] mx-auto p-4">
        {activeTab === 'home' && (
          <div className="space-y-4">
            <CalendarView bookings={bookings} onDetail={setDetailBooking} />
            {/* [수정됨] 완료된 항목만 필터링하여 SummaryView에 전달 */}
            {role === 'admin' && <SummaryView bookings={bookings.filter(b => b.paid === '완료')} />}
          </div>
        )}
        
        {activeTab === 'list' && role === 'admin' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="고객명, 연락처 검색..." className="flex-1 px-5 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 shadow-sm" />
              <button onClick={() => { setEditingBooking(null); setShowFormModal(true); }} className="bg-blue-600 text-white px-6 rounded-2xl font-black shadow-lg">추가</button>
            </div>
            <BookingList bookings={bookings} onEdit={(b) => { setEditingBooking(b); setShowFormModal(true); }} onDelete={handleDelete} onTogglePaid={handleTogglePaid} onDetail={setDetailBooking} />
          </div>
        )}

        {/* [새로 추가됨] 월별정산 탭 내용 렌더링 - 여기는 정산 내역이므로 전체 데이터 사용 */}
        {activeTab === 'settlement' && role === 'admin' && (
          <div className="space-y-4">
             <MonthlySettlementView bookings={bookings} />
          </div>
        )}

        {activeTab === 'settings' && role === 'admin' && (
           <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-4">
              <button onClick={() => downloadCSV('에어컨_백업.csv', [], bookings)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 flex justify-between items-center active:bg-slate-100"><span>CSV 백업 내보내기</span><Download size={18}/></button>
           </div>
        )}
      </main>

      <DetailModal booking={detailBooking} onClose={() => setDetailBooking(null)} onEdit={role === 'admin' ? (b) => { setEditingBooking(b); setDetailBooking(null); setShowFormModal(true); } : undefined} onDelete={role === 'admin' ? handleDelete : undefined} onTogglePaid={handleTogglePaid} />

      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-up">
           <div className="px-4 py-4 border-b flex items-center gap-3 bg-white sticky top-0 z-10 shadow-sm">
             <button onClick={() => setShowFormModal(false)} className="p-2 -ml-2 text-slate-400"><ChevronLeft size={28} /></button>
             <h2 className="text-xl font-black text-slate-800">{editingBooking ? '예약 수정' : '새 예약 추가'}</h2>
           </div>
           <div className="flex-1 overflow-y-auto p-4 pb-12">
             <BookingForm initialData={editingBooking} onSave={handleSave} onCancelEdit={() => setShowFormModal(false)} />
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
