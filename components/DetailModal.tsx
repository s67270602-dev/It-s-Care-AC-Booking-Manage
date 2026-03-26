import React, { useState } from 'react';
import { Booking } from '../types';
import { calcFinancials, formatMoney, loadSmsTemplate, DEFAULT_SMS_TEMPLATE } from '../services/utils';
import { X, Phone, MessageCircle, Edit, Trash, CreditCard, CheckCircle, MapPin, FileSignature } from 'lucide-react';
import ConsentModal from './ConsentModal'; // 동의서 모달 임포트 추가

interface Props {
  booking: Booking | null;
  onClose: () => void;
  onEdit: (booking: Booking) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (booking: Booking) => void;
}

const DetailModal: React.FC<Props> = ({ booking, onClose, onEdit, onDelete, onTogglePaid }) => {
  // 모달 제어를 위한 상태 추가
  const [showConsent, setShowConsent] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);

  if (!booking) return null;

  const { total, fee, net, rate } = calcFinancials(booking);
  
  // 24시간제 시간을 12시간제로 변환하는 함수 추가
  const formatTime12 = (timeStr?: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    if (!h || !m) return timeStr;
    let hour = parseInt(h, 10);
    if (hour > 12) hour -= 12;
    else if (hour === 0) hour = 12;
    return `${hour}:${m}`;
  };
  
  const handleSms = () => {
    const tpl = loadSmsTemplate();
    const body = `[예약 정보]
고객: ${booking.customer}
일정: ${booking.bookDate} (${booking.ampm} ${formatTime12(booking.bookTime)})
주소: ${booking.address}

${tpl}`;
    
    // Simple detection for iOS vs Android for separator
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const separator = isIOS ? '&' : '?';
    
    window.location.href = `sms:${booking.phone}${separator}body=${encodeURIComponent(body)}`;
  };

  // T맵 실행 함수 추가
  const handleTmap = (address: string) => {
    if (!address) return;
    // T맵 검색결과로 바로 이동하는 URL 스킴
    const tmapUrl = `tmap://search?name=${encodeURIComponent(address)}`;
    window.location.href = tmapUrl;
  };

  // 서명 저장 처리 함수 추가
  const handleSaveSignature = async (signatureBase64: string, isDisagree: boolean) => {
    setIsSavingSignature(true);
    try {
      const payload = {
        action: 'SAVE_SIGNATURE',
        bookingId: booking.id, // 현재 예약 ID 사용
        customerName: booking.customer,
        phone: booking.phone, // ★ 이 부분이 반드시 있어야 구글 시트에 기록됩니다!
        isDisagree: isDisagree,
        imageStr: signatureBase64.split(',')[1] // 'data:image/png;base64,' 부분 제거
      };

      // App.tsx와 동일한 웹앱 URL 사용 (자신의 URL로 교체 필요)
      const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz2Q6UXI_zu3qv4oy9CljlDYRnIA6-OqKHMUgpW6ZqXFuhZsIiIQpkbwBglzTiwFudJ/exec";
      
      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if(data.result === 'success') {
          alert('서명이 성공적으로 저장되었습니다. (새로고침을 하면 반영됩니다)');
          setShowConsent(false);
      } else {
          alert('저장 실패: ' + data.message);
      }
    } catch (error) {
      alert('서명 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSavingSignature(false);
    }
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
            <InfoRow label="예약일시" value={`${booking.bookDate} ${booking.ampm} ${formatTime12(booking.bookTime)}`} highlight />
            <InfoRow label="결제상태" value={booking.paid} highlight={booking.paid === '완료'} />
            <InfoRow label="연락처" value={booking.phone} />
            
            {/* T맵 연동 클릭 버튼으로 변경된 주소 부분 */}
            <div 
              onClick={() => handleTmap(booking.address)}
              className="flex flex-col gap-0.5 p-3 bg-blue-50/50 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors active:scale-95 group"
              title="T맵으로 길찾기"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">주소 (T맵 실행)</span>
                <MapPin size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-sm font-bold text-blue-700 break-all underline underline-offset-2">{booking.address || '-'}</span>
            </div>

            <InfoRow label="모델/종류" value={`${booking.model || '-'} / ${booking.type}`} />
            <InfoRow label="대수/범위" value={`${booking.qty}대 / ${booking.scope}`} />
            <InfoRow label="총금액" value={formatMoney(total)} />
            <InfoRow label="결제방식" value={booking.payMethod} />
            
            {/* 💡 기사 1 정보 (구글 시트의 값 booking.net을 바로 불러오도록 수정!) */}
            <InfoRow label="업체 / 기사 1" value={`${booking.contractor} / ${booking.engineer || '-'}`} />
            <InfoRow label="기사 1 정산액" value={`${formatMoney(booking.net)}원`} highlight />
            
            {/* 💡 기사 2 정보 (입력된 경우에만 표시, 구글 시트의 값 booking.net2를 불러오도록 수정!) */}
            {booking.engineer2 && (
              <>
                <InfoRow label="기사 2" value={booking.engineer2} />
                <InfoRow label="기사 2 정산액" value={`${formatMoney(booking.net2)}원`} highlight />
              </>
            )}

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

             {/* 추가된 버튼: 세척동의서 서명받기 (미리보기 화면에서 바로 받을 수 있도록) */}
             <button 
               onClick={() => setShowConsent(true)} 
               className="col-span-2 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors active:scale-95 shadow-sm"
             >
               <FileSignature size={18} /> 세척동의서 서명받기
             </button>

             <button onClick={() => onTogglePaid(booking)} className={`col-span-2 py-3 rounded-xl font-bold border transition-colors flex items-center justify-center gap-2 ${booking.paid === '완료' ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'}`}>
               {booking.paid === '완료' ? <><CreditCard size={18} /> 미수금으로 변경</> : <><CheckCircle size={18} /> 결제완료 처리</>}
             </button>
             
             {/* 세척 동의서 서명 확인 (서명 링크가 있을 때만 렌더링) */}
             {booking.signatureUrl && (
               <a 
                 href={booking.signatureUrl} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="col-span-2 py-3 mt-1 rounded-xl font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
               >
                 <FileSignature size={18} /> 
                 {booking.isDisagree ? '세척 미동의서 보기' : '세척 동의 서명 보기'}
               </a>
             )}
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

      {/* 동의서 모달 렌더링 (showConsent가 true일 때만 보임) */}
      {showConsent && (
        <ConsentModal 
          onClose={() => setShowConsent(false)} 
          onSaveSignature={handleSaveSignature} 
        />
      )}
      
      {/* 서명 저장 중 로딩 오버레이 */}
      {isSavingSignature && (
        <div className="fixed inset-0 z-[60] bg-white/80 flex items-center justify-center font-black text-blue-600 animate-pulse">
          서명을 구글 드라이브에 저장 중입니다...
        </div>
      )}
    </div>
  );
};

export default DetailModal;
