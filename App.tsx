import React, { useState, useEffect } from 'react';
import { Booking } from './types';
import { loadBookings, saveBookings, downloadCSV, parseCSV, calcFinancials } from './services/utils';
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import CalendarView from './components/CalendarView';
import SummaryView from './components/SummaryView';
import DetailModal from './components/DetailModal';
import { Download, Upload, Trash2, Plus, ChevronLeft } from 'lucide-react';

type Tab = 'home' | 'list' | 'settings';

const App: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  
  // Mobile specific states
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => {
    setBookings(loadBookings());
  }, []);

  const handleSave = (data: Omit<Booking, 'id' | 'createdAt'> & { id?: string }) => {
    let updated: Booking[];
    if (data.id) {
      // Edit
      updated = bookings.map(b => b.id === data.id ? { ...b, ...data } as Booking : b);
      setEditingBooking(null);
      if (detailBooking?.id === data.id) {
        setDetailBooking({ ...detailBooking, ...data } as Booking);
      }
    } else {
      // Create
      const newBooking: Booking = {
        ...data,
        id: Date.now().toString(),
        createdAt: Date.now()
      };
      updated = [...bookings, newBooking];
    }
    setBookings(updated);
    saveBookings(updated);
    
    // Close form on mobile/modal
    setShowFormModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      const updated = bookings.filter(b => b.id !== id);
      setBookings(updated);
      saveBookings(updated);
      setDetailBooking(null);
      if (editingBooking?.id === id) setEditingBooking(null);
    }
  };

  const handleTogglePaid = (booking: Booking) => {
    const updated: Booking[] = bookings.map(b => 
      b.id === booking.id ? { ...b, paid: b.paid === '완료' ? '미완료' : '완료' } : b
    );
    setBookings(updated);
    saveBookings(updated);
    if (detailBooking?.id === booking.id) {
      setDetailBooking({ ...detailBooking, paid: booking.paid === '완료' ? '미완료' : '완료' });
    }
  };

  const handleEditRequest = (booking: Booking) => {
    setEditingBooking(booking);
    setDetailBooking(null);
    setShowFormModal(true); // Open form modal/screen on mobile
    
    // On desktop, we might want to scroll to top
    if (window.innerWidth >= 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddNew = () => {
    setEditingBooking(null);
    setShowFormModal(true);
  };

  // --- Import/Export Logic ---
  const handleExportAll = () => {
    if (bookings.length === 0) return alert('데이터가 없습니다.');
    const headers = [
      "고객명","연락처","주소","업종","모델","종류","대수","범위",
      "예약일","시간","담당기사","도급업체","수수료율","총금액","수수료","정산금액","결제","비고"
    ];
    const rows = bookings.map(b => {
      const { total, fee, net } = calcFinancials(b);
      return {
        "고객명": b.customer,
        "연락처": b.phone,
        "주소": b.address,
        "업종": b.group,
        "모델": b.model,
        "종류": b.type,
        "대수": b.qty,
        "범위": b.scope,
        "예약일": b.bookDate,
        "시간": `${b.ampm} ${b.bookTime}`,
        "담당기사": b.engineer,
        "도급업체": b.contractor,
        "수수료율": b.commissionRate,
        "총금액": total,
        "수수료": fee,
        "정산금액": net,
        "결제": b.paid,
        "비고": b.memo.replace(/\n/g, " ")
      };
    });
    
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${now.getDate()}`;
    downloadCSV(`전체예약_${ts}.csv`, headers, rows);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) return alert('유효하지 않은 CSV 파일입니다.');
    
    const headers = rows[0];
    const newBookings: Booking[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 5) continue; 
      
      const val = (h: string) => {
        const idx = headers.findIndex(head => head.includes(h));
        return idx !== -1 ? row[idx] : '';
      };
      
      if (!val('고객명') || !val('연락처')) continue;

      newBookings.push({
        id: Date.now().toString() + i,
        createdAt: Date.now(),
        customer: val('고객명'),
        phone: val('연락처'),
        address: val('주소'),
        group: val('업종'),
        model: val('모델'),
        type: val('종류') || '벽걸이',
        qty: parseInt(val('대수')) || 1,
        scope: val('범위') || '실내기',
        bookDate: val('예약일'),
        bookTime: val('시간').replace(/오전|오후/g, '').trim(),
        ampm: val('시간').includes('오후') ? '오후' : '오전',
        engineer: val('담당기사'),
        contractor: val('도급업체') || '자체건',
        commissionRate: val('수수료율'),
        priceTotal: val('총금액'),
        payMethod: '카드', 
        paid: val('결제') === '완료' ? '완료' : '미완료',
        memo: val('비고')
      });
    }

    if (newBookings.length > 0 && window.confirm(`${newBookings.length}건을 가져오시겠습니까? (기존 데이터 유지)`)) {
      const merged = [...bookings, ...newBookings];
      setBookings(merged);
      saveBookings(merged);
    }
    e.target.value = '';
  };

  const handleClearAll = () => {
    if (window.confirm('모든 데이터를 삭제하시겠습니까? 복구할 수 없습니다.')) {
      setBookings([]);
      saveBookings([]);
    }
  };

  // --- Mobile Header with Segmented Control ---

  const MobileTopNav = () => (
    <div className="lg:hidden sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
      <div className="px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">It's Care</span>
          <span>에어컨청소 관리</span>
        </h1>
      </div>
      
      {/* Segmented Control Menu */}
      <div className="px-4 pb-3">
        <div className="bg-slate-100 p-1.5 rounded-xl flex text-sm font-bold text-slate-500 shadow-inner">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex-1 py-2.5 rounded-lg transition-all duration-300 ease-out z-10 text-center ${
              activeTab === 'home' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-100' 
                : 'text-slate-500 hover:bg-slate-200/60 active:scale-95'
            }`}
          >
            대시보드
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2.5 rounded-lg transition-all duration-300 ease-out z-10 text-center ${
              activeTab === 'list' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-100' 
                : 'text-slate-500 hover:bg-slate-200/60 active:scale-95'
            }`}
          >
            예약 관리
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2.5 rounded-lg transition-all duration-300 ease-out z-10 text-center ${
              activeTab === 'settings' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-100' 
                : 'text-slate-500 hover:bg-slate-200/60 active:scale-95'
            }`}
          >
            설정
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP LAYOUT (>= 1024px) */}
      <div className="hidden lg:block max-w-[1900px] mx-auto p-8">
        <header className="mb-8 flex flex-row items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <h1 className="text-3xl font-black text-slate-800 tracking-tight">에어컨청소 관리</h1>
               <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md shadow-blue-200">이끌림잇츠케어</span>
            </div>
            <p className="text-slate-500 font-medium">상담 · 예약 · 일정 · 정산 · 고객관리 시스템</p>
          </div>
          <div className="flex items-center gap-2">
             <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors shadow-sm">
               <Upload size={16} /> CSV 가져오기
               <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
             </label>
             <button onClick={handleExportAll} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
               <Download size={16} /> 전체 내보내기
             </button>
             <button onClick={handleClearAll} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
               <Trash2 size={16} />
             </button>
          </div>
        </header>

        <div className="grid grid-cols-[450px_1fr] gap-6 items-start">
          <div className="space-y-6">
            <BookingForm 
              initialData={editingBooking} 
              onSave={handleSave} 
              onCancelEdit={() => setEditingBooking(null)}
            />
          </div>
          <div className="space-y-6 flex flex-col h-full min-h-0">
            <BookingList 
              bookings={bookings} 
              onEdit={handleEditRequest} 
              onDelete={handleDelete}
              onTogglePaid={handleTogglePaid}
              onDetail={setDetailBooking}
            />
            <div className="grid grid-cols-2 gap-6">
              <CalendarView bookings={bookings} onDetail={setDetailBooking} />
              <SummaryView bookings={bookings} />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT (< 1024px) */}
      <div className="lg:hidden bg-slate-50 min-h-screen">
        <MobileTopNav />
        
        {/* Tab 1: Home (Calendar & Summary) */}
        {activeTab === 'home' && (
          <div className="p-4 space-y-4 animate-fade-in pb-10">
            <CalendarView bookings={bookings} onDetail={setDetailBooking} />
            <SummaryView bookings={bookings} />
          </div>
        )}

        {/* Tab 2: List */}
        {activeTab === 'list' && (
          <div className="p-4 flex flex-col relative animate-fade-in pb-10 min-h-[calc(100vh-140px)]">
            <div className="flex-1 overflow-visible rounded-2xl shadow-sm">
              <BookingList 
                bookings={bookings} 
                onEdit={handleEditRequest} 
                onDelete={handleDelete}
                onTogglePaid={handleTogglePaid}
                onDetail={setDetailBooking}
              />
            </div>
            
            {/* FAB for Add New */}
            <button 
              onClick={handleAddNew}
              className="fixed bottom-6 right-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-lg shadow-blue-300 active:scale-95 transition-transform z-40 flex items-center justify-center hover:brightness-110"
              title="새 예약 추가"
            >
              <Plus size={28} strokeWidth={3} />
            </button>
          </div>
        )}

        {/* Tab 3: Settings */}
        {activeTab === 'settings' && (
          <div className="p-4 space-y-4 animate-fade-in pb-10">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-6">
               <h3 className="font-bold text-slate-800">데이터 관리</h3>
               <div className="grid grid-cols-1 gap-3">
                 <button onClick={handleExportAll} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 active:bg-slate-100">
                   <span className="flex items-center gap-2"><Download size={18} /> 전체 데이터 CSV 내보내기</span>
                 </button>
                 
                 <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 active:bg-slate-100 cursor-pointer">
                   <span className="flex items-center gap-2"><Upload size={18} /> CSV 데이터 불러오기</span>
                   <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
                 </label>

                 <button onClick={handleClearAll} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100 font-bold text-red-600 active:bg-red-100 mt-4">
                   <span className="flex items-center gap-2"><Trash2 size={18} /> 모든 데이터 초기화</span>
                 </button>
               </div>
               <p className="text-xs text-slate-400 text-center pt-4">
                 데이터는 브라우저에 안전하게 저장됩니다. <br/>
                 주기적으로 CSV 백업을 권장합니다.
               </p>
             </div>
          </div>
        )}
      </div>

      {/* Form Modal (Mobile Fullscreen / Desktop hidden logic handled above) */}
      {(showFormModal) && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden flex flex-col animate-slide-up">
           <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white/90 backdrop-blur-md sticky top-0 z-10">
             <button onClick={() => setShowFormModal(false)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full">
               <ChevronLeft size={24} />
             </button>
             <h2 className="text-lg font-black text-slate-800">{editingBooking ? '예약 수정' : '새 예약 추가'}</h2>
           </div>
           <div className="flex-1 overflow-y-auto p-4 pb-10">
             <BookingForm 
               initialData={editingBooking} 
               onSave={handleSave} 
               onCancelEdit={() => setShowFormModal(false)}
             />
           </div>
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal 
        booking={detailBooking}
        onClose={() => setDetailBooking(null)}
        onEdit={handleEditRequest}
        onDelete={handleDelete}
        onTogglePaid={handleTogglePaid}
      />
    </>
  );
};

export default App;