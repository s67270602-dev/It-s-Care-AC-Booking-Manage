import React, { useState, useMemo } from 'react';
import { Booking } from '../types';
import { ChevronLeft, ChevronRight, Calculator, Users, Building2 } from 'lucide-react';

interface Props {
  bookings: Booking[];
}

const MonthlySettlementView: React.FC<Props> = ({ bookings }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 월 이동 핸들러
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthString = `${year}-${String(month).padStart(2, '0')}`;

  // 이번 달 '결제 완료'된 예약만 필터링 (정산 기준)
  const monthlyBookings = useMemo(() => {
    return bookings.filter(b => 
      b.bookDate && 
      b.bookDate.startsWith(monthString) && 
      b.paid === '완료'
    );
  }, [bookings, monthString]);

  // 1. 전체 합계 계산
  const totalSummary = useMemo(() => {
    let totalRevenue = 0;
    let totalFee = 0;
    let totalNet = 0;

    monthlyBookings.forEach(b => {
      totalRevenue += (b.priceTotal || 0);
      totalFee += (b.fee || 0);
      totalNet += (b.net || 0) + (b.net2 || 0);
    });

    return { totalRevenue, totalFee, totalNet, count: monthlyBookings.length };
  }, [monthlyBookings]);

  // 2. 기사별 정산 계산 (기사1, 기사2 모두 합산)
  const engineerStats = useMemo(() => {
    const stats: Record<string, { count: number; net: number }> = {};
    
    monthlyBookings.forEach(b => {
      // 기사 1 정산
      if (b.engineer) {
        if (!stats[b.engineer]) stats[b.engineer] = { count: 0, net: 0 };
        stats[b.engineer].count += 1;
        stats[b.engineer].net += (b.net || 0);
      }
      // 기사 2 정산
      if (b.engineer2) {
        if (!stats[b.engineer2]) stats[b.engineer2] = { count: 0, net: 0 };
        stats[b.engineer2].count += 1;
        stats[b.engineer2].net += (b.net2 || 0);
      }
    });

    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.net - a.net);
  }, [monthlyBookings]);

  // 3. 도급업체별 정산 계산
  const contractorStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number; fee: number }> = {};
    
    monthlyBookings.forEach(b => {
      const contractorName = b.contractor || '자체 오더 (업체없음)';
      if (!stats[contractorName]) stats[contractorName] = { count: 0, total: 0, fee: 0 };
      
      stats[contractorName].count += 1;
      stats[contractorName].total += (b.priceTotal || 0);
      stats[contractorName].fee += (b.fee || 0);
    });

    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [monthlyBookings]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 상단 월 선택 컨트롤 */}
      <div className="bg-white rounded-3xl shadow-sm border p-4 flex items-center justify-between">
        <button 
          onClick={handlePrevMonth} 
          className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-600 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-slate-800">
          {year}년 {month}월 정산 내역
        </h2>
        <button 
          onClick={handleNextMonth} 
          className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-600 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* 전체 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl shadow-sm border p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <Calculator size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">총 매출 (완료 {totalSummary.count}건)</p>
            <p className="text-2xl font-black text-slate-800">{totalSummary.totalRevenue.toLocaleString()}원</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">기사 정산금 합계</p>
            <p className="text-2xl font-black text-slate-800">{totalSummary.totalNet.toLocaleString()}원</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
            <Building2 size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">도급 수수료 합계</p>
            <p className="text-2xl font-black text-slate-800">{totalSummary.totalFee.toLocaleString()}원</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기사별 정산 테이블 */}
        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
          <div className="bg-slate-50 border-b px-6 py-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-blue-600" />
              기사별 월별 정산내역
            </h3>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-sm">
                  <th className="px-6 py-4 font-bold border-b">기사명</th>
                  <th className="px-6 py-4 font-bold border-b text-right">참여 건수</th>
                  <th className="px-6 py-4 font-bold border-b text-right">정산액</th>
                </tr>
              </thead>
              <tbody>
                {engineerStats.length > 0 ? (
                  engineerStats.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors border-b last:border-0">
                      <td className="px-6 py-4 font-bold text-slate-700">{stat.name}</td>
                      <td className="px-6 py-4 text-slate-600 text-right">{stat.count}건</td>
                      <td className="px-6 py-4 font-black text-blue-600 text-right">{stat.net.toLocaleString()}원</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-bold">
                      정산 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 도급업체별 정산 테이블 */}
        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
          <div className="bg-slate-50 border-b px-6 py-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Building2 size={20} className="text-orange-500" />
              도급업체별 월별 정산내역
            </h3>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-sm">
                  <th className="px-6 py-4 font-bold border-b">업체명</th>
                  <th className="px-6 py-4 font-bold border-b text-right">건수</th>
                  <th className="px-6 py-4 font-bold border-b text-right">수수료 합계</th>
                  <th className="px-6 py-4 font-bold border-b text-right">발생 총매출</th>
                </tr>
              </thead>
              <tbody>
                {contractorStats.length > 0 ? (
                  contractorStats.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors border-b last:border-0">
                      <td className="px-6 py-4 font-bold text-slate-700">{stat.name}</td>
                      <td className="px-6 py-4 text-slate-600 text-right">{stat.count}건</td>
                      <td className="px-6 py-4 font-bold text-orange-600 text-right">{stat.fee.toLocaleString()}원</td>
                      <td className="px-6 py-4 font-black text-slate-800 text-right">{stat.total.toLocaleString()}원</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold">
                      정산 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlySettlementView;
