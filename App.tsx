import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Booking } from './types';
import { loadBookings, saveBookings, downloadCSV, parseCSV, calcFinancials } from './services/utils';
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import CalendarView from './components/CalendarView';
import SummaryView from './components/SummaryView';
import DetailModal from './components/DetailModal';
import { Download, LogOut, Calendar as CalendarIcon, Plus, ChevronLeft } from 'lucide-react';

type Tab = 'home' | 'list' | 'settings';
type Role = 'admin' | 'engineer' | null;

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxY893O6AN73Ru5BbTJzJciqBSJ_Lf0AgQBveI5XHCgwxsA--tIj1cfs9wz0o3M_xPP/exec";

// 금액 계산 시 콤마 등 문자열이 섞여 있어도 안전하게 숫자로 변환해주는 함수
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

  // 1. 서버에서 데이터 가져오기
  useEffect(() => {
    if (!role) return;
    const loadFromServer = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        const mapped: Booking[] = (data.bookings || []).map((row: any, idx: number) => {
          
          const price = parseNum(row[13]);
          const rawFee = parseNum(row[14]);
          const rawNet = parseNum(row[15]);
          
          // 수수료율이 없어 정산액이 0인 경우, 기본적으로 총금액을 정산액으로 보정
          const fee = rawFee;
          const net = (rawNet === 0 && price > 0) ? price - fee : rawNet;

          return {
            id: `ac_${idx}_${Date.now()}`,
            customer: row[0] || '',
            phone: row[1] || '',
            address: row[2] || '',
            group: row[3] || '',
            model: row[4] || '',
            type: row[5] || '',
            qty: Number(row[6]) || 1,
            scope: row[7] || '',
            bookDate: row[8] || '',
            ampm: (row[9] || '').split(' ')[0] || '오전',
            bookTime: (row[9] || '').split(' ')[1] || '',
            engineer: row[10] || '',
            contractor: row[11] || '',
            commissionRate: row[12] || '',
            priceTotal: row[13] || '',
            fee: fee,
            net: net,
            paid: row[16] || '',
            memo: row[17] || '',
            signatureUrl: row[18] || '', // 새로 추가된 서명 링크 (S열)
            isDisagree: row[19] === '미동의', // 새로 추가된 동의 여부 (T열)
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

  useEffect(() => { if (role === 'engineer') setActiveTab('home'); }, [role]);

  const handleSave = (data: any) => {
    const { total, fee, net } = calcFinancials(data); // 정산금액 자동계산
    
    // 수정 시 기존 입력된 금액이 지워지지 않도록 data에 있는 값을 우선적으로 사용 (없을 때만 자동계산 값 반영)
    let finalFee = (data.fee !== undefined && data.fee !== null && data.fee !== '') ? parseNum(data.fee) : (fee || 0);
    let finalNet = (data.net !== undefined && data.net !== null && data.net !== '') ? parseNum(data.net) : (net || 0);

    // 수수료율 미입력 등으로 정산액이 0일 경우, 총금액으로 보정
    if (finalNet === 0 && parseNum(data.priceTotal) > 0) {
        finalNet = parseNum(data.priceTotal) - finalFee;
    }

    // --- 강력한 시간 포맷 & 오전/오후 변환 로직 추가 ---
    let formattedTime = data.bookTime ? String(data.bookTime).trim() : "";
    let formattedAmPm = data.ampm ? String(data.ampm).trim() : "오전";

    if (formattedTime.includes(':')) {
      let [hoursStr, minutes] = formattedTime.split(':');
      let hours = parseInt(hoursStr, 10);
      
      if (!isNaN(hours)) {
        if (hours > 12) {
          formattedAmPm = '오후';
          hours -= 12;
        } else if (hours === 12) {
          formattedAmPm = '오후';
        } else if (hours === 0) {
          formattedAmPm = '오전';
          hours = 12;
        } else {
          formattedAmPm = data.ampm || '오전';
        }
        formattedTime = `${hours}:${minutes}`;
      }
    }
    // ------------------------------------------------

    const payload = { ...data, bookTime: formattedTime, ampm: formattedAmPm, fee: finalFee, net: finalNet };

    if (data.id && bookings.some(b => b.id === data.id)) {
      setBookings(bookings.map(b => b.id === data.id ? { ...b, ...payload } : b));
      sendToServer({ action: 'UPDATE', ...payload });
    } else {
      const newBooking = { ...payload, id: `ac_${Date.now()}`, createdAt: Date.now() };
      setBookings([...bookings, newBooking]);
      sendToServer({ action: 'ADD', ...newBooking });
    }
    setEditingBooking(null);
    setShowFormModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      const target = bookings.find(b => b.id === id);
      setBookings(prev => prev.filter(b => b.id !== id));
      sendToServer({ action: 'DELETE', customer: target?.customer, phone: target?.phone });
      setDetailBooking(null);
    }
  };

  // 결제 상태 변경 시
  const handleTogglePaid = (booking: Booking) => {
    const isCurrentlyPaid = booking.paid === '완료';
    const confirmMessage = isCurrentlyPaid 
      ? '결제 미완료 상태로 변경하시겠습니까?' 
      : '결제 완료 처리하시겠습니까?';
      
    if (!window.confirm(confirmMessage)) return;

    const newVal = isCurrentlyPaid ? '미완료' : '완료';
    
    // 결제 상태 변경 시에도 정산액이 초기화/누락되지 않도록 기존 값을 최우선 유지
    let finalFee = parseNum(booking.fee);
    let finalNet = parseNum(booking.net);
    
    if (!finalNet && parseNum(booking.priceTotal) > 0) {
        finalNet = parseNum(booking.priceTotal) - finalFee;
    }

    const updatedBooking = { 
        ...booking, 
        paid: newVal, 
        fee: finalFee, 
        net: finalNet 
    };
    
    setBookings(bookings.map(b => b.id === booking.id ? updatedBooking : b));
    
    if (detailBooking?.id === booking.id) {
      setDetailBooking(updatedBooking);
    }
    
    sendToServer({ action: 'UPDATE', ...updatedBooking });
    
    alert(`정상적으로 ${newVal} 처리되었습니다.`);
  };

  const filteredCustomers = useMemo(() => bookings.filter(b => b.customer.includes(searchQuery) || b.phone.includes(searchQuery)).sort((a,b) => (a.bookDate || '9').localeCompare(b.bookDate || '9')), [bookings, searchQuery]);

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-[32px] p-10 shadow-2xl text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-6 shadow-lg shadow-blue-100">잇</div>
          <h2 className="text-xl font-black text-slate-800 mb-2">이끌림 에어컨케어</h2>
          <p className="text-sm text-slate-400 font-bold mb-8 italic">Clean & Care Solution</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="비밀번호 입력"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-bold outline-none focus:border-blue-500 transition-all" autoFocus />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-95 transition-all">접속하기</button>
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
          <div><h1 className="text-xl font-black leading-none">이끌림 에어컨</h1><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Manager Mode</p></div>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
      </header>

      {role === 'admin' && (
        <div className="max-w-[1920px] mx-auto px-4 mt-6">
          <div className="flex bg-slate-200/50 p-1 rounded-[22px] w-fit gap-1 shadow-inner">
            {(['home', 'list', 'settings'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-[18px] text-sm font-black transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{tab === 'home' ? '대시보드' : tab === 'list' ? '예약목록' : '설정'}</button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-[1920px] mx-auto p-4">
        {activeTab === 'home' && (
          <div className="space-y-4">
            <CalendarView bookings={bookings} onDetail={setDetailBooking} />
            {/* 요약 뷰에 전달되는 데이터를 '완료' 건으로만 필터링하도록 수정됨 */}
            {role === 'admin' && <SummaryView bookings={bookings.filter(b => b.paid === '완료')} />}
            {role === 'engineer' && (
              <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center gap-3">
                <CalendarIcon className="text-blue-500" size={18} />
                <p className="text-xs text-slate-500 font-bold">날짜 선택 후 하단 목록에서 상세 정보를 확인하세요.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'list' && role === 'admin' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="고객명, 연락처 검색..." className="flex-1 px-5 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 shadow-sm" />
              <button onClick={() => { setEditingBooking(null); setShowFormModal(true); }} className="bg-blue-600 text-white px-6 rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-95">추가</button>
            </div>
            <BookingList bookings={bookings} onEdit={(b) => { setEditingBooking(b); setShowFormModal(true); }} onDelete={handleDelete} onTogglePaid={handleTogglePaid} onDetail={setDetailBooking} />
          </div>
        )}

        {activeTab === 'settings' && role === 'admin' && (
           <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-4">
              <h3 className="font-black text-slate-800 mb-2">데이터 백업</h3>
              <button onClick={() => downloadCSV('에어컨_백업.csv', [], bookings)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 flex justify-between items-center active:bg-slate-100"><span>CSV 백업 내보내기</span><Download size={18}/></button>
           </div>
        )}
      </main>

      {/* 상세 정보 모달 */}
      <DetailModal 
        booking={detailBooking} 
        onClose={() => setDetailBooking(null)} 
        onEdit={role === 'admin' ? (b) => { setEditingBooking(b); setDetailBooking(null); setShowFormModal(true); } : undefined} 
        onDelete={role === 'admin' ? handleDelete : undefined}      
        onTogglePaid={handleTogglePaid}
      />

      {/* 등록/수정 모달 */}
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
