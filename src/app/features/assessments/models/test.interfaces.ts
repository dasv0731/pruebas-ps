export interface TestQuestion {
  index: number;
  text: string;
  options: number;
  textOptions?: string[];
}

export interface TestSection {
  title: string;
  instructions: string;
  legend: string[];
  questions: TestQuestion[];
}

export interface TestSubscale {
  name: string;
  description: string;
  items: number[];
}

export interface PercentileRange {
  min: number;
  max: number;
  label: string;
}

export interface TestConfig {
  shortName: string;
  name: string;
  description: string;
  totalQuestions: number;
  optionsPerQuestion: number;
  questionType: 'NUMERIC' | 'TEXT_OPTIONS';
  scoringType: 'LOCAL' | 'TEA';
  optionLabels?: string[];
  sections: TestSection[];
}

export interface ScoringResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  subscales?: Record<string, number>;
  cutoff?: {
    score: number;
    exceeded: boolean;
    description: string;
  };
  percentileCategory?: string;
  details: Record<string, any>;
}

export interface TestScoring {
  score(answers: number[]): ScoringResult;
}

export interface TestDefinition {
  config: TestConfig;
  scoring: TestScoring;
}