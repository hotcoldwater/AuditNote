export const STUDY_PART_TITLES: Record<number, string> = {
  1: '회계감사의 기초',
  2: '감사인의 선임과 감사계약',
  3: '회계감사의 시작과 위험평가절차',
  4: '위험평가절차에 대한 추가감사절차',
  5: '감사의견의 형성과 감사보고서',
  6: '그룹재무제표에 대한 감사와 기타인증업무',
};

export function getStudyPartTitle(partNo: number) {
  return STUDY_PART_TITLES[partNo] ?? '';
}

export function getOrderedStudyParts() {
  return [1, 2, 3, 4, 5, 6];
}
