import React, { useState, useMemo } from 'react';
import { Booking } from '../types';
import { ChevronLeft, ChevronRight, Calculator, Users, Building2, Receipt } from 'lucide-react';

interface Props {
  bookings: Booking[];
}

// 금액 문자열("160,000")을 덧셈 가능한 실제 숫자(160000)로 변환해주는 필수 함수
const parseNumber = (val: any) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;
};

const MonthlySettlementView: React.FC<Props> = ({ bookings }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 월 이동 핸들러
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

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

  // 1. 전체 합계 계산 (오류 수정됨)
  const totalSummary = useMemo(() => {
    let totalRevenue = 0;
    let totalFee = 0;
    let totalNet = 0;

    monthlyBookings.forEach(b => {
      totalRevenue += parseNumber(b.priceTotal);
      totalFee += parseNumber(b.fee);
      totalNet += parseNumber(b.net) + parseNumber(b.net2);
    });

    return { totalRevenue, totalFee, totalNet, count: monthlyBookings.length };
  }, [monthlyBookings]);

  // 2. 기사별 정산 계산 & 상세 리스트 데이터 (새로 추가됨)
  const engineerStats = useMemo(() => {
    const stats: Record<string, { count: number; net: number; jobs: any[] }> = {};
    
    monthlyBookings.forEach(b => {
      const n1 = parseNumber(b.net);
      const n2 = parseNumber(b.net2);
      const pTotal = parseNumber(b.priceTotal);

      // 기사 1 데이터 수집
      if (b.engineer) {
        if (!stats[b.engineer]) stats[b.engineer] = { count: 0, net: 0, jobs: [] };
        stats[b.engineer].count += 1;
        stats[b.engineer].net += n1;
        stats[b.engineer].jobs.push({
          date: b.bookDate,
          customer: b.customer,
          type: b.type,
          priceTotal: pTotal,
          myNet: n1,
          isCoop: !!b.engineer2 // 기사2가 있으면 2인 1조
        });
      }
      // 기사 2 데이터 수집
      if (b.engineer2) {
        if (!stats[b.engineer2]) stats[b.engineer2] = { count: 0, net: 0, jobs: [] };
        stats[b.engineer2].count += 1;
        stats[b.engineer2].net += n2;
        stats[b.engineer2].jobs.push({
          date: b.bookDate,
          customer: b.customer,
          type: b.type,
          priceTotal: pTotal,
          myNet: n2,
          isCoop: true
        });
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
      stats[contractorName].total += parseNumber(b.priceTotal);
      stats[contractorName].fee += parseNumber(b.fee);
    });

    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [monthlyBookings]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 상단 월 선택 컨트롤 */}
      <div className="bg-white rounded-3xl shadow-sm border p-4 flex items-center justify-between">
        <button onClick={handlePrevMonth} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-600 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-slate-800">
          {year}년 {month}월 정산 내역
        </h2>
        <button onClick={handleNextMonth} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-600 transition-colors">
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
        {/* 요약 테이블: 기사별 */}
        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
          <div className="bg-slate-50 border-b px-6 py-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-blue-600" />
              기사별 합계 요약
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
                {engineerStats.length > 0 ? engineerStats.map((stat, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors border-b last:border-0">
                    <td className="px-6 py-4 font-bold text-slate-700">{stat.name}</td>
                    <td className="px-6 py-4 text-slate-600 text-right">{stat.count}건</td>
                    <td className="px-6 py-4 font-black text-blue-600 text-right">{stat.net.toLocaleString()}원</td>
                  </tr>
                )) : <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-bold">정산 내역이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* 요약 테이블: 도급업체별 */}
        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
          <div className="bg-slate-50 border-b px-6 py-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Building2 size={20} className="text-orange-500" />
              도급업체별 합계 요약
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
                {contractorStats.length > 0 ? contractorStats.map((stat, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors border-b last:border-0">
                    <td className="px-6 py-4 font-bold text-slate-700">{stat.name}</td>
                    <td className="px-6 py-4 text-slate-600 text-right">{stat.count}건</td>
                    <td className="px-6 py-4 font-bold text-orange-600 text-right">{stat.fee.toLocaleString()}원</td>
                    <td className="px-6 py-4 font-black text-slate-800 text-right">{stat.total.toLocaleString()}원</td>
                  </tr>
                )) : <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold">정산 내역이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- 새로 추가된 영역: 기사별 월별 정산 상세 리스트 --- */}
      <div className="mt-12 space-y-4">
        <h3 className="text-xl font-black text-slate-800 ml-2 flex items-center gap-2">
          <Receipt size={24} className="text-slate-700" />
          기사별 월별 상세 정산 내역
        </h3>
        
        {engineerStats.length > 0 ? engineerStats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-3xl shadow-sm border overflow-hidden mb-6">
            {/* 기사 이름 및 최종 금액 헤더 */}
            <div className="bg-blue-50/50 border-b px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md">
                  {stat.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-800">{stat.name} 기사님</h4>
                  <p className="text-sm font-bold text-slate-500 mt-0.5">이번 달 총 <span className="text-blue-600">{stat.count}건</span> 작업 완료</p>
                </div>
              </div>
              <div className="text-right w-full sm:w-auto bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-100">
                <p className="text-xs font-bold text-slate-400 mb-1">최종 지급해야 할 정산액</p>
                <p className="text-2xl font-black text-blue-600">{stat.net.toLocaleString()}원</p>
              </div>
            </div>
            
            {/* 상세 내역 테이블 */}
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500">
                    <th className="px-6 py-3.5 font-bold border-b whitespace-nowrap">작업일자</th>
                    <th className="px-6 py-3.5 font-bold border-b">고객명</th>
                    <th className="px-6 py-3.5 font-bold border-b">작업내역</th>
                    <th className="px-6 py-3.5 font-bold border-b text-right whitespace-nowrap">결제 총금액</th>
                    <th className="px-6 py-3.5 font-bold border-b text-right text-blue-600 whitespace-nowrap">배당 정산액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stat.jobs.sort((a,b) => a.date.localeCompare(b.date)).map((job, jIdx) => (
                    <tr key={jIdx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">{job.date}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                        {job.customer}
                        {job.isCoop && <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full font-bold">2인1조</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{job.type}</td>
                      <td className="px-6 py-4 text-slate-400 text-right font-medium">{job.priceTotal.toLocaleString()}</td>
                      <td className="px-6 py-4 font-black text-slate-700 text-right">{job.myNet.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )) : (
          <div className="bg-white rounded-3xl shadow-sm border p-12 text-center text-slate-400 font-bold">
            이번 달 상세 정산 내역이 없습니다.
          </div>
        )}
      </div>

    </div>
  );
};

export default MonthlySettlementView;
