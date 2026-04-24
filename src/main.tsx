import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { globalStyles } from './styles/globalStyles';

function renderBootstrapError(message: string) {
  const root = document.getElementById('root');
  if (!root) {
    return;
  }

  root.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#F8F5EF;color:#222222;font-family:Pretendard,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
      <div style="max-width:560px;width:100%;background:#FFFFFF;border:1px solid #E5E0D8;border-radius:18px;padding:24px;line-height:1.7;">
        <h1 style="margin:0 0 12px 0;font-size:28px;">감사노트</h1>
        <strong style="display:block;margin-bottom:8px;">앱 초기화 오류</strong>
        <div style="white-space:pre-wrap;">${message}</div>
      </div>
    </div>
  `;
}

window.addEventListener('error', (event) => {
  renderBootstrapError(event.error?.message ?? event.message ?? '알 수 없는 오류가 발생했습니다.');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason =
    event.reason instanceof Error
      ? event.reason.message
      : typeof event.reason === 'string'
        ? event.reason
        : '비동기 초기화 중 오류가 발생했습니다.';
  renderBootstrapError(reason);
});

try {
  globalStyles();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
} catch (error) {
  renderBootstrapError(error instanceof Error ? error.message : '앱을 시작할 수 없습니다.');
}
