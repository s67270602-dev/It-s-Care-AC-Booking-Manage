import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const PASSWORD = '20094316';

function AuthGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = React.useState(localStorage.getItem('auth_ok') === 'true');
  const [input, setInput] = React.useState('');

  const handleLogin = () => {
    if (input === PASSWORD) {
      localStorage.setItem('auth_ok', 'true');
      setOk(true);
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  // 엔터키로 로그인
  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white w-80 rounded-xl shadow p-6">
          <h1 className="text-lg font-bold text-center mb-2">관리자 접속</h1>
          <p className="text-sm text-slate-500 text-center mb-4">
            비밀번호를 입력해 주세요.
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
            (내부 관리용)
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
