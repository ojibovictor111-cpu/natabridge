type RiskTone = 'high' | 'mid' | 'low' | 'none';

interface CriticalAlertView {
  id: string;
  name: string;
  detail: string;
}

interface RecentAssessmentView {
  id: string;
  name: string;
  vitals: string;
  risk: string;
  riskTone: RiskTone;
  assessed: string;
}

interface MonthlyAssessmentView {
  label: string;
  low: number;
  mid: number;
  high: number;
  total: number;
  height: number;
}

export type { CriticalAlertView, MonthlyAssessmentView, RecentAssessmentView, RiskTone };
