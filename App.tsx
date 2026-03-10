import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Booking } from './types';
import { loadBookings, saveBookings, downloadCSV, parseCSV, calcFinancials } from './services/utils';
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import CalendarView from './components/CalendarView';
import SummaryView from './components/SummaryView';
import DetailModal from './components/DetailModal';
import { Download, Upload, Trash2, Plus, ChevronLeft, LogOut, Calendar as CalendarIcon } from 'lucide-react';

type Tab = 'home' | 'list' | 'settings';
type Role = 'admin' | 'engineer' | null;

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz2Q6UXI_zu3qv4oy9CljlDYRnIA6-OqKHMUgpW6ZqXFuhZsIiIQpkbwBglzTiwFudJ/exec";

const App: React.FC = () => {
  const [role, setRole] = useState<Role>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const ADMIN_PASS = "081607";
  const ENGINEER_PASS = "7672";

  // 1. 서버 데이터 불러오기 (시트 이미지 순서대로 인덱스 수정)
  useEffect(() => {
    if (!role) return;
    const loadFromServer = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        const mapped: Booking[] = (data.bookings || []).map((row: any, index: number) => ({
          id: String(index), // 시트에 ID가 없으므로 순번을 ID로 임시 사용
          customer: row[0],  // A열: 고객명
          phone: row[1],     // B열: 연락처
          address: row[2],   // C열: 주소
          group: row[3],     // D열: 업종
          model: row[4],     // E열: 모델
          type: row[5],      // F열: 종류
          qty: Number(row[6]), // G열: 대수
          scope: row[7],     // H열: 범위
          bookDate: row[8],  // I열: 예약일
          ampm: row[9].split(' ')[0] || '오전', // J열: 시간(오전/오후 분리)
          bookTime: row[9].split(' ')[1] || '',
          engineer: row[10], // K열: 담당기사
          contractor: row[11], // L열: 도급업체
          commissionRate: row[12], // M열: 수수료율
          priceTotal: row[13], // N열: 총금액
          paid: row[16],     // Q열: 결제
          memo: row[17],     // R열: 비고
          createdAt: Date.now()
        }));
        setBookings(mapped);
      } catch (e) { console.error("데이터 로드 실패", e); }
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
    if (passwordInput === ADMIN_PASS) { setRole('admin'); }
    else if (passwordInput === ENGINEER_PASS) { setRole('engineer'); }
    else { alert("비밀번호 오류"); setPasswordInput(''); }
  };

  const handleLogout = () => { if(window.confirm("로그아웃 하시겠습니까?")) { setRole(null); setPasswordInput(''); } };

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => { if (role === 'engineer') setActiveTab('home'); }, [role]);

  const handleSave = (data: any) => {
    if (data.id && bookings.some(b => b.id === data.id)) {
      setBookings(bookings.map(b => b.id === data.id ? { ...b, ...data } : b));
      sendToServer({ action: 'UPDATE', ...data });
    } else {
      const newBooking = { ...data, id: Date.now().toString(), createdAt: Date.now() };
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

  const handleTogglePaid = (booking: Booking) => {
    const newVal = booking.paid === '완료' ? '미완료' : '완료';
    setBookings(bookings.map(b => b.id === booking.id ? { ...b, paid: newVal } : b));
    sendToServer({ action: 'UPDATE', ...booking, paid: newVal });
  };

  const handleEditRequest = (booking: Booking) => {
    setEditingBooking(booking);
    setDetailBooking(null);
    setShowFormModal(true);
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-[32px] p-10 shadow-2xl text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-6 shadow-lg shadow-blue-100">잇</div>
          <h2 className="text-xl font-black text-slate-800 mb-2">이끌림 잇츠케어</h2>
          <p className="text-sm text-slate-400 font-bold mb-8">접속 비밀번호를 입력하세요</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Password"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-bold outline-none focus:border-blue-500" autoFocus />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-95 transition-all">로그인</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="lg:hidden bg-slate-50 min-h-screen pb-20 font-sans">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex justify-between items-center shadow-sm">
          <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">It's Care</span>
            <span>{role === 'admin' ? '에어컨 관리자' : '기사님 스케줄'}</span>
          </h1>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500"><LogOut size={20} /></button>
        </div>

        {role === 'admin' && (
          <div className="px-4 py-3 bg-white border-b">
            <div className="bg-slate-100 p-1 rounded-xl flex text-sm font-bold text-slate-500 shadow-inner">
              <button onClick={() => setActiveTab('home')} className={`flex-1 py-2.5 rounded-lg ${activeTab === 'home' ? 'bg-white text-blue-600 shadow-sm' : ''}`}>대시보드</button>
              <button onClick={() => setActiveTab('list')} className={`flex-1 py-2.5 rounded-lg ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : ''}`}>예약관리</button>
              <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2.5 rounded-lg ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : ''}`}>설정</button>
            </div>
          </div>
        )}

        <main className="p-4 space-y-4 animate-fade-in">
          {activeTab === 'home' && (
            <div className="space-y-4">
              <CalendarView bookings={bookings} onDetail={setDetailBooking} />
              {role === 'admin' && <SummaryView bookings={bookings} />}
              {role === 'engineer' && (
                <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <p className="text-xs text-slate-500 font-bold flex items-center gap-2 leading-relaxed">
                    <CalendarIcon size={16} className="text-blue-500" /> 달력에서 날짜를 선택하여 상세 정보를 확인하세요.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'list' && role === 'admin' && (
            <div className="relative min-h-[70vh]">
              <BookingList bookings={bookings} onEdit={handleEditRequest} onDelete={handleDelete} onTogglePaid={handleTogglePaid} onDetail={setDetailBooking} />
              <button onClick={() => { setEditingBooking(null); setShowFormModal(true); }} className="fixed bottom-6 right-5 bg-blue-600 text-white p-4 rounded-full shadow-xl z-40 active:scale-90 transition-transform"><Plus size={28} strokeWidth={3} /></button>
            </div>
          )}

          {activeTab === 'settings' && role === 'admin' && (
             <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h3 className="font-bold text-slate-800 mb-2">데이터 관리</h3>
                <button onClick={() => downloadCSV('에어컨_백업.csv', [], bookings)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 flex justify-between items-center active:bg-slate-100 transition-colors"><span>CSV 내보내기</span><Download size={18}/></button>
                <button onClick={() => { if(window.confirm('모든 데이터를 삭제하시겠습니까?')) setBookings([]); }} className="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-bold flex justify-between items-center active:bg-red-100 transition-colors"><span>전체 데이터 삭제</span><Trash2 size={18}/></button>
             </div>
          )}
        </main>
      </div>

      <div className="hidden lg:block max-w-[1900px] mx-auto p-8 font-sans text-center mt-20">
         <h2 className="text-2xl font-black text-slate-800">에어컨 관리 프로그램은 모바일 화면에 최적화되어 있습니다.</h2>
         <p className="text-slate-400 mt-4 font-bold">브라우저 창을 좁히거나 스마트폰으로 접속해 주세요.</p>
         <button onClick={handleLogout} className="mt-8 px-8 py-3 bg-slate-800 text-white rounded-2xl font-black">로그아웃</button>
      </div>

      {showFormModal && role === 'admin' && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden flex flex-col animate-slide-up">
           <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-3 bg-white sticky top-0 z-10 shadow-sm">
             <button onClick={() => setShowFormModal(false)} className="p-2 -ml-2 text-slate-400"><ChevronLeft size={28} /></button>
             <h2 className="text-xl font-black text-slate-800">{editingBooking ? '예약 수정' : '새 예약 추가'}</h2>
           </div>
           <div className="flex-1 overflow-y-auto p-4 pb-12"><BookingForm initialData={editingBooking} onSave={handleSave} onCancelEdit={() => setShowFormModal(false)} /></div>
        </div>
      )}

      <DetailModal 
        booking={detailBooking} 
        onClose={() => setDetailBooking(null)} 
        onEdit={role === 'admin' ? handleEditRequest : undefined} 
        onDelete={role === 'admin' ? handleDelete : undefined}     
        onTogglePaid={role === 'admin' ? handleTogglePaid : undefined}
      />
    </>
  );
};

export default App;
