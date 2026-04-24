export type ResultStatus = 'EXCELLENT' | 'CORRECT' | 'REVIEW' | 'WRONG' | 'SKIPPED';

export type StudyMode = 'RANDOM' | 'PART' | 'WRONG_NOTE';

export type LevelWeightMap = Record<number, number>;

export interface Standard {
  id: string;
  content_type: string | null;
  source_ref: string | null;
  part_no: number | null;
  chapter_no: number | null;
  section_no: number | null;
  topic_no: number | null;
  paren_no: number | null;
  bracket_no: number | null;
  item_no: number | null;
  title: string;
  answer: string;
  level: number;
  exam_years: string[];
  required_keywords: string[];
  optional_keywords: string[];
  tags: string[];
  is_active: boolean;
  check_status: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudyAttempt {
  id: string;
  user_id: string;
  standard_id: string;
  mode: string;
  user_answer: string;
  score: number;
  result_status: ResultStatus;
  included_required_keywords: string[];
  missing_required_keywords: string[];
  included_optional_keywords: string[];
  answer_length_ratio: number;
  similarity_score: number;
  created_at: string;
}

export interface UserStandardStats {
  user_id: string;
  standard_id: string;
  attempt_count: number;
  correct_count: number;
  wrong_count: number;
  review_count: number;
  skipped_count: number;
  last_score: number | null;
  last_result_status: ResultStatus | null;
  consecutive_correct_count: number;
  consecutive_wrong_count: number;
  last_attempted_at: string | null;
  updated_at?: string;
}

export interface WrongNote {
  id: string;
  user_id: string;
  standard_id: string;
  source: 'AUTO' | 'MANUAL';
  reason: string | null;
  is_resolved: boolean;
  wrong_count: number;
  last_attempted_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ScoringResult {
  score: number;
  resultStatus: ResultStatus;
  includedRequiredKeywords: string[];
  missingRequiredKeywords: string[];
  includedOptionalKeywords: string[];
  answerLengthRatio: number;
  similarityScore: number;
  feedbackMessage: string;
}

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  isDemo?: boolean;
}

export interface PartProgressItem {
  partNo: number;
  solvedCount: number;
  totalCount: number;
  wrongRate: number;
  progressRate: number;
}

export interface LevelAccuracyItem {
  label: string;
  total: number;
  correct: number;
  accuracyRate: number;
}

export interface RecentStudyItem {
  id: string;
  standardId: string;
  standardTitle: string;
  resultStatus: ResultStatus;
  score: number;
  mode: string;
  createdAt: string;
}

export interface FrequentWrongItem {
  standardId: string;
  standardTitle: string;
  wrongCount: number;
  lastAttemptedAt: string | null;
}

export interface DashboardStats {
  overallProgress: number;
  todayAttemptCount: number;
  totalAttempts: number;
  averageScore: number;
  overallWrongRate: number;
  recent7Days: Array<{ date: string; count: number; averageScore: number }>;
  statusBreakdown: Array<{ label: string; count: number; tone: 'success' | 'warning' | 'danger' | 'primary' }>;
  scoreDistribution: Array<{ label: string; count: number }>;
  partProgress: PartProgressItem[];
  levelAccuracy: LevelAccuracyItem[];
  frequentWrongStandards: FrequentWrongItem[];
  recentAttempts: RecentStudyItem[];
}
