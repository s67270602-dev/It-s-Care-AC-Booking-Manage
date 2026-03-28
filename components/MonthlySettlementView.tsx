import React, { useState, useMemo } from 'react';
import { Booking } from '../types';
import { calcFinancials } from '../services/utils';
import { ChevronLeft, ChevronRight, Calculator, Users, Building2, Receipt, X, Copy, Download } from 'lucide-react';

interface Props {
  bookings: Booking[];
}

// 금액 문자열을 숫자로 변환
const parseNumber = (val: any) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;
};

const MonthlySettlementView: React.FC<Props> = ({ bookings }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  // 선택된 기사의 상세 정보를 담을 상태 (팝업용)
  const [selectedEngineer, setSelectedEngineer] = useState<any | null>(null);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthString = `${year}-${String(month).padStart(2, '0')}`;

  const monthlyBookings = useMemo(() => {
    return bookings.filter(b => b.bookDate && b.bookDate.startsWith(monthString) && b.paid === '완료');
  }, [bookings, monthString]);

  const totalSummary = useMemo(() => {
    let totalRevenue = 0; let totalFee = 0; let totalNet = 0;

    monthlyBookings.forEach(b => {
      const pTotal = parseNumber(b.priceTotal);
      const pFee = parseNumber(b.fee);
      let n1 = parseNumber(b.net);
      let n2 = parseNumber(b.net2);
      const { net: calcNet } = calcFinancials(b);

      if (!b.engineer2 && n1 === 0) {
          n1 = calcNet !== null && calcNet !== undefined ? calcNet : (pTotal - pFee);
      }

      totalRevenue += pTotal;
      totalFee += pFee;
      totalNet += (n1 + n2);
    });

    return { totalRevenue, totalFee, totalNet, count: monthlyBookings.length };
  }, [monthlyBookings]);

  const engineerStats = useMemo(() => {
    const stats: Record<string, { count: number; net: number; jobs: any[] }> = {};
    
    monthlyBookings.forEach(b => {
      const pTotal = parseNumber(b.priceTotal);
      const pFee = parseNumber(b.fee);
      let n1 = parseNumber(b.net);
      let n2 = parseNumber(b.net2);
      const { net: calcNet } = calcFinancials(b);

      if (!b.engineer2 && n1 === 0) {
          n1 = calcNet !== null && calcNet !== undefined ? calcNet : (pTotal - pFee);
      }

      if (b.engineer) {
        if (!stats[b.engineer]) stats[b.engineer] = { count: 0, net: 0, jobs: [] };
        stats[b.engineer].count += 1;
        stats[b.engineer].net += n1;
        stats[b.engineer].jobs.push({ date: b.bookDate, customer: b.customer, type: b.type, priceTotal: pTotal, myNet: n1, isCoop: !!b.engineer2 });
      }
      
      if (b.engineer2) {
        if (!stats[b.engineer2]) stats[b.engineer2] = { count: 0, net: 0, jobs: [] };
        stats[b.engineer2].count += 1;
        stats[b.engineer2].net += n2;
        stats[b.engineer2].jobs.push({ date: b.bookDate, customer: b.customer, type: b.type, priceTotal: pTotal, myNet: n2, isCoop: true });
      }
    });

    return Object.entries(stats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.net - a.net);
  }, [monthlyBookings]);

  const contractorStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number; fee: number }> = {};
    monthlyBookings.forEach(b => {
      const contractorName = b.contractor || '자체 오더 (업체없음)';
      if (!stats[contractorName]) stats[contractorName] = { count: 0, total: 0, fee: 0 };
      stats[contractorName].count += 1;
      stats[contractorName].total += parseNumber(b.priceTotal);
      stats[contractorName].fee += parseNumber(b.fee);
    });
    return Object.entries(stats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
  }, [monthlyBookings]);

  // 카카오톡 전송용 텍스트 복사 기능
  const handleCopyText = (engineer: any) => {
    let text = `[${month}월 이끌림 에어컨 정산내역]\n\n`;
    text += `기사명: ${engineer.name} 기사님\n`;
    text += `작업건수: 총 ${engineer.count}건\n`;
    text += `총 정산액: ${engineer.net.toLocaleString()}원\n\n`;
    text += `[상세 작업 내역]\n`;
    
    engineer.jobs.sort((a:any, b:any) => a.date.localeCompare(b.date)).forEach((job: any) => {
      text += `- ${job.date} | ${job.customer} | ${job.type} | ${job.myNet.toLocaleString()}원\n`;
    });
    
    text += `\n이번 달도 수고 많으셨습니다!`;

    navigator.clipboard.writeText(text).then(() => {
      alert('정산내역이 복사되었습니다. 카카오톡 창에 "붙여넣기" 하시면 됩니다!');
    }).catch(() => {
      alert('복사에 실패했습니다. 기기의 권한을 확인해주세요.');
    });
  };

  // 엑셀(CSV) 다운로드 기능
  const handleDownloadCSV = (engineer: any) => {
    let csv = '\uFEFF작업일자,고객명,작업내역,결제총금액,배당정산액\n';
    engineer.jobs.sort((a:any, b:any) => a.date.localeCompare(b.date)).forEach((job: any) => {
      csv += `${job.date},${job.customer},${job.type},${job.priceTotal},${job.myNet}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('url');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${year}년_${month}월_${engineer.name}_정산내역.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="bg-white rounded-3xl shadow-sm border p-4 flex items-center justify-between">
        <button onClick={handlePrevMonth} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-600 transition-colors"><ChevronLeft size={24} /></button>
        <h2 className="text-2xl font-black text-slate-800">{year}년 {month}월 정산 내역</h2>
        <button onClick={handleNextMonth} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-600 transition-colors"><ChevronRight size={24} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl shadow-sm border p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center"><Calculator size={28} /></div>
          <div><p className="text-sm font-bold text-slate-500 mb-1">총 매출 (완료 {totalSummary.count}건)</p><p className="text-2xl font-black text-slate-800">{totalSummary.totalRevenue.toLocaleString()}원</p></div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center"><Users size={28} /></div>
          <div><p className="text-sm font-bold text-slate-500 mb-1">기사 정산금 합계</p><p className="text-2xl font-black text-slate-800">{totalSummary.totalNet.toLocaleString()}원</p></div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center"><Building2 size={28} /></div>
          <div><p className="text-sm font-bold text-slate-500 mb-1">도급 수수료 합계</p><p className="text-2xl font-black text-slate-800">{totalSummary.totalFee.toLocaleString()}원</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
          <div className="bg-slate-50 border-b px-6 py-4"><h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users size={20} className="text-blue-600" />기사별 합계 요약</h3></div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50/50 text-slate-500 text-sm"><th className="px-6 py-4 font-bold border-b">기사명</th><th className="px-6 py-4 font-bold border-b text-right">참여 건수</th><th className="px-6 py-4 font-bold border-b text-right">정산액</th></tr></thead>
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

        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
          <div className="bg-slate-50 border-b px-6 py-4"><h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Building2 size={20} className="text-orange-500" />도급업체별 합계 요약</h3></div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50/50 text-slate-500 text-sm"><th className="px-6 py-4 font-bold border-b">업체명</th><th className="px-6 py-4 font-bold border-b text-right">건수</th><th className="px-6 py-4 font-bold border-b text-right">수수료 합계</th><th className="px-6 py-4 font-bold border-b text-right">발생 총매출</th></tr></thead>
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

      {/* --- 기사별 카드 뷰 (클릭 시 팝업) --- */}
      <div className="mt-12 space-y-4">
        <h3 className="text-xl font-black text-slate-800 ml-2 flex items-center gap-2">
          <Receipt size={24} className="text-slate-700" />
          상세 정산 내역 확인 (터치하세요)
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {engineerStats.length > 0 ? engineerStats.map((stat, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedEngineer(stat)}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl transition-colors">
                  {stat.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800">{stat.name}</h4>
                  <p className="text-sm font-bold text-slate-400">{stat.count}건 완료</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-blue-600">{stat.net.toLocaleString()}</p>
                <p className="text-xs text-slate-400">원</p>
              </div>
            </div>
          )) : (
            <div className="col-span-full bg-white rounded-3xl shadow-sm border p-12 text-center text-slate-400 font-bold">
              이번 달 상세 정산 내역이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* --- 상세 내역 팝업 모달 --- */}
      {selectedEngineer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
            
            {/* 모달 헤더 */}
            <div className="bg-blue-50/50 border-b px-6 py-5 flex items-start justify-between relative">
              <div>
                <h3 className="text-2xl font-black text-slate-800">{selectedEngineer.name} 기사님</h3>
                <p className="text-slate-500 font-medium mt-1">
                  {year}년 {month}월 총 정산액 : <span className="font-black text-blue-600">{selectedEngineer.net.toLocaleString()}원</span> ({selectedEngineer.count}건)
                </p>
              </div>
              <button onClick={() => setSelectedEngineer(null)} className="p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-800 border absolute top-5 right-5">
                <X size={20} />
              </button>
            </div>

            {/* 모달 내용 (스크롤 영역) */}
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
                  <tr className="text-slate-500">
                    <th className="px-5 py-3 font-bold whitespace-nowrap">일자/고객</th>
                    <th className="px-5 py-3 font-bold">내역</th>
                    <th className="px-5 py-3 font-bold text-right text-blue-600 whitespace-nowrap">정산액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedEngineer.jobs.sort((a:any, b:any) => a.date.localeCompare(b.date)).map((job:any, jIdx:number) => (
                    <tr key={jIdx} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="text-xs text-slate-400 font-mono mb-0.5">{job.date}</div>
                        <div className="font-bold text-slate-800">
                          {job.customer}
                          {job.isCoop && <span className="ml-1 text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-bold">2인1조</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 text-xs sm:text-sm">{job.type}</td>
                      <td className="px-5 py-4 font-black text-slate-800 text-right">{job.myNet.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모달 푸터 (액션 버튼) */}
            <div className="p-4 border-t bg-slate-50 flex gap-2">
              <button 
                onClick={() => handleCopyText(selectedEngineer)}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Copy size={18} /> 카톡용 내역 복사
              </button>
              <button 
                onClick={() => handleDownloadCSV(selectedEngineer)}
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Download size={18} /> 엑셀(CSV) 저장
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MonthlySettlementView;
