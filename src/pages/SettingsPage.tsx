import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { styled } from '../styles/stitches.config';

const Stack = styled('div', {
  display: 'grid',
  gap: '$4',
});

const Field = styled('label', {
  display: 'grid',
  gap: '$2',
  fontSize: '11px',
  color: '$subtleText',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: 700,
});

const Input = styled('input', {
  width: '100%',
  minHeight: '56px',
  padding: '0 $5',
  borderRadius: '$lg',
  border: '1px solid $border',
  backgroundColor: 'rgba(255,255,255,0.88)',
  fontSize: '$3',
  color: '$text',
  boxShadow: '$soft',
  outline: 'none',
  '&:focus': {
    borderColor: '$secondary',
    boxShadow: '$focus',
  },
});

const Notice = styled('div', {
  fontSize: '$2',
  lineHeight: 1.7,
});

export function SettingsPage() {
  const { user, signOut, updateNickname } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNickname(user?.nickname ?? '');
  }, [user?.nickname]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    const result = await updateNickname(nickname);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setNotice('닉네임을 저장했습니다.');
  }

  return (
    <Layout title="개인정보설정">
      <Stack>
        <Card css={{ display: 'grid', gap: '$5' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <Field>
              닉네임
              <Input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="닉네임"
                maxLength={24}
              />
            </Field>
            <div style={{ color: '#777777', fontSize: 13, lineHeight: 1.7 }}>
              {user?.email}
            </div>
            {notice ? <Notice style={{ color: '#2f5d50' }}>{notice}</Notice> : null}
            {error ? <Notice style={{ color: '#b93a3a' }}>{error}</Notice> : null}
            <Button type="submit" disabled={submitting}>
              {submitting ? '저장 중...' : '닉네임 저장'}
            </Button>
          </form>
        </Card>

        <Card css={{ display: 'grid', gap: '$4' }}>
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
      </Stack>
    </Layout>
  );
}
