import React, { useState, useEffect } from 'react';
import { Booking } from '../types';
import { loadSmsTemplate, saveSmsTemplate, DEFAULT_SMS_TEMPLATE } from '../services/utils';
import { Save, RefreshCw, MessageSquare } from 'lucide-react';

interface Props {
  initialData?: Booking | null;
  onSave: (booking: Omit<Booking, 'id' | 'createdAt'> & { id?: string }) => void;
  onCancelEdit: () => void;
}

const emptyFormState = {
  customer: '',
  phone: '',
  address: '',
  group: '',
  model: '',
  type: '벽걸이',
  qty: 1,
  scope: '실내기',
  priceTotal: '',
  bookDate: '',
  bookTime: '',
  ampm: '오전' as '오전' | '오후',
  engineer: '',
  contractor: '자체건',
  commissionRate: '0',
  payMethod: '카드',
  paid: '미완료' as '완료' | '미완료',
  memo: ''
};

const BookingForm: React.FC<Props> = ({ initialData, onSave, onCancelEdit }) => {
  const [formData, setFormData] = useState(emptyFormState);
  const [smsTemplate, setSmsTemplate] = useState(DEFAULT_SMS_TEMPLATE);

  useEffect(() => {
    if (initialData) {
      setFormData({
        customer: initialData.customer,
        phone: initialData.phone,
        address: initialData.address,
        group: initialData.group,
        model: initialData.model,
        type: initialData.type,
        qty: initialData.qty,
        scope: initialData.scope,
        priceTotal: initialData.priceTotal, // Assuming already formatted or string
        bookDate: initialData.bookDate,
        bookTime: initialData.bookTime,
        ampm: initialData.ampm,
        engineer: initialData.engineer,
        contractor: initialData.contractor,
        commissionRate: initialData.commissionRate,
        payMethod: initialData.payMethod,
        paid: initialData.paid,
        memo: initialData.memo
      });
    } else {
      setFormData(emptyFormState);
    }
  }, [initialData]);

  useEffect(() => {
    setSmsTemplate(loadSmsTemplate());
  }, []);

  const formatPhone = (value: string) => {
    const raw = value.replace(/[^0-9]/g, '');
    if (raw.length < 4) return raw;
    if (raw.length < 8) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
  };

  const formatCurrency = (value: string) => {
    const raw = value.replace(/[^0-9]/g, '');
    if (!raw) return '';
    return Number(raw).toLocaleString();
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    let finalValue = value;

    // Auto-format Phone
    if (field === 'phone') {
      finalValue = formatPhone(value);
    }
    // Auto-format Currency
    if (field === 'priceTotal') {
      finalValue = formatCurrency(value);
    }

    setFormData(prev => {
      const updated = { ...prev, [field]: finalValue };
      
      // Auto-set commission rate based on contractor if changed
      if (field === 'contractor') {
        if (value === '이끌림') updated.commissionRate = '30';
        else if (value === '자체건') updated.commissionRate = '0';
        else updated.commissionRate = ''; // Unknown for others
      }
      
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer || !formData.phone || !formData.bookDate) {
      alert("고객명, 연락처, 예약일은 필수입니다.");
      return;
    }
    
    onSave({
      ...formData,
      id: initialData?.id
    });
    
    if (!initialData) {
      // Reset only if adding new
      setFormData({ ...emptyFormState, bookDate: formData.bookDate }); // Keep date for convenience
    }
  };

  const handleSmsSave = () => {
    saveSmsTemplate(smsTemplate);
    alert('문자 내용이 저장되었습니다.');
  };

  const handleSmsReset = () => {
    if (window.confirm('기본 문구로 복원하시겠습니까?')) {
      setSmsTemplate(DEFAULT_SMS_TEMPLATE);
      saveSmsTemplate(DEFAULT_SMS_TEMPLATE);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-300 bg-white text-slate-900 p-3.5 text-base font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all";
  const selectClass = "w-full rounded-xl border border-slate-300 bg-white text-slate-900 p-3.5 text-base font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none";
  const labelClass = "text-sm font-bold text-slate-600 ml-1";

  return (
    <div className="flex flex-col gap-6">
      {/* Main Booking Form */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {initialData ? '예약 수정' : '새 예약 추가'}
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              {initialData ? `수정 중: ${initialData.customer}` : '고객 정보를 입력하세요'}
            </p>
          </div>
          <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm">
            자동 계산
          </span>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>고객명 *</label>
            <input
              required
              value={formData.customer}
              onChange={e => handleChange('customer', e.target.value)}
              placeholder="예) 홍길동 / OO매장"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>연락처 *</label>
            <input
              required
              type="tel"
              value={formData.phone}
              onChange={e => handleChange('phone', e.target.value)}
              placeholder="010-0000-0000"
              maxLength={13}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className={labelClass}>주소</label>
            <input
              value={formData.address}
              onChange={e => handleChange('address', e.target.value)}
              placeholder="상세 주소 입력"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>업종 / 그룹</label>
            <div className="relative">
              <select
                value={formData.group}
                onChange={e => handleChange('group', e.target.value)}
                className={selectClass}
              >
                <option value="">선택 안 함</option>
                <option value="가정집">가정집</option>
                <option value="카페">카페</option>
                <option value="식당">식당</option>
                <option value="병원">병원</option>
                <option value="호텔">호텔</option>
                <option value="학교">학교</option>
                <option value="공장/공단">공장/공단</option>
                <option value="사무실">사무실</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>모델명</label>
            <input
              value={formData.model}
              onChange={e => handleChange('model', e.target.value)}
              placeholder="예) 삼성 무풍"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>종류</label>
            <div className="relative">
              <select
                value={formData.type}
                onChange={e => handleChange('type', e.target.value)}
                className={selectClass}
              >
                <option value="벽걸이">벽걸이</option>
                <option value="스탠드">스탠드</option>
                <option value="스탠드스마트">스탠드스마트</option>
                <option value="업소용">업소용</option>
                <option value="2IN1">2IN1</option>
                <option value="2IN1스마트">2IN1스마트</option>
                <option value="천장형1way">천장형1way</option>
                <option value="천장형4way">천장형4way</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>대수</label>
            <input
              type="number"
              min="1"
              value={formData.qty}
              onChange={e => handleChange('qty', parseInt(e.target.value) || 1)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>범위</label>
            <div className="relative">
              <select
                value={formData.scope}
                onChange={e => handleChange('scope', e.target.value)}
                className={selectClass}
              >
                <option value="실내기">실내기</option>
                <option value="실외기">실외기</option>
                <option value="실내기+실외기">실내기+실외기</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>청소비용 (숫자만)</label>
            <input
              value={formData.priceTotal}
              onChange={e => handleChange('priceTotal', e.target.value)}
              placeholder="150,000"
              inputMode="numeric"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>예약일 *</label>
            <input
              type="date"
              required
              value={formData.bookDate}
              onChange={e => handleChange('bookDate', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>예약 시간</label>
            <div className="flex gap-2">
              <select
                value={formData.ampm}
                onChange={e => handleChange('ampm', e.target.value)}
                className={`${selectClass} w-28`}
              >
                <option value="오전">오전</option>
                <option value="오후">오후</option>
              </select>
              <input
                type="time"
                value={formData.bookTime}
                onChange={e => handleChange('bookTime', e.target.value)}
                className={`${inputClass} flex-1`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>담당 기사</label>
            <input
              value={formData.engineer}
              onChange={e => handleChange('engineer', e.target.value)}
              placeholder="예) 김기사"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>도급 업체</label>
            <div className="relative">
              <select
                value={formData.contractor}
                onChange={e => handleChange('contractor', e.target.value)}
                className={selectClass}
              >
                <option value="자체건">자체건</option>
                <option value="이끌림">이끌림</option>
                <option value="삼성전자">삼성전자</option>
                <option value="HS홈케어">HS홈케어</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>수수료율 (%)</label>
            <input
              value={formData.commissionRate}
              onChange={e => handleChange('commissionRate', e.target.value)}
              placeholder="예) 30"
              inputMode="numeric"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>결제 방식</label>
            <div className="relative">
              <select
                value={formData.payMethod}
                onChange={e => handleChange('payMethod', e.target.value)}
                className={selectClass}
              >
                <option value="카드">카드</option>
                <option value="현금">현금</option>
                <option value="이체">이체</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>결제 완료 여부</label>
            <div className="relative">
              <select
                value={formData.paid}
                onChange={e => handleChange('paid', e.target.value)}
                className={`w-full rounded-xl border p-3.5 text-base font-medium focus:outline-none transition-all appearance-none ${
                  formData.paid === '완료' 
                    ? 'border-green-300 text-green-700 bg-green-50 focus:border-green-500' 
                    : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                }`}
              >
                <option value="미완료">미완료</option>
                <option value="완료">완료</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className={labelClass}>비고</label>
            <textarea
              value={formData.memo}
              onChange={e => handleChange('memo', e.target.value)}
              placeholder="특이사항, 고객 요청사항 등"
              className={`${inputClass} h-32 resize-none`}
            />
          </div>

          <div className="md:col-span-2 flex flex-col md:flex-row gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base"
            >
              <Save size={20} />
              {initialData ? '수정 완료' : '저장하기'}
            </button>
            {initialData && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex-1 bg-white border border-slate-300 text-slate-600 font-bold py-4 px-6 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all text-base"
              >
                취소
              </button>
            )}
            {!initialData && (
              <button
                type="button"
                onClick={() => setFormData(emptyFormState)}
                className="flex-none bg-white border border-slate-300 text-slate-600 p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all"
                title="새로 입력"
              >
                <RefreshCw size={20} />
              </button>
            )}
          </div>
        </form>
      </section>

      {/* SMS Template Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-500" />
              공통 문자 메시지 설정
            </h2>
            <p className="text-xs text-slate-500 mt-1">상세보기에서 문자 발송 시 자동 입력됩니다.</p>
          </div>
        </div>
        
        <textarea
          value={smsTemplate}
          onChange={e => setSmsTemplate(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium h-32 resize-y focus:bg-white focus:border-blue-400 focus:outline-none transition-all mb-4"
        />
        
        <div className="flex gap-2">
          <button
            onClick={handleSmsSave}
            className="text-xs font-bold px-4 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            설정 저장
          </button>
          <button
            onClick={handleSmsReset}
            className="text-xs text-slate-400 hover:text-slate-600 px-3 py-2.5 transition-colors"
          >
            기본값 복원
          </button>
        </div>
      </section>
    </div>
  );
};

export default BookingForm;