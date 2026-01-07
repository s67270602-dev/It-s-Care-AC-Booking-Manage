import React from 'react';
import { Booking } from '../types';
import { calcFinancials, formatMoney, loadSmsTemplate, DEFAULT_SMS_TEMPLATE } from '../services/utils';
import { X, Phone, MessageCircle, Edit, Trash, CreditCard, CheckCircle } from 'lucide-react';

interface Props {
  booking: Booking | null;
  onClose: () => void;
  onEdit: (booking: Booking) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (booking: Booking) => void;
}

const DetailModal: React.FC<Props> = ({ booking, onClose, onEdit, onDelete, onTogglePaid }) => {
  if (!booking) return null;

  const { total, fee, net, rate } = calcFinancials(booking);
  
  const handleSms = () => {
    const tpl = loadSmsTemplate();
    const body = `[예약 정보]
고객: ${booking.customer}
일정: ${booking.bookDate} (${booking.ampm} ${booking.bookTime || ''})
주소: ${booking.address}

${tpl}`;
    
    // Simple detection for iOS vs Android for separator
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const separator = isIOS ? '&' : '?';
    
    window.location.href = `sms:${booking.phone}${separator}body=${encodeURIComponent(body)}`;
  };

  const InfoRow = ({ label, value, highlight = false }: any) => (
    <div className="flex flex-col gap-0.5 p-3 bg-slate-50 rounded-lg border border-slate-100">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold break-all ${highlight ? 'text-blue-600' : 'text-slate-800'}`}>{value || '-'}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-800">{booking.customer}</h2>
            <p className="text-xs text-slate-500 font-medium">상세 예약 정보</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <InfoRow label="예약일시" value={`${booking.bookDate} ${booking.ampm} ${booking.bookTime || ''}`} highlight />
            <InfoRow label="결제상태" value={booking.paid} highlight={booking.paid === '완료'} />
            <InfoRow label="연락처" value={booking.phone} />
            <InfoRow label="주소" value={booking.address} />
            <InfoRow label="모델/종류" value={`${booking.model || '-'} / ${booking.type}`} />
            <InfoRow label="대수/범위" value={`${booking.qty}대 / ${booking.scope}`} />
            <InfoRow label="총금액" value={formatMoney(total)} />
            <InfoRow label="결제방식" value={booking.payMethod} />
            <InfoRow label="업체/기사" value={`${booking.contractor} / ${booking.engineer || '-'}`} />
            <InfoRow label="정산(수수료)" value={`${net !== null ? formatMoney(net) : '미확정'} (${rate ?? '?'}%)`} highlight />
            <div className="col-span-2">
              <InfoRow label="비고" value={booking.memo} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <button onClick={handleSms} className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
               <MessageCircle size={18} /> 문자발송
             </button>
             <a href={`tel:${booking.phone}`} className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
               <Phone size={18} /> 전화걸기
             </a>
             <button onClick={() => onTogglePaid(booking)} className={`col-span-2 py-3 rounded-xl font-bold border transition-colors flex items-center justify-center gap-2 ${booking.paid === '완료' ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'}`}>
               {booking.paid === '완료' ? <><CreditCard size={18} /> 미수금으로 변경</> : <><CheckCircle size={18} /> 결제완료 처리</>}
             </button>
          </div>

          <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100 justify-end">
             <button onClick={() => onEdit(booking)} className="text-slate-500 hover:text-blue-600 text-sm font-bold flex items-center gap-1">
               <Edit size={16} /> 수정
             </button>
             <button onClick={() => onDelete(booking.id)} className="text-slate-500 hover:text-red-600 text-sm font-bold flex items-center gap-1">
               <Trash size={16} /> 삭제
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
