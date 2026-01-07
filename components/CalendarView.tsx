import React, { useState, useMemo } from 'react';
import { Booking } from '../types';
import { formatDate, calcFinancials, isToday } from '../services/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  bookings: Booking[];
  onDetail: (booking: Booking) => void;
}

const CalendarView: React.FC<Props> = ({ bookings, onDetail }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));

  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days = [];
    // Empty cells for start padding
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [year, month]);

  const getEventsForDay = (date: Date) => {
    const dStr = formatDate(date);
    return bookings.filter(b => b.bookDate === dStr);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          📅 월간 캘린더
        </h2>
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-full border border-slate-200">
          <button onClick={handlePrev} className="p-1 hover:bg-white hover:shadow rounded-full transition-all text-slate-600">
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-slate-700 w-24 text-center text-sm">
            {year}년 {month + 1}월
          </span>
          <button onClick={handleNext} className="p-1 hover:bg-white hover:shadow rounded-full transition-all text-slate-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
          <div key={day} className={`text-center text-xs font-bold py-2 ${idx === 0 ? 'text-red-500' : 'text-slate-500'}`}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 lg:gap-2 auto-rows-[minmax(80px,auto)]">
        {calendarData.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="bg-transparent" />;
          
          const events = getEventsForDay(date);
          const isTodayCell = isToday(formatDate(date));

          return (
            <div 
              key={date.toISOString()} 
              className={`border border-slate-100 rounded-lg p-1 lg:p-2 flex flex-col gap-1 transition-colors min-h-[80px] ${
                isTodayCell ? 'bg-blue-50/50 border-blue-200' : 'bg-white'
              }`}
            >
              <div className={`text-xs font-bold mb-1 ${
                date.getDay() === 0 ? 'text-red-500' : 
                date.getDay() === 6 ? 'text-blue-500' : 'text-slate-700'
              }`}>
                {date.getDate()}
              </div>
              
              <div className="flex flex-col gap-1">
                {events.map(ev => {
                  return (
                    <div 
                      key={ev.id}
                      onClick={() => onDetail(ev)}
                      className={`text-[10px] lg:text-xs px-1.5 py-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity border-l-2 shadow-sm ${
                        ev.paid === '완료' 
                          ? 'bg-slate-100 text-slate-500 border-slate-300 line-through decoration-slate-400 opacity-70' 
                          : 'bg-orange-50 text-orange-800 border-orange-400'
                      }`}
                    >
                       <span className={ev.paid === '완료' ? 'no-underline inline-block mr-1' : 'font-bold'}>{ev.bookTime || '-'}</span>
                       {ev.customer}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-xs text-slate-500 flex gap-4 justify-end">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> 미수금</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300"></span> 완료(취소선)</span>
      </div>
    </div>
  );
};

export default CalendarView;