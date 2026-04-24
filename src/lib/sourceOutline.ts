import type { Standard } from '../types';

export const PRIMARY_SOURCE_FILE = 'source/하끝 20206 회계감사 목차.pdf';

type SectionMap = Record<number, string>;

type ChapterEntry = {
  title: string;
  sections: SectionMap;
};

type PartEntry = {
  title: string;
  chapters: Record<number, ChapterEntry>;
};

type SourceOutlineEntry = {
  part?: string;
  chapter?: string;
  section?: string;
};

const SOURCE_TITLES: Record<string, string> = {
  GENERAL: '하끝 회계감사',
  LAW: '외부감사법',
  STANDARD: '회계감사기준서',
};

const LOCATION_TAG_PATTERN = /^\d+[편장절]$/;

const HAKKKEUT_OUTLINE: Record<number, PartEntry> = {
  1: {
    title: '회계감사의 기초',
    chapters: {
      1: {
        title: '감사와 회계감사의 기본개념',
        sections: {
          1: '감사의 개념과 분류',
          2: '회계감사의 목적과 한계',
          3: '회계감사의 구성요소',
        },
      },
      2: {
        title: '감사인의 의무, 책임 및 자격요건',
        sections: {
          1: '공인회계사의 제공업무와 조직형태',
          2: '관련 법률의 준수와 그 책임',
          3: '공인회계사윤리기준의 준수',
          4: '감사인의 범위와 자격요건',
        },
      },
      3: {
        title: '감사인의 독립성과 품질관리',
        sections: {
          1: '공인회계사법과 공인회계사윤리기준의 독립성',
          2: '5가지 위협과 독립성',
          3: '감사품질과 품질관리',
        },
      },
    },
  },
  2: {
    title: '감사인의 선임과 감사계약',
    chapters: {
      1: {
        title: '감사인의 선임',
        sections: {
          1: '감사인의 선임방식과 외부감사법상 독립성 유지제도',
          2: '외부감사법상 감사인의 선임절차',
        },
      },
      2: {
        title: '감사계약',
        sections: {
          1: '감사업무의 수용·유지의 결정과 감사업무의 전제조건',
          2: '감사계약',
        },
      },
    },
  },
  3: {
    title: '회계감사의 시작과 위험평가절차',
    chapters: {
      1: {
        title: '회계감사수행을 위한 기초지식',
        sections: {
          1: '회계감사의 업무흐름',
          2: '감사증거와 요건',
          3: '감사증거의 입수방법',
          4: '전문가와 내부감사기능의 활용',
          5: '중요성',
          6: '감사위험',
        },
      },
      2: {
        title: '위험평가절차와 평가된 위험에 대한 대응',
        sections: {
          1: '위험평가절차의 개요',
          2: '위험평가절차와 관련활동',
          3: '평가된 위험에 대한 대응과 계획수립',
          4: '지배기구와의 커뮤니케이션',
        },
      },
    },
  },
  4: {
    title: '위험평가절차에 대한 추가감사절차',
    chapters: {
      1: {
        title: '통제테스트와 위험평가의 확정',
        sections: {
          1: '내부통제시스템의 개념과 고유한계',
          2: '내부통제시스템의 이해와 통제테스트',
          3: '거래유형별 통제',
          4: 'IT환경하에서의 통제테스트',
          5: '외부서비스조직을 이용하는 기업에 대한 통제테스트',
        },
      },
      2: {
        title: '실증절차의 기초',
        sections: {
          1: '개요',
          2: '실증절차의 수행시기와 적용방법',
        },
      },
      3: {
        title: '기초잔액과 거래유형별 실증절차',
        sections: {
          1: '초도감사시 기초잔액',
          2: '현금및현금성자산',
          3: '매출채권과 매출',
          4: '재고자산과 매출원가',
          5: '유형자산과 감가상각비',
          6: '매입채무와 차입금',
        },
      },
      4: {
        title: '특정항목별 감사절차',
        sections: {
          1: '부정',
          2: '회계추정치와 관련 공시',
          3: '소송과 배상청구',
          4: '특수관계자 거래',
          5: '회사의 법규준수',
          6: '부문정보의 공시',
        },
      },
      5: {
        title: '테스트항목의 범위와 표본감사',
        sections: {
          1: '테스트항목의 추출범위',
          2: '표본감사와 표본위험',
          3: '통계적 표본감사',
          4: '통제테스트로서의 속성표본감사',
          5: '세부테스트로서의 금액비례확률표본감사',
          6: '세부테스트로서의 전통적 변량표본감사',
        },
      },
      6: {
        title: '실증절차의 마무리절차',
        sections: {
          1: '후속사건의 검토',
          2: '계속기업전제의 검토',
          3: '서면진술의 수령',
        },
      },
    },
  },
  5: {
    title: '감사의견의 형성과 감사보고서',
    chapters: {
      1: {
        title: '미수정왜곡표시의 평가와 감사의견의 형성',
        sections: {
          1: '식별된 왜곡표시의 집계와 수정권고',
          2: '미수정왜곡표시가 재무제표에 미치는 영향의 평가와 감사의견의 형성',
        },
      },
      2: {
        title: '감사보고서의 작성과 보고',
        sections: {
          1: '감사보고서의 구성요소',
          2: '변형의견의 감사보고서',
          3: '비교정보에 대한 감사보고',
          4: '기타정보에 대한 감사보고',
        },
      },
    },
  },
  6: {
    title: '그룹재무제표에 대한 감사와 기타인증업무',
    chapters: {
      1: {
        title: '인증업무개념체계와 특정목적재무보고체계',
        sections: {
          1: '인증업무개념체계',
          2: '특정목적 재무보고체계에 따라 작성된 재무제표의 감사',
        },
      },
      2: {
        title: '그룹재무제표에 대한 감사',
        sections: {
          1: '개요',
          2: '그룹재무제표 감사업무의 수용·유지 결정, 위험평가절차 및 전반감사전략의 수립',
          3: '부문감사인의 활용에 대한 감사절차',
          4: '연결절차에 대한 감사절차',
          5: '기타 감사절차',
        },
      },
      3: {
        title: '내부회계관리제도에 대한 감사와 검토',
        sections: {
          1: '내부회계관리제도의 기본개념',
          2: '외부감사법의 내부회계관리제도 관련 규정',
          3: '회사의 내부회계관리제도 설계 및 운영과 자체 평가 및 보고',
          4: '외부감사인의 내부회계관리제도에 대한 감사와 검토',
        },
      },
      4: {
        title: '중간재무제표에 대한 검토',
        sections: {
          1: '개요',
          2: '연간재무제표 감사와 중간재무제표 검토의 비교',
          3: '중간재무제표에 대한 검토보고서',
        },
      },
    },
  },
};

