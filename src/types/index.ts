export type ResultStatus = 'EXCELLENT' | 'CORRECT' | 'REVIEW' | 'WRONG' | 'SKIPPED';
export type GradingMethod = 'ai' | 'rule' | 'rule-fallback';
export type WrongNoteStatus = 'WRONG' | 'REVIEW';
export type IssueReportType = 'QUESTION_AMBIGUOUS' | 'ANSWER_INCORRECT' | 'GRADING_INCORRECT';
export type IssueReportSourceKind = 'STUDY' | 'EXAM';
export type ExamReviewStatus = 'VERIFIED' | 'NEEDS_REVIEW';

export type StudyMode = 'RANDOM' | 'PART' | 'SELECT' | 'WRONG_NOTE';

export interface AnswerImage {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
}

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
  wrong_concepts?: string[] | string | null;
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
  grading_method?: string | null;
  grading_model?: string | null;
  ai_reason?: string | null;
  should_add_wrong_note?: boolean | null;
  raw_grading_result?: Record<string, unknown> | null;
  included_required_keywords?: string[];
  missing_required_keywords?: string[];
  included_optional_keywords?: string[];
  answer_length_ratio?: number | null;
  similarity_score?: number | null;
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
  last_user_answer: string | null;
  last_attempted_at: string | null;
  updated_at?: string;
}

export interface WrongNote {
  id: string;
  user_id: string;
  standard_id: string;
  source: 'AUTO' | 'MANUAL';
  note_status?: WrongNoteStatus;
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
  reason: string;
  shouldRecommendReview?: boolean;
  shouldAddWrongNote: boolean;
}

export interface GradingMetadata {
  gradingMethod: GradingMethod;
  gradingModel: string | null;
  gradingVersion?: string;
  fallbackNotice?: string | null;
  rawGradingResult: Record<string, unknown> | null;
}

export interface IssueReport {
  id: string;
  user_id: string;
  source_kind: IssueReportSourceKind;
  standard_id: string | null;
  question_id: string | null;
  report_type: IssueReportType;
  result_status: ResultStatus | null;
  detail: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface RuleScoringResult {
  score: number;
  missingPoints: string[];
  includedRequiredKeywords: string[];
  includedOptionalKeywords: string[];
  answerLengthRatio: number;
  similarityScore: number;
  isKeywordListOnly: boolean;
  hasCriticalWrongConcepts: boolean;
  detectedWrongConcepts: string[];
}

export interface AIGradingResult extends ScoringResult {
  gradingMethod?: GradingMethod;
}

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  fullName?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  isAdmin?: boolean;
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

export interface ExamQuestion {
  id: string;
  part_no: number;
  chapter_no: number;
  section_no: number | null;
  problem_no: number | null;
  exam_year_raw: string | null;
  exam_years: string[];
  source_page: string | null;
  part_title: string;
  chapter_title: string;
  section_title: string | null;
  question_text: string;
  answer_text: string;
  explanation_text: string | null;
  is_active: boolean;
  check_status: string;
  note: string | null;
  review_status: ExamReviewStatus | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExamAttempt {
  id: string;
  user_id: string;
  question_id: string;
  user_answer: string;
  score: number;
  result_status: ResultStatus;
  grading_method?: string | null;
  grading_model?: string | null;
  ai_summary?: string | null;
  raw_grading_result?: Record<string, unknown> | null;
  created_at: string;
}

export interface ExamGradingPayload {
  score: number;
  maxScore: number;
  grade: string;
  confidence: string;
  summary: string;
  correctPoints: string[];
  missingPoints: string[];
  wrongPoints: string[];
  advice: string;
  modelAnswer: string;
}

export interface ExamYearOption {
  year: string;
  questionCount: number;
}

export interface ExamPaperAnswerDraft {
  questionId: string;
  userAnswer: string;
  answerImages: AnswerImage[];
}

export interface ExamPaperQuestionResult {
  questionId: string;
  index: number;
  userAnswer: string;
  answerImages: AnswerImage[];
  scoring: ScoringResult;
  details: ExamGradingPayload;
  metadata: GradingMetadata | null;
}
