import { Injectable } from '@angular/core';
import { TestConfig, TestSection, ScoringResult } from '../models/test.interfaces';
import { getAllTestConfigs, getTestConfig, getTestScoring } from '../tests/test-registry';

@Injectable({
  providedIn: 'root',
})
export class TestLoaderService {

  getAllTests(): TestConfig[] {
    return getAllTestConfigs();
  }

  getConfig(shortName: string): TestConfig | null {
    return getTestConfig(shortName);
  }

  getSections(shortName: string): TestSection[] {
    const config = getTestConfig(shortName);
    return config?.sections || [];
  }

  getQuestionType(shortName: string): string {
    const config = getTestConfig(shortName);
    return config?.questionType || 'NUMERIC';
  }

  getTotalQuestions(shortName: string): number {
    const config = getTestConfig(shortName);
    if (!config) return 0;
    return config.sections.reduce((sum, s) => sum + s.questions.length, 0);
  }

  score(shortName: string, answers: number[]): ScoringResult | null {
    const scoring = getTestScoring(shortName);
    if (!scoring) return null;
    return scoring.score(answers);
  }
}