function descriptiveTags(tags: string[]) {
  return tags.map((tag) => tag.trim()).filter((tag) => tag && !LOCATION_TAG_PATTERN.test(tag));
}

function inferNamesFromTags(standard: Standard) {
  const tags = descriptiveTags(standard.tags);

  if (tags.length >= 2) {
    return { chapter: tags[0], section: tags[1] };
  }

  if (tags.length === 1) {
    return standard.section_no ? { section: tags[0] } : { chapter: tags[0] };
  }

  return {};
}

function getMappedOutlineEntry(standard: Standard): SourceOutlineEntry {
  const partNo = standard.part_no ?? undefined;
  const chapterNo = standard.chapter_no ?? undefined;
  const sectionNo = standard.section_no ?? undefined;

  const part = partNo ? HAKKKEUT_OUTLINE[partNo] : undefined;
  const chapter = part && chapterNo ? part.chapters[chapterNo] : undefined;
  const sectionTitle = chapter && sectionNo ? chapter.sections[sectionNo] : undefined;

  return {
    part: partNo && part ? `${partNo}편: ${part.title}` : '',
    chapter: chapterNo && chapter ? `${chapterNo}장: ${chapter.title}` : '',
    section: sectionNo && sectionTitle ? `${sectionNo}절: ${sectionTitle}` : '',
  };
}

export function getOutlineEntry(standard: Standard) {
  const mapped = getMappedOutlineEntry(standard);
  if (mapped.part || mapped.chapter || mapped.section) {
    return mapped;
  }

  const inferred = inferNamesFromTags(standard);

  return {
    part: standard.part_no ? `${standard.part_no}편` : '',
    chapter: standard.chapter_no
      ? `${standard.chapter_no}장${inferred.chapter ? `: ${inferred.chapter}` : ''}`
      : '',
    section: standard.section_no
      ? `${standard.section_no}절${inferred.section ? `: ${inferred.section}` : ''}`
      : '',
  };
}

export function getSourceTitle(standard: Standard) {
  const sourceRef = standard.source_ref?.trim();
  if (sourceRef) {
    return sourceRef;
  }

  const contentType = standard.content_type?.trim();
  return contentType ? SOURCE_TITLES[contentType] ?? contentType : '출처 미기재';
}
