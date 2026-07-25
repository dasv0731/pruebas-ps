import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  PendingAssessmentsService,
  PendingTeaAssessment,
  TeaTestShortName,
  TEA_TESTS,
} from '../../services/pending-assessments.service';
import { TeaXmlExportService } from '../../services/tea-xml-export.service';

type TestFilter = 'ALL' | TeaTestShortName;

@Component({
  selector: 'app-pending-assessments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-assessments.component.html',
  styleUrl: './pending-assessments.component.scss',
})
export class PendingAssessmentsComponent implements OnInit {
  readonly testTypes = TEA_TESTS;
  items: PendingTeaAssessment[] = [];
  selectedIds = new Set<string>();
  search = '';
  testFilter: TestFilter = 'ALL';
  loading = true;
  downloading = false;
  error = '';
  notice = '';

  constructor(
    private pendingService: PendingAssessmentsService,
    private teaXmlExport: TeaXmlExportService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    try {
      this.loading = true;
      this.error = '';
      this.notice = '';
      this.items = await this.pendingService.listPendingTeaAssessments();
      const availableIds = new Set(this.items.map((item) => item.id));
      this.selectedIds = new Set([...this.selectedIds].filter((id) => availableIds.has(id)));
    } catch (err: any) {
      this.error = err.message || 'No se pudieron cargar las pruebas pendientes.';
    } finally {
      this.loading = false;
    }
  }

  get filteredItems(): PendingTeaAssessment[] {
    const query = this.search.trim().toLowerCase();
    return this.items.filter((item) => {
      const matchesType = this.testFilter === 'ALL' || item.shortName === this.testFilter;
      const searchable = `${item.shortName} ${item.assessmentName} ${item.subjectName} ${item.caseNumber}`.toLowerCase();
      return matchesType && (!query || searchable.includes(query));
    });
  }

  get selectedItems(): PendingTeaAssessment[] {
    return this.items.filter((item) => this.selectedIds.has(item.id));
  }

  get selectedCount(): number {
    return this.selectedItems.length;
  }

  get countForFilter(): number {
    return this.filteredItems.length;
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  isAllFilteredSelected(): boolean {
    return this.filteredItems.length > 0 && this.filteredItems.every((item) => this.selectedIds.has(item.id));
  }

  toggleSelection(item: PendingTeaAssessment): void {
    if (this.selectedIds.has(item.id)) {
      this.selectedIds.delete(item.id);
    } else {
      this.selectedIds.add(item.id);
    }
  }

  toggleAllFiltered(): void {
    if (this.isAllFilteredSelected()) {
      this.filteredItems.forEach((item) => this.selectedIds.delete(item.id));
    } else {
      this.filteredItems.forEach((item) => this.selectedIds.add(item.id));
    }
  }

  async downloadSelected(): Promise<void> {
    await this.downloadItems(this.selectedItems);
  }

  async downloadAll(): Promise<void> {
    await this.downloadItems(this.items);
  }

  async downloadType(shortName: TeaTestShortName): Promise<void> {
    await this.downloadItems(this.selectedItems.filter((item) => item.shortName === shortName));
  }

  private async downloadItems(items: PendingTeaAssessment[]): Promise<void> {
    if (items.length === 0) {
      this.error = 'Seleccione al menos una prueba para descargar.';
      return;
    }

    const invalidItems = items.filter((item) => !item.isExportable);
    const exportableItems = items.filter((item) => item.isExportable);
    if (exportableItems.length === 0) {
      this.error = 'Las pruebas seleccionadas tienen datos incompletos o inválidos.';
      return;
    }

    try {
      this.downloading = true;
      this.error = '';
      const groups = new Map<TeaTestShortName, PendingTeaAssessment[]>();
      for (const item of exportableItems) {
        const group = groups.get(item.shortName) ?? [];
        group.push(item);
        groups.set(item.shortName, group);
      }

      for (const shortName of this.testTypes) {
        const group = groups.get(shortName);
        if (!group?.length) continue;
        const xml = this.teaXmlExport.buildBatchXml(group);
        this.teaXmlExport.downloadBatch(shortName, xml);
      }

      this.notice = `Se han preparado ${groups.size} archivo(s) XML para TEACorrige.` +
        (invalidItems.length > 0
          ? ` ${invalidItems.length} prueba(s) quedaron fuera por datos incompletos.`
          : '');
    } catch (err: any) {
      this.error = err.message || 'No se pudieron generar los XML.';
    } finally {
      this.downloading = false;
    }
  }

  goToEntry(item: PendingTeaAssessment): void {
    this.router.navigate(item.entryRoute);
  }

  goToCase(item: PendingTeaAssessment): void {
    this.router.navigate(item.caseRoute);
  }

  getAnswerLabel(item: PendingTeaAssessment): string {
    if (!item.expectedQuestions) return `${item.answerCount} respuestas`;
    return `${item.answerCount}/${item.expectedQuestions} respuestas`;
  }

  clearFilters(): void {
    this.search = '';
    this.testFilter = 'ALL';
  }
}
