import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { SubjectService } from '../../services/subject.service';
import { CaseService } from '../../services/case.service';

interface BreadcrumbItem {
  label: string;
  url: string;
}

interface SubjectNav {
  id: string;
  name: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  breadcrumbs: BreadcrumbItem[] = [];
  subjects: SubjectNav[] = [];
  currentSubjectId = '';
  currentCaseId = '';
  showSubjectDropdown = false;
  activeTab = '';
  showTabs = false;
  private routeSub: Subscription | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private caseService: CaseService,
    private subjectService: SubjectService
  ) {}

  ngOnInit() {
    this.routeSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.buildBreadcrumb());

    this.buildBreadcrumb();
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  async buildBreadcrumb() {
    const url = this.router.url;
    this.breadcrumbs = [];
    this.showTabs = false;
    this.currentSubjectId = '';
    this.currentCaseId = '';
    this.showSubjectDropdown = false;

    // Solo mostrar en rutas de casos
    if (!url.startsWith('/cases/') || url === '/cases' || url === '/cases/new') {
      return;
    }

    const segments = url.split('/').filter((s) => s);
    // segments: ['cases', caseId, ...]

    if (segments.length < 2) return;

    const caseId = segments[1];
    this.currentCaseId = caseId;

    // Breadcrumb: Casos
    this.breadcrumbs.push({ label: 'Casos', url: '/cases' });

    // Cargar datos del caso
    try {
      const caseData = await this.caseService.getById(caseId);
      const caseLabel = caseData ? `Caso ${caseData.caseNumber}` : 'Caso';
      this.breadcrumbs.push({ label: caseLabel, url: `/cases/${caseId}` });

      // Si estamos en edit del caso
      if (segments[2] === 'edit') {
        this.breadcrumbs.push({ label: 'Editar', url: '' });
        return;
      }

      // Si estamos en report del caso
      if (segments[2] === 'report') {
        this.breadcrumbs.push({ label: 'Informe Final', url: '' });
        return;
      }

      // Si estamos en subjects
      if (segments[2] === 'subjects' && segments[3]) {
        const subjectId = segments[3];

        if (subjectId === 'new') {
          this.breadcrumbs.push({ label: 'Nuevo implicado', url: '' });
          return;
        }

        this.currentSubjectId = subjectId;

        // Cargar implicados para el dropdown
        const allSubjects = await this.subjectService.listByCase(caseId);
        this.subjects = allSubjects.map((s: any) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
        }));

        const currentSubject = this.subjects.find((s) => s.id === subjectId);
        const subjectLabel = currentSubject?.name || 'Implicado';

        this.breadcrumbs.push({
          label: subjectLabel,
          url: `/cases/${caseId}/subjects/${subjectId}/summary`,
        });

        // Determinar la sección activa
        if (segments[4] === 'edit') {
          this.breadcrumbs.push({ label: 'Editar', url: '' });
          return;
        }

        this.showTabs = true;

        if (segments[4] === 'assessments') {
          this.activeTab = 'assessments';
          if (segments[5]) {
            if (segments[6] === 'apply') {
              this.breadcrumbs.push({ label: 'Aplicar prueba', url: '' });
            } else if (segments[6] === 'results') {
              this.breadcrumbs.push({ label: 'Resultados', url: '' });
            }
          }
        } else if (segments[4] === 'interviews') {
          this.activeTab = 'interviews';
          if (segments[5]) {
            if (segments[5] === 'new') {
              this.breadcrumbs.push({ label: 'Nueva entrevista', url: '' });
            } else if (segments[6] === 'edit') {
              this.breadcrumbs.push({ label: 'Entrevista', url: '' });
            }
          }
        } else if (segments[4] === 'summary') {
          this.activeTab = 'summary';
        } else {
          this.activeTab = 'summary';
        }
      }
    } catch {
    }
  }

  navigate(url: string) {
    if (url) {
      this.router.navigateByUrl(url);
    }
  }

  toggleDropdown() {
    this.showSubjectDropdown = !this.showSubjectDropdown;
  }

  selectSubject(subject: SubjectNav) {
    this.showSubjectDropdown = false;
    if (subject.id === this.currentSubjectId) return;
    
    const tabPath = this.activeTab || 'summary';
    // Navegar al caso primero y luego al implicado para forzar recarga
    this.router.navigateByUrl(`/cases/${this.currentCaseId}`, { skipLocationChange: true }).then(() => {
      this.router.navigate(['/cases', this.currentCaseId, 'subjects', subject.id, tabPath]);
    });
  }

  navigateTab(tab: string) {
    this.router.navigate(['/cases', this.currentCaseId, 'subjects', this.currentSubjectId, tab]);
  }

  isVisible(): boolean {
    return this.breadcrumbs.length > 0;
  }
}