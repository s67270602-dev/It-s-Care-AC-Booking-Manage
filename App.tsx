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

const App: React.FC = () => {
  // --- 권한 및 보안 설정 ---
  const [role, setRole] = useState<Role>(null);
  const [passwordInput, setPasswordInput] = useState('');
  
  const ADMIN_PASS = "081607"; // 관리자 비밀번호
  const ENGINEER_PASS = "7672"; // 기사님 비밀번호

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASS) {
      setRole('admin');
    } else if (passwordInput === ENGINEER_PASS) {
      setRole('engineer');
    } else {
      alert("비밀번호가 올바르지 않습니다.");
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    if(window.confirm("로그아웃 하시겠습니까?")) {
      setRole(null);
      setPasswordInput('');
    }
  };
  // -------------------------

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => {
    setBookings(loadBookings());
  }, []);

  // 기사님 모드일 때는 대시보드(캘린더) 탭으로 고정
  useEffect(() => {
    if (role === 'engineer') setActiveTab('home');
  }, [role]);

  const handleSave = (data: any) => {
    let updated: Booking[];
    if (data.id) {
      updated = bookings.map(b => b.id === data.id ? { ...b, ...data } as Booking : b);
    } else {
      const newBooking: Booking = { ...data, id: Date.now().toString(), createdAt: Date.now() };
      updated = [...bookings, newBooking];
    }
    setBookings(updated);
    saveBookings(updated);
    setEditingBooking(null);
    setShowFormModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      const updated = bookings.filter(b => b.id !== id);
      setBookings(updated);
      saveBookings(updated);
      setDetailBooking(null);
    }
  };

  const handleTogglePaid = (booking: Booking) => {
    const updated = bookings.map(b => b.id === booking.id ? { ...b, paid: b.paid === '완료' ? '미완료' : '완료' } : b);
    setBookings(updated);
    saveBookings(updated);
  };

  const handleEditRequest = (booking: Booking) => {
    setEditingBooking(booking);
    setDetailBooking(null);
    setShowFormModal(true);
  };

  // --- 1. 로그인 화면 ---
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full max-w-sm rounded-[32px] p-10 shadow-2xl border border-slate-200 text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-6 shadow-lg shadow-blue-100">잇</div>
          <h2 className="text-xl font-black text-slate-800 mb-2">이끌림 잇츠케어</h2>
          <p className="text-sm text-slate-400 font-bold mb-8">접속 비밀번호를 입력하세요</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              placeholder="Password"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-bold outline-none focus:border-blue-500 transition-all" 
              autoFocus 
            />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-95 transition-all">로그인</button>
          </form>
          <p className="mt-6 text-[10px] text-slate-300 font-medium">관리자 및 기사용 전용 시스템</p>
        </div>
      </div>
    );
  }

  // --- 2. 메인 프로그램 레이아웃 ---
  return (
    <>
      <div className="lg:hidden bg-slate-50 min-h-screen pb-20">
        {/* 모바일 헤더 */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex justify-between items-center shadow-sm">
          <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">It's Care</span>
            <span>{role === 'admin' ? '에어컨 관리자' : '기사님 스케줄'}</span>
          </h1>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 active:scale-90 transition-all"><LogOut size={20} /></button>
        </div>

        {/* 탭 메뉴 (관리자만 노출) */}
        {role === 'admin' && (
          <div className="px-4 py-3 bg-white border-b">
            <div className="bg-slate-100 p-1.5 rounded-xl flex text-sm font-bold text-slate-500 shadow-inner">
              <button onClick={() => setActiveTab('home')} className={`flex-1 py-2.5 rounded-lg transition-all ${activeTab === 'home' ? 'bg-white text-blue-600 shadow-sm' : ''}`}>대시보드</button>
              <button onClick={() => setActiveTab('list')} className={`flex-1 py-2.5 rounded-lg transition-all ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : ''}`}>예약관리</button>
              <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2.5 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : ''}`}>설정</button>
            </div>
          </div>
        )}

        {/* 모바일 메인 콘텐츠 */}
        <main className="p-4 space-y-4 animate-fade-in">
          {activeTab === 'home' && (
            <div className="space-y-4">
              <CalendarView bookings={bookings} onDetail={setDetailBooking} />
              {role === 'admin' && <SummaryView bookings={bookings} />}
              
              {role === 'engineer' && (
                <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <p className="text-xs text-slate-500 font-bold flex items-center gap-2 leading-relaxed">
                    <CalendarIcon size={16} className="text-blue-500" /> 
                    달력에서 날짜를 선택하신 후, 하단에 나타나는 예약 목록을 클릭하면 상세 주소와 연락처를 확인하실 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'list' && role === 'admin' && (
            <div className="relative min-h-[70vh]">
              <BookingList bookings={bookings} onEdit={handleEditRequest} onDelete={handleDelete} onTogglePaid={handleTogglePaid} onDetail={setDetailBooking} />
              <button onClick={() => { setEditingBooking(null); setShowFormModal(true); }} className="fixed bottom-6 right-5 bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-200 z-40 active:scale-90 transition-transform"><Plus size={28} strokeWidth={3} /></button>
            </div>
          )}

          {activeTab === 'settings' && role === 'admin' && (
             <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h3 className="font-bold text-slate-800 mb-2">데이터 관리</h3>
                <button onClick={() => downloadCSV('에어컨_백업.csv', [], bookings)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 flex items-center justify-between active:bg-slate-100 transition-colors"><span>CSV 내보내기</span><Download size={18}/></button>
                <button onClick={() => { if(window.confirm('모든 데이터를 초기화하시겠습니까?')) setBookings([]); }} className="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center justify-between active:bg-red-100 transition-colors"><span>전체 데이터 삭제</span><Trash2 size={18}/></button>
             </div>
          )}
        </main>
      </div>

      {/* 데스크탑 레이아웃 (관리자 전용) */}
      <div className="hidden lg:block max-w-[1900px] mx-auto p-8 font-sans">
        {role === 'admin' ? (
          <>
            <header className="mb-10 flex justify-between items-end">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-4xl font-black text-slate-800 tracking-tight">에어컨 통합 관리 시스템</h1>
                  <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold">Admin Mode</span>
                </div>
                <p className="text-slate-400 font-medium">실시간 예약 현황 및 고객 데이터를 관리합니다.</p>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all active:scale-95 shadow-lg shadow-slate-200"><LogOut size={16} /> 로그아웃</button>
            </header>
            
            <div className="grid grid-cols-[450px_1fr] gap-8 items-start">
              <BookingForm initialData={editingBooking} onSave={handleSave} onCancelEdit={() => setEditingCustomerId(null)} />
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
          <div className="flex flex-col items-center justify-center min-h-[90vh] text-center">
             <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 mb-6"><CalendarIcon size={40} /></div>
             <h2 className="text-2xl font-black text-slate-800 mb-2">기사님 모드로 접속되었습니다.</h2>
             <p className="text-slate-400 font-medium mb-8">기사님용 화면은 모바일 환경에 최적화되어 있습니다.<br/>스마트폰에서 접속해 주세요.</p>
             <button onClick={handleLogout} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all">시스템 로그아웃</button>
          </div>
        )}
      </div>

      {/* 모바일 전용 등록/수정 모달 */}
      {showFormModal && role === 'admin' && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden flex flex-col animate-slide-up">
           <div className="px-4 py-4 border-b flex items-center gap-3 bg-white sticky top-0 z-10 shadow-sm">
             <button onClick={() => setShowFormModal(false)} className="p-2 -ml-2 text-slate-400"><ChevronLeft size={28} /></button>
             <h2 className="text-xl font-black text-slate-800">{editingBooking ? '예약 수정' : '새 예약 추가'}</h2>
           </div>
           <div className="flex-1 overflow-y-auto p-4 pb-12">
             <BookingForm initialData={editingBooking} onSave={handleSave} onCancelEdit={() => setShowFormModal(false)} />
           </div>
        </div>
      )}

      {/* 공통 상세 정보 모달 */}
      <DetailModal 
        booking={detailBooking} 
        onClose={() => setDetailBooking(null)} 
        // 권한에 따른 버튼 노출 제어
        onEdit={role === 'admin' ? handleEditRequest : undefined} 
        onDelete={role === 'admin' ? handleDelete : undefined}     
        onTogglePaid={role === 'admin' ? handleTogglePaid : undefined}
      />
    </>
  );
};

export default App;
