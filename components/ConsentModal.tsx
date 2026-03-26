import React, { useRef, useState, useEffect } from 'react';

interface ConsentModalProps {
  onClose: () => void;
  onSaveSignature: (signatureBase64: string, isDisagree: boolean) => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ onClose, onSaveSignature }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDisagree, setIsDisagree] = useState(false);

  // 캔버스 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff'; // 배경색 흰색
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2; // 선 굵기
        ctx.strokeStyle = '#000000'; // 선 색상 검정
      }
    }
  }, []);

  // 그리기 좌표 가져오기
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  // 그리기 시작
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // 모바일 스크롤 방지
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  // 그리기 중
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // 모바일 스크롤 방지
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  // 그리기 멈춤
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // 서명 지우기
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // 확인 버튼 클릭
  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      // 캔버스 이미지를 Base64 문자열로 변환
      const signatureData = canvas.toDataURL('image/png');
      onSaveSignature(signatureData, isDisagree);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="bg-blue-700 text-white flex items-center justify-between px-4 py-3">
          <button onClick={onClose} className="text-white text-xl p-1 font-bold">≡</button>
          <h2 className="text-lg font-bold tracking-wide">잇츠케어 세척 동의서</h2>
          <button onClick={onClose} className="text-white text-2xl p-1">⌂</button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4 bg-slate-50">
          {/* 동의 내용 안내 */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl text-sm text-slate-700 leading-relaxed shadow-sm">
            고객님께서 요청하시는 세척 서비스는 제품을 분해하고, 약품도포, 세척, 조립의 과정을 거치게 됩니다.<br/><br/>
            제품이 노후화된 경우 분해조립 과정에서 기구물 훼손 및 이격/유격이 발생 할 수 있으며, 조립 후 동작 시 소음이 발생될 수 있습니다.<br/><br/>
            이로 인해 부품 교체가 필요한 경우 수리에 필요한 비용은 고객님께서 부담하여야 합니다.
          </div>

          {/* 미동의 체크 */}
          <label className="flex items-center gap-2 bg-white border border-slate-200 p-3 rounded-xl shadow-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={isDisagree} 
              onChange={(e) => setIsDisagree(e.target.checked)}
              className="w-5 h-5 accent-blue-600"
            />
            <span className="text-sm font-bold text-slate-700">미동의 여부 <span className="text-slate-400 font-normal">(미동의 시 체크하세요)</span></span>
          </label>

          {/* 서명란 */}
          <div className="bg-white border-2 border-slate-200 rounded-xl flex-1 min-h-[200px] relative overflow-hidden shadow-sm">
            <div className="absolute top-2 left-2 text-slate-300 font-bold text-sm pointer-events-none">여기에 서명해 주세요</div>
            <canvas
              ref={canvasRef}
              width={400}
              height={250}
              className="w-full h-full touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex bg-slate-100 p-3 gap-3">
          <button onClick={clearCanvas} className="flex-1 py-4 bg-slate-200 text-slate-700 font-bold rounded-xl active:bg-slate-300 transition-colors">
            다시 서명
          </button>
          <button onClick={handleConfirm} className="flex-1 py-4 bg-blue-700 text-white font-bold rounded-xl active:bg-blue-800 transition-colors">
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;
