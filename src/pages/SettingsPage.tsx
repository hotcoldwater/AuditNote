import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { supabaseDisabledMessage } from '../lib/supabase';

export function SettingsPage() {
  const { user, usingDemo, supabaseEnabled, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout title="설정" description="현재 인증 상태와 환경 설정 안내를 확인합니다.">
      <Card css={{ display: 'grid', gap: '$4' }}>
        <div>
          <strong>현재 사용자</strong>
          <div style={{ marginTop: 8, color: '#777777' }}>
            {user?.nickname} · {user?.email}
          </div>
        </div>
        <div style={{ color: usingDemo ? '#B7791F' : '#2F5D50' }}>
          {usingDemo ? '샘플/로컬 모드' : 'Supabase 실사용 모드'}
        </div>
        {!supabaseEnabled ? <div style={{ color: '#B7791F' }}>{supabaseDisabledMessage}</div> : null}
        <Button
          tone="secondary"
          onClick={async () => {
            await signOut();
            navigate('/login', { replace: true });
          }}
        >
          로그아웃
        </Button>
      </Card>
    </Layout>
  );
}
