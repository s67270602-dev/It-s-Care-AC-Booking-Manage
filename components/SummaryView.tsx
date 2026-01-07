import React, { useState, useMemo } from 'react';
import { Booking } from '../types';
import { calcFinancials, formatMoney, downloadCSV } from '../services/utils';
import { Download, PieChart, Users, Briefcase, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface Props {
  bookings: Booking[];
}

const SummaryView: React.FC<Props> = ({ bookings }) => {
  const [monthStr, setMonthStr] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const handlePrevMonth = () => {
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m - 1 - 1, 1);
    setMonthStr(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m - 1 + 1, 1);
    setMonthStr(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const summary = useMemo(() => {
    const target = monthStr;
    const stats = {
      sales: 0,
      fee: 0,
      net: 0,
      unknown: 0,
      count: 0
    };
    
    const contractorMap = new Map<string, typeof stats>();
    const engineerMap = new Map<string, typeof stats>();

    const getOrInit = (map: Map<string, typeof stats>, key: string) => {
      if (!map.has(key)) map.set(key, { sales: 0, fee: 0, net: 0, unknown: 0, count: 0 });
      return map.get(key)!;
    };

    bookings.forEach(b => {
      if (!b.bookDate.startsWith(target)) return;
      
      const { total, fee, net } = calcFinancials(b);
      
      stats.count++;
      stats.sales += total;
      if (fee !== null && net !== null) {
        stats.fee += fee;
        stats.net += net;
      } else {
        stats.unknown++;
      }

      // Grouping
      const cKey = b.contractor || '미지정';
      const eKey = b.engineer || '미지정';
      
      [getOrInit(contractorMap, cKey), getOrInit(engineerMap, eKey)].forEach(obj => {
        obj.count++;
        obj.sales += total;
        if (fee !== null && net !== null) {
          obj.fee += fee;
          obj.net += net;
        } else {
          obj.unknown++;
        }
      });
    });

    return { 
      total: stats, 
      byContractor: Array.from(contractorMap.entries()).map(([k,v]) => ({key: k, ...v})),
      byEngineer: Array.from(engineerMap.entries()).map(([k,v]) => ({key: k, ...v}))
    };
  }, [bookings, monthStr]);

  const downloadGroupCSV = (type: 'contractor' | 'engineer') => {
    const data = type === 'contractor' ? summary.byContractor : summary.byEngineer;
    const label = type === 'contractor' ? '도급업체' : '담당기사';
    
    downloadCSV(`${monthStr}_${label}_요약.csv`, [label, '건수', '총매출', '수수료', '정산액', '미확정건'], 
      data.map(d => ({
        [label]: d.key,
        '건수': d.count,
        '총매출': d.sales,
        '수수료': d.fee,
        '정산액': d.net,
        '미확정건': d.unknown
      }))
    );
  };

  const StatCard = ({ label, value, subValue, color }: any) => (
    <div className={`bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-1 relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-full h-1 ${color}`}></div>
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="text-lg font-black text-slate-800">{value}</span>
      {subValue && <span className="text-xs text-slate-400">{subValue}</span>}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <PieChart size={20} className="text-purple-500" />
          월별 매출/정산 요약
        </h2>
        
        {/* Improved Date Picker UI */}
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-slate-700 transition-all active:scale-95"
            title="이전달"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="relative group">
            <input 
              type="month" 
              value={monthStr}
              onChange={e => setMonthStr(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
            <div className="px-4 py-1.5 font-black text-slate-700 text-base flex items-center gap-2 group-hover:bg-white/50 rounded-lg transition-colors">
              {monthStr.split('-')[0]}년 {monthStr.split('-')[1]}월 
              <Calendar size={16} className="text-slate-400 group-hover:text-blue-500" />
            </div>
          </div>

          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-slate-700 transition-all active:scale-95"
            title="다음달"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="총 매출" value={formatMoney(summary.total.sales)} color="bg-blue-500" />
        <StatCard label="정산 완료" value={formatMoney(summary.total.net)} color="bg-indigo-500" />
        <StatCard label="수수료 합계" value={formatMoney(summary.total.fee)} color="bg-orange-400" />
        <StatCard label="미확정 건" value={`${summary.total.unknown}건`} subValue="수수료율 미입력" color="bg-slate-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contractor Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2"><Briefcase size={16} /> 업체별 현황</h3>
            <button onClick={() => downloadGroupCSV('contractor')} className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-colors" title="CSV 다운로드">
              <Download size={16} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left p-2">업체</th>
                  <th className="p-2">건수</th>
                  <th className="p-2">정산액</th>
                </tr>
              </thead>
              <tbody>
                {summary.byContractor.map(d => (
                  <tr key={d.key} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="text-left p-2 font-bold text-slate-700">{d.key}</td>
                    <td className="p-2">{d.count}</td>
                    <td className="p-2 text-blue-600 font-bold">{formatMoney(d.net)}</td>
                  </tr>
                ))}
                {summary.byContractor.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400">데이터 없음</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Engineer Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2"><Users size={16} /> 기사별 현황</h3>
            <button onClick={() => downloadGroupCSV('engineer')} className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-colors" title="CSV 다운로드">
              <Download size={16} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left p-2">기사</th>
                  <th className="p-2">건수</th>
                  <th className="p-2">정산액</th>
                </tr>
              </thead>
              <tbody>
                {summary.byEngineer.map(d => (
                  <tr key={d.key} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="text-left p-2 font-bold text-slate-700">{d.key}</td>
                    <td className="p-2">{d.count}</td>
                    <td className="p-2 text-indigo-600 font-bold">{formatMoney(d.net)}</td>
                  </tr>
                ))}
                {summary.byEngineer.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400">데이터 없음</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryView;