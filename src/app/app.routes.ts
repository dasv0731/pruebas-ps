import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'cases',
    pathMatch: 'full',
  },
  // ── Rutas públicas del evaluado ──
  {
    path: 'evaluate',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/evaluation/components/eval-portal/eval-portal.component').then(
            (m) => m.EvalPortalComponent
          ),
      },
      {
        path: 'test/:sessionId',
        loadComponent: () =>
          import('./features/evaluation/components/eval-test/eval-test.component').then(
            (m) => m.EvalTestComponent
          ),
      },
      {
        path: 'thanks',
        loadComponent: () =>
          import('./features/evaluation/components/eval-thanks/eval-thanks.component').then(
            (m) => m.EvalThanksComponent
          ),
      },
    ],
  },
  // ── Rutas autenticadas de la psicóloga ──
  {
    path: 'cases',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/cases/components/case-list/case-list.component').then(
            (m) => m.CaseListComponent
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/cases/components/case-form/case-form.component').then(
            (m) => m.CaseFormComponent
          ),
      },
      {
        path: ':caseId',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/cases/components/case-detail/case-detail.component').then(
                (m) => m.CaseDetailComponent
              ),
          },
          {
            path: 'edit',
            loadComponent: () =>
              import('./features/cases/components/case-form/case-form.component').then(
                (m) => m.CaseFormComponent
              ),
          },
          {
            path: 'report',
            loadComponent: () =>
              import('./features/cases/components/case-report/case-report.component').then(
                (m) => m.CaseReportComponent
              ),
          },
          {
            path: 'subjects/new',
            loadComponent: () =>
              import('./features/subjects/components/subject-form/subject-form.component').then(
                (m) => m.SubjectFormComponent
              ),
          },
          {
            path: 'subjects/:subjectId/edit',
            loadComponent: () =>
              import('./features/subjects/components/subject-form/subject-form.component').then(
                (m) => m.SubjectFormComponent
              ),
          },
          {
            path: 'subjects/:subjectId/assessments',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/assessments/components/assessment-catalog/assessment-catalog.component').then(
                    (m) => m.AssessmentCatalogComponent
                  ),
              },
              {
                path: ':sessionId/apply',
                loadComponent: () =>
                  import('./features/assessments/components/assessment-apply/assessment-apply.component').then(
                    (m) => m.AssessmentApplyComponent
                  ),
              },
              {
                path: ':sessionId/results',
                loadComponent: () =>
                  import('./features/assessments/components/assessment-results/assessment-results.component').then(
                    (m) => m.AssessmentResultsComponent
                  ),
              },
            ],
          },
          {
            path: 'subjects/:subjectId/interviews',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/interviews/components/interview-list/interview-list.component').then(
                    (m) => m.InterviewListComponent
                  ),
              },
              {
                path: 'new',
                loadComponent: () =>
                  import('./features/interviews/components/interview-form/interview-form.component').then(
                    (m) => m.InterviewFormComponent
                  ),
              },
              {
                path: ':interviewId/edit',
                loadComponent: () =>
                  import('./features/interviews/components/interview-form/interview-form.component').then(
                    (m) => m.InterviewFormComponent
                  ),
              },
            ],
          },
          {
            path: 'subjects/:subjectId/summary',
            loadComponent: () =>
              import('./features/subjects/components/subject-summary/subject-summary.component').then(
                (m) => m.SubjectSummaryComponent
              ),
          },
        ],
      },
    ],
  },
];