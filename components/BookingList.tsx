import React, { useMemo, useState } from 'react';
import { Booking, FilterType, SortType } from '../types';
import { calcFinancials, formatMoney, isToday, isTomorrow, isThisMonth, formatDate } from '../services/utils';
import { Search, Filter, ArrowUpDown, MoreVertical, Edit2, Trash2, CheckCircle, XCircle, Phone, MapPin } from 'lucide-react';

interface Props {
  bookings: Booking[];
  onEdit: (booking: Booking) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (booking: Booking) => void;
  onDetail: (booking: Booking) => void;
}

const BookingList: React.FC<Props> = ({ bookings, onEdit, onDelete, onTogglePaid, onDetail }) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('default');
  const [search, setSearch] = useState('');
  const [engFilter, setEngFilter] = useState('');
  const [contractorFilter, setContractorFilter] = useState('');

  // Extract unique options
  const engineers = useMemo(() => Array.from(new Set(bookings.map(b => b.engineer).filter(Boolean))).sort(), [bookings]);
  const contractors = useMemo(() => Array.from(new Set(bookings.map(b => b.contractor).filter(Boolean))).sort(), [bookings]);

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Filter
    if (filter === 'today') result = result.filter(b => isToday(b.bookDate));
    if (filter === 'tomorrow') result = result.filter(b => isTomorrow(b.bookDate));
    if (filter === 'month') result = result.filter(b => isThisMonth(b.bookDate));
    if (filter === 'due') result = result.filter(b => b.paid !== '완료');

    // Dropdown filters
    if (engFilter) result = result.filter(b => b.engineer === engFilter);
    if (contractorFilter) result = result.filter(b => b.contractor === contractorFilter);

    // Search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(b => 
        (b.customer + b.phone + b.address + b.engineer + b.model).toLowerCase().includes(lower)
      );
    }

    // Sort
    if (sort === 'date') {
      result.sort((a, b) => {
        const da = new Date(`${a.bookDate}T${a.bookTime || '00:00'}`);
        const db = new Date(`${b.bookDate}T${b.bookTime || '00:00'}`);
        return da.getTime() - db.getTime();
      });
    } else if (sort === 'name') {
      result.sort((a, b) => a.customer.localeCompare(b.customer));
    } else if (sort === 'net') {
      result.sort((a, b) => (calcFinancials(b).net || 0) - (calcFinancials(a).net || 0));
    } else {
      // Default: creation order reversed (newest first) or simply by id/index
      result.sort((a, b) => b.createdAt - a.createdAt);
    }

    return result;
  }, [bookings, filter, sort, search, engFilter, contractorFilter]);

  const FilterButton = ({ type, label }: { type: FilterType, label: string }) => (
    <button
      onClick={() => setFilter(type)}
      className={`px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
        filter === type 
          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' 
          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
        
        {/* Top Row: Counts & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-sm font-bold text-slate-700 whitespace-nowrap">
              총 <span className="text-blue-600 text-lg">{bookings.length}</span> 건
              <span className="text-slate-400 font-normal mx-2">|</span>
              표시 <span className="text-slate-800">{filteredBookings.length}</span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="검색 (이름, 전화, 주소...)" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col gap-3">
          <div className="flex bg-slate-100 p-1.5 rounded-xl gap-2 overflow-x-auto max-w-full pb-1.5 scrollbar-hide">
            <FilterButton type="all" label="전체" />
            <FilterButton type="tomorrow" label="내일" />
            <FilterButton type="today" label="오늘" />
            <FilterButton type="month" label="이번달" />
            <FilterButton type="due" label="미수금" />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1">
            <select 
              value={sort} 
              onChange={e => setSort(e.target.value as SortType)}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-blue-400 min-w-[80px]"
            >
              <option value="default">등록순</option>
              <option value="date">날짜순</option>
              <option value="name">이름순</option>
              <option value="net">정산액순</option>
            </select>

            <select 
              value={engFilter} 
              onChange={e => setEngFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-blue-400 min-w-[100px]"
            >
              <option value="">기사 전체</option>
              {engineers.map(e => <option key={e} value={e}>{e}</option>)}
            </select>

            <select 
              value={contractorFilter} 
              onChange={e => setContractorFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-blue-400 min-w-[100px]"
            >
              <option value="">업체 전체</option>
              {contractors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-slate-50 relative">
        {filteredBookings.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <Search size={48} className="mb-2 opacity-20" />
            <p>조건에 맞는 예약이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block w-full">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-slate-500 uppercase bg-slate-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-bold w-16">No</th>
                    <th className="px-4 py-3 font-bold">고객 / 그룹</th>
                    <th className="px-4 py-3 font-bold">일정</th>
                    <th className="px-4 py-3 font-bold">연락처 / 주소</th>
                    <th className="px-4 py-3 font-bold">내역</th>
                    <th className="px-4 py-3 font-bold text-right">금액</th>
                    <th className="px-4 py-3 font-bold text-center">상태</th>
                    <th className="px-4 py-3 font-bold">기사</th>
                    <th className="px-4 py-3 font-bold text-center w-24">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredBookings.map((item, idx) => {
                    const { total, net, fee } = calcFinancials(item);
                    return (
                      <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{filteredBookings.length - idx}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{item.customer}</div>
                          <div className="text-xs text-slate-500">{item.group || '-'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-slate-700">{item.bookDate}</div>
                          <div className="text-xs text-slate-500">{item.ampm} {item.bookTime || '미정'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700">{item.phone}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[150px]" title={item.address}>{item.address}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs">
                            <span className="font-bold text-blue-600">{item.type}</span> 
                            <span className="text-slate-400 mx-1">/</span> 
                            {item.qty}대
                          </div>
                          <div className="text-xs text-slate-500">{item.scope}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-bold text-slate-700">{formatMoney(total)}</div>
                          {/* [수정됨] 기사2가 있고 정산액이 있으면 분리해서 보여줌 */}
                          {item.engineer2 && (item.net2 || 0) > 0 ? (
                            <div className="text-xs text-indigo-600 mt-0.5">정산: {formatMoney(item.net || 0)} / {formatMoney(item.net2 || 0)}</div>
                          ) : net !== null ? (
                            <div className="text-xs text-indigo-600 mt-0.5">정산: {formatMoney(net)}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${
                            item.paid === '완료' 
                              ? 'bg-green-100 text-green-700 border-green-200' 
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}>
                            {item.paid === '완료' ? '결제완료' : '미수금'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {/* [수정됨] 기사2가 있으면 아래에 분리 표기 */}
                          <div className="font-medium text-slate-700">{item.engineer || '-'}</div>
                          {item.engineer2 && <div className="text-xs text-slate-400 mt-1">{item.engineer2}</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => onDetail(item)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="상세"><MoreVertical size={16} /></button>
                            <button onClick={() => onEdit(item)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="수정"><Edit2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-4 flex flex-col gap-4">
              {filteredBookings.map((item, idx) => {
                const { total, net, fee } = calcFinancials(item);
                return (
                  <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 active:scale-[0.99] transition-transform">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{filteredBookings.length - idx}</span>
                           <h3 className="font-black text-slate-900 text-xl">{item.customer}</h3>
                        </div>
                        <p className="text-sm font-medium text-slate-600">
                          {item.bookDate} <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded ml-1">{item.ampm} {item.bookTime || '미정'}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                         <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                            item.paid === '완료' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {item.paid === '완료' ? '결제완료' : '미수금'}
                         </span>
                         {/* [수정됨] 모바일에서도 기사1, 기사2 모두 표시되도록 수정 */}
                         <div className="flex gap-1">
                           {item.engineer && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{item.engineer}</span>}
                           {item.engineer2 && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{item.engineer2}</span>}
                         </div>
                      </div>
                    </div>
                    
                    {/* Divider */}
                    <div className="h-px bg-slate-100 w-full" />
                    
                    {/* Content */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2 text-slate-600">
                          <Phone size={14} /> {item.phone}
                        </span>
                        <span className="font-black text-lg text-slate-800 tracking-tight">{formatMoney(total)}원</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-slate-500">
                        <MapPin size={14} className="mt-0.5 shrink-0" />
                        <span className="break-keep">{item.address}</span>
                      </div>
                      <div className="mt-1 text-sm bg-slate-50 p-2 rounded-lg text-slate-700 border border-slate-100">
                        🧊 <span className="font-bold">{item.type}</span> <span className="text-slate-400">|</span> {item.qty}대 <span className="text-slate-400">|</span> {item.scope}
                      </div>
                    </div>

                    <button 
                      onClick={() => onDetail(item)}
                      className="mt-1 w-full py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
                    >
                      상세보기 / 관리
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingList;
