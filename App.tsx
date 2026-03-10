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

// ★★★ 사장님의 에어컨 전용 웹 앱 URL을 여기에 넣으세요 ★★★
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz2Q6UXI_zu3qv4oy9CljlDYRnIA6-OqKHMUgpW6ZqXFuhZsIiIQpkbwBglzTiwFudJ/exec";

const App: React.FC = () => {
  const [role, setRole] = useState<Role>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const ADMIN_PASS = "081607";
  const ENGINEER_PASS = "7672";

  // 1. 서버 데이터 불러오기
  useEffect(() => {
    if (!role) return; // 로그인 전에는 안 불러옴
    const loadFromServer = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        const mapped: Booking[] = (data.bookings || []).map((row: any) => ({
          id: String(row[1]),
          customer: row[2],
          phone: row[3],
          address: row[4],
          group: row[5],
          model: row[6],
          type: row[7],
          qty: Number(row[8]),
          scope: row[9],
          bookDate: row[10],
          ampm: row[11].split(' ')[0],
          bookTime: row[11].split(' ')[1] || '',
          engineer: row[12],
          contractor: row[13],
          commissionRate: row[14],
          priceTotal: row[15],
          paid: row[18],
          memo: row[19],
          createdAt: Date.now() // 임시
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

  const handleLogout = () => { if(window.confirm("로그아웃?")) { setRole(null); setPasswordInput(''); } };

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => { if (role === 'engineer') setActiveTab('home'); }, [role]);

  const handleSave = (data: any) => {
    let updated: Booking[];
    if (data.id) {
      updated = bookings.map(b => b.id === data.id ? { ...b, ...data } as Booking : b);
      sendToServer({ action: 'UPDATE', ...data });
    } else {
      const newBooking: Booking = { ...data, id: Date.now().toString(), createdAt: Date.now() };
      updated = [...bookings, newBooking];
      sendToServer({ action: 'ADD', ...newBooking });
    }
    setBookings(updated);
    setEditingBooking(null);
    setShowFormModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('정말 삭제?')) {
      setBookings(prev => prev.filter(b => b.id !== id));
      sendToServer({ action: 'DELETE', id });
      setDetailBooking(null);
    }
  };

  const handleTogglePaid = (booking: Booking) => {
    const newVal = booking.paid === '완료' ? '미완료' : '완료';
    const updated = bookings.map(b => b.id === booking.id ? { ...b, paid: newVal } : b);
    setBookings(updated);
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
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-6">잇</div>
          <h2 className="text-xl font-black mb-8">이끌림 에어컨 관리</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Password"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-bold outline-none focus:border-blue-500" autoFocus />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">로그인</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="lg:hidden bg-slate-50 min-h-screen pb-20">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b px-4 py-4 flex justify-between items-center shadow-sm">
          <h1 className="text-lg font-black flex items-center gap-2">
            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">It's Care</span>
            <span>{role === 'admin' ? '에어컨 관리자' : '기사님 스케줄'}</span>
          </h1>
          <button onClick={handleLogout} className="p-2 text-slate-400"><LogOut size={20} /></button>
        </div>

        {role === 'admin' && (
          <div className="px-4 py-3 bg-white border-b">
            <div className="bg-slate-100 p-1 rounded-xl flex text-sm font-bold text-slate-500">
              <button onClick={() => setActiveTab('home')} className={`flex-1 py-2.5 rounded-lg ${activeTab === 'home' ? 'bg-white text-blue-600 shadow-sm' : ''}`}>대시보드</button>
              <button onClick={() => setActiveTab('list')} className={`flex-1 py-2.5 rounded-lg ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : ''}`}>예약관리</button>
              <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2.5 rounded-lg ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : ''}`}>설정</button>
            </div>
          </div>
        )}

        <main className="p-4 space-y-4">
          {activeTab === 'home' && (
            <div className="space-y-4">
              <CalendarView bookings={bookings} onDetail={setDetailBooking} />
              {role === 'admin' && <SummaryView bookings={bookings} />}
              {role === 'engineer' && (
                <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <p className="text-xs text-slate-500 font-bold flex items-center gap-2">
                    <CalendarIcon size={16} className="text-blue-500" /> 날짜를 선택하여 상세 정보를 확인하세요.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'list' && role === 'admin' && (
            <div className="relative min-h-[70vh]">
              <BookingList bookings={bookings} onEdit={handleEditRequest} onDelete={handleDelete} onTogglePaid={handleTogglePaid} onDetail={setDetailBooking} />
              <button onClick={() => { setEditingBooking(null); setShowFormModal(true); }} className="fixed bottom-6 right-5 bg-blue-600 text-white p-4 rounded-full shadow-xl z-40"><Plus size={28} strokeWidth={3} /></button>
            </div>
          )}

          {activeTab === 'settings' && role === 'admin' && (
             <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-4">
                <h3 className="font-bold mb-2">데이터 관리</h3>
                <button onClick={() => downloadCSV('에어컨_백업.csv', [], bookings)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 flex justify-between items-center"><span>CSV 백업 내보내기</span><Download size={18}/></button>
                <button onClick={() => { if(window.confirm('초기화?')) setBookings([]); }} className="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-bold flex justify-between items-center"><span>데이터 초기화</span><Trash2 size={18}/></button>
             </div>
          )}
        </main>
      </div>

      <div className="hidden lg:block max-w-[1900px] mx-auto p-8">
        {role === 'admin' ? (
          <>
            <header className="mb-10 flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-black text-slate-800">에어컨 통합 관리 시스템</h1>
                <p className="text-slate-400 font-medium">관리자 전용 클라우드 모드</p>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold active:scale-95 transition-all"><LogOut size={16} /> 로그아웃</button>
            </header>
            <div className="grid grid-cols-[450px_1fr] gap-8 items-start">
              <BookingForm initialData={editingBooking} onSave={handleSave} onCancelEdit={() => setEditingBooking(null)} />
              <div className="space-y-8">
                <BookingList bookings={bookings} onEdit={handleEditRequest} onDelete={handleDelete} onTogglePaid={handleTogglePaid} onDetail={setDetailBooking} />
                <div className="grid grid-cols-2 gap-8">
                  <CalendarView bookings={bookings} onDetail={setDetailBooking} />
                  <SummaryView bookings={bookings} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[90vh]">
             <h2 className="text-2xl font-black mb-4">기사님 모드는 모바일에서 최적화되어 있습니다.</h2>
             <button onClick={handleLogout} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-black shadow-lg">로그아웃</button>
          </div>
        )}
      </div>

      {showFormModal && role === 'admin' && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden flex flex-col animate-slide-up">
           <div className="px-4 py-4 border-b flex items-center gap-3 bg-white sticky top-0 z-10">
             <button onClick={() => setShowFormModal(false)} className="p-2"><ChevronLeft size={28} /></button>
             <h2 className="text-xl font-black">{editingBooking ? '예약 수정' : '새 예약 추가'}</h2>
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
