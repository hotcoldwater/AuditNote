import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getOrderedStudyParts, getStudyPartTitle } from '../lib/partMeta';
import { getStandardLocationLines } from '../lib/standardDisplay';
import { loadUserStandardStatsMap } from '../lib/attempts';
import { useAuth } from '../lib/auth';
import { fetchActiveStandards, getAvailableParts, sortStandardsForStudySequence } from '../lib/standards';
import { styled } from '../styles/stitches.config';
import type { Standard, UserStandardStats } from '../types';
import { Layout } from '../components/Layout';

const Stack = styled('div', {
  display: 'grid',
  gap: '$4',
});

const Notice = styled(Card, {
  color: '$warning',
  lineHeight: 1.7,
});

const ChoiceGrid = styled('div', {
  display: 'grid',
  gap: '$3',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  '@sm': {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
});

const StudyButton = styled('button', {
  all: 'unset',
  boxSizing: 'border-box',
  display: 'grid',
  gap: '$2',
  alignContent: 'center',
  justifyItems: 'center',
  textAlign: 'center',
  minHeight: '108px',
  padding: '$5',
  border: '1px solid $borderSoft',
  backgroundColor: '$panel',
  boxShadow: '$soft',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    borderColor: '$border',
    backgroundColor: '$surface',
  },
  '&:focus-visible': {
    boxShadow: '$focus',
  },
  '&:disabled': {
    opacity: 0.4,
    cursor: 'not-allowed',
    transform: 'none',
  },
});

const ButtonLabel = styled('div', {
  fontSize: '$4',
  fontWeight: 700,
  color: '$primary',
  lineHeight: 1.3,
});

const ButtonMeta = styled('div', {
  fontSize: '$2',
  color: '$mutedText',
  lineHeight: 1.6,
});

const HeaderCard = styled(Card, {
  display: 'grid',
  gap: '$3',
});

const HeaderTitle = styled('div', {
  fontFamily: '$heading',
  fontSize: '$5',
  lineHeight: 1.15,
  color: '$primary',
});

const ActionRow = styled('div', {
  display: 'flex',
  gap: '$2',
  flexWrap: 'wrap',
});

const FilterLabel = styled('label', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '$2',
  width: 'fit-content',
  minHeight: '44px',
  padding: '0 14px',
  border: '1px solid $borderSoft',
  backgroundColor: '$surface',
  color: '$primary',
  fontSize: '$2',
  fontWeight: 700,
  cursor: 'pointer',
});

const FilterCheckbox = styled('input', {
  width: '16px',
  height: '16px',
  margin: 0,
  accentColor: '$primary',
});

const ListCard = styled(Card, {
  display: 'grid',
  gap: '$4',
});

const ListGrid = styled('div', {
  display: 'grid',
  gap: '$3',
});

const ListButton = styled('button', {
  all: 'unset',
  boxSizing: 'border-box',
  display: 'grid',
  gap: '$2',
  padding: '$4',
  border: '1px solid $borderSoft',
  backgroundColor: '$surface',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    borderColor: '$border',
    backgroundColor: '$panel',
  },
  '&:focus-visible': {
    boxShadow: '$focus',
  },
});

const RowTop = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$3',
});

const Chip = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '40px',
  minHeight: '28px',
  padding: '0 10px',
  border: '1px solid $border',
  backgroundColor: '$primarySoft',
  color: '$primary',
  fontSize: '$2',
  fontWeight: 700,
});

const HistoryText = styled('div', {
  color: '$danger',
  fontSize: '$1',
  lineHeight: 1.5,
  fontWeight: 700,
  letterSpacing: '0.02em',
});

type SetupMode = 'RANDOM' | 'SELECT' | null;

type ChapterGroup = {
  chapterNo: number;
  label: string;
  standards: Standard[];
};

function getChapterLabel(standard: Standard, chapterNo: number) {
  const locationLines = getStandardLocationLines(standard);
  return locationLines[1] ?? `${chapterNo}장`;
}

function buildChapterGroups(standards: Standard[], partNo: number) {
  const partStandards = sortStandardsForStudySequence(standards.filter((item) => item.part_no === partNo));
  const groups = new Map<number, Standard[]>();

  for (const standard of partStandards) {
    if (!Number.isInteger(standard.chapter_no)) {
      continue;
    }
    const chapterNo = Number(standard.chapter_no);
    const existing = groups.get(chapterNo) ?? [];
    existing.push(standard);
    groups.set(chapterNo, existing);
  }

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([chapterNo, items]) => ({
      chapterNo,
      label: getChapterLabel(items[0], chapterNo),
      standards: items,
    })) satisfies ChapterGroup[];
}

export function StudySetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [standards, setStandards] = useState<Standard[]>([]);
  const [parts, setParts] = useState<number[]>(getOrderedStudyParts());
  const [notice, setNotice] = useState<string | undefined>();
  const [setupMode, setSetupMode] = useState<SetupMode>(null);
  const [selectedPartNo, setSelectedPartNo] = useState<number | null>(null);
  const [selectedChapterNo, setSelectedChapterNo] = useState<number | null>(null);
  const [examOnly, setExamOnly] = useState(false);
  const [excludeSolved, setExcludeSolved] = useState(false);
  const [statsMap, setStatsMap] = useState<Map<string, UserStandardStats>>(new Map());

  useEffect(() => {
    fetchActiveStandards().then((payload) => {
      const availableParts = getAvailableParts(payload.standards);
      setStandards(payload.standards);
      setParts(availableParts.length > 0 ? availableParts : getOrderedStudyParts());
      setNotice(payload.notice);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setStatsMap(new Map());
      return;
    }

    loadUserStandardStatsMap(user.id)
      .then((nextMap) => {
        setStatsMap(nextMap);
      })
      .catch(() => {
        setStatsMap(new Map());
      });
  }, [user?.id]);

  const chapterGroups = useMemo(
    () => (selectedPartNo ? buildChapterGroups(standards, selectedPartNo) : []),
    [selectedPartNo, standards],
  );
  const currentChapter = useMemo(
    () => chapterGroups.find((item) => item.chapterNo === selectedChapterNo) ?? null,
    [chapterGroups, selectedChapterNo],
  );

  return (
    <Layout title="학습 시작">
      <Stack>
        {notice ? <Notice>{notice}</Notice> : null}

        {setupMode === null ? (
          <ChoiceGrid>
            <StudyButton onClick={() => setSetupMode('RANDOM')}>
              <ButtonLabel>RANDOM</ButtonLabel>
            </StudyButton>
            <StudyButton onClick={() => setSetupMode('SELECT')}>
              <ButtonLabel>SELECT</ButtonLabel>
            </StudyButton>
          </ChoiceGrid>
        ) : null}

        {setupMode === 'RANDOM' ? (
          <Stack>
            <HeaderCard>
              <HeaderTitle>RANDOM</HeaderTitle>
              <ActionRow>
                <Button tone="secondary" css={{ width: 'auto', minHeight: '44px' }} onClick={() => setSetupMode(null)}>
                  방식 다시 선택
                </Button>
                <FilterLabel>
                  <FilterCheckbox
                    type="checkbox"
                    checked={examOnly}
                    onChange={(event) => setExamOnly(event.target.checked)}
                  />
                  기출만
                </FilterLabel>
                <FilterLabel>
                  <FilterCheckbox
                    type="checkbox"
                    checked={excludeSolved}
                    onChange={(event) => setExcludeSolved(event.target.checked)}
                  />
                  맞춘 항목 제외
                </FilterLabel>
              </ActionRow>
            </HeaderCard>

            <ChoiceGrid>
              {getOrderedStudyParts().map((partNo) => (
                <StudyButton
                  key={partNo}
                  onClick={() =>
                    navigate(
                      `/study/play?mode=part&partNo=${partNo}${examOnly ? '&examOnly=1' : ''}${excludeSolved ? '&excludeSolved=1' : ''}`,
                    )
                  }
                  disabled={!parts.includes(partNo)}
                >
                  <ButtonLabel>{partNo}편</ButtonLabel>
                  <ButtonMeta>{getStudyPartTitle(partNo)}</ButtonMeta>
                </StudyButton>
              ))}

              <StudyButton
                onClick={() =>
                  navigate(`/study/play?mode=random${examOnly ? '&examOnly=1' : ''}${excludeSolved ? '&excludeSolved=1' : ''}`)
                }
              >
                <ButtonLabel>전체</ButtonLabel>
              </StudyButton>
            </ChoiceGrid>
          </Stack>
        ) : null}

        {setupMode === 'SELECT' ? (
          <Stack>
            <HeaderCard>
              <HeaderTitle>SELECT</HeaderTitle>
              <ActionRow>
                {selectedChapterNo !== null ? (
                  <Button
                    tone="secondary"
                    css={{ width: 'auto', minHeight: '44px' }}
                    onClick={() => setSelectedChapterNo(null)}
                  >
                    장 다시 선택
                  </Button>
                ) : null}
                {selectedPartNo !== null ? (
                  <Button
                    tone="secondary"
                    css={{ width: 'auto', minHeight: '44px' }}
                    onClick={() => {
                      setSelectedPartNo(null);
                      setSelectedChapterNo(null);
                    }}
                  >
                    편 다시 선택
                  </Button>
                ) : null}
                <Button tone="secondary" css={{ width: 'auto', minHeight: '44px' }} onClick={() => setSetupMode(null)}>
                  방식 다시 선택
                </Button>
              </ActionRow>
            </HeaderCard>

            {selectedPartNo === null ? (
              <ChoiceGrid>
                {getOrderedStudyParts().map((partNo) => (
                  <StudyButton
                    key={partNo}
                    onClick={() => setSelectedPartNo(partNo)}
                    disabled={!parts.includes(partNo)}
                  >
                    <ButtonLabel>{partNo}편</ButtonLabel>
                    <ButtonMeta>{getStudyPartTitle(partNo)}</ButtonMeta>
                  </StudyButton>
                ))}
              </ChoiceGrid>
            ) : null}

            {selectedPartNo !== null && selectedChapterNo === null ? (
              <ChoiceGrid>
                {chapterGroups.map((chapter) => (
                  <StudyButton key={chapter.chapterNo} onClick={() => setSelectedChapterNo(chapter.chapterNo)}>
                    <ButtonLabel>{chapter.label}</ButtonLabel>
                    <ButtonMeta>{`${chapter.standards.length}개 기준서`}</ButtonMeta>
                  </StudyButton>
                ))}
              </ChoiceGrid>
            ) : null}

            {selectedPartNo !== null && currentChapter ? (
              <ListCard>
                <div style={{ color: '#6f7d90', fontSize: 13 }}>{`${selectedPartNo}편 · ${currentChapter.label}`}</div>
                <ListGrid>
                  {currentChapter.standards.map((standard, index) => {
                    const locationLines = getStandardLocationLines(standard);
                    const lastResultStatus = statsMap.get(standard.id)?.last_result_status;
                    return (
                      <ListButton
                        key={standard.id}
                        onClick={() =>
                          navigate(
                            `/study/play?mode=select&partNo=${selectedPartNo}&chapterNo=${currentChapter.chapterNo}&standardId=${standard.id}`,
                          )
                        }
                      >
                        <RowTop>
                          <strong style={{ color: '#173d7a', fontSize: 16, lineHeight: 1.5 }}>{`${index + 1}. ${standard.title}`}</strong>
                          <Chip>{`Lv${standard.level}`}</Chip>
                        </RowTop>
                        <ButtonMeta css={{ textAlign: 'left' }}>{locationLines[2] ?? currentChapter.label}</ButtonMeta>
                        {lastResultStatus ? <HistoryText>{lastResultStatus}</HistoryText> : null}
                      </ListButton>
                    );
                  })}
                </ListGrid>
              </ListCard>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Layout>
  );
}
