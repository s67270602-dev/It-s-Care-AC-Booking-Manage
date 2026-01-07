import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * ✅ 비밀번호 변경/강제 재로그인 규칙
 * - PASSWORD를 바꾸거나
 * - PASSWORD_VERSION을 v1 -> v2 -> v3 처럼 올리면
 *   기존 로그인(localStorage)이 자동 무효화됩니다.
 */
const PASSWORD = '20094316';
const PASSWORD_VERSION = 'v1';

/** ✅ 프로젝트별 저장키 분리 (에어컨/제빙기 로그인 섞임 방지) */
const STORAGE_PREFIX = 'itscare_ac_';
const KEY_OK = `${STORAGE_PREFIX}auth_ok`;
const KEY_VER = `${STORAGE_PREFIX}auth_ver`;

function AuthGate({ children }: { children: React.ReactNode }) {
  const [input, setInput] = React.useState('');

  const [ok, setOk] = React.useState(() => {
    const savedOk = localStorage.getItem(KEY_OK) === 'true';
    const savedVer = localStorage.getItem(KEY_VER);
    return savedOk && savedVer === PASSWORD_VERSION;
  });

  const handleLogin = () => {
    if (input === PASSWORD) {
      localStorage.setItem(KEY_OK, 'true');
      localStorage.setItem(KEY_VER, PASSWORD_VERSION);
      setOk(true);
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white w-80 rounded-xl shadow p-6">
          <h1 className="text-lg font-bold text-center mb-2">
            에어컨 청소 관리
          </h1>
          <p className="text-sm text-slate-500 text-center mb-4">
            관리자 비밀번호를 입력해 주세요.
          </p>

          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="비밀번호"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-semibold"
            onClick={handleLogin}
          >
            접속하기
          </button>

          <div className="mt-4 text-xs text-slate-400 text-center">
            비밀번호 변경 시 자동 재로그인 됩니다.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </React.StrictMode>
);
