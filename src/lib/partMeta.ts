export const STUDY_PART_TITLES: Record<number, string> = {
  1: '감사의 기본개념',
  2: '감사인의 선임',
  3: '회계감사수행 기초지식',
  4: '감사절차',
  5: '감사보고',
  6: '기타 인증업무',
};

export function getStudyPartTitle(partNo: number) {
  return STUDY_PART_TITLES[partNo] ?? '';
}

export function getOrderedStudyParts() {
  return [1, 2, 3, 4, 5, 6];
}
