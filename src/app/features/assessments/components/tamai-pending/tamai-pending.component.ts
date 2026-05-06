import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TamaiXmlExportService } from '../../services/tamai-xml-export.service';

@Component({
  selector: 'app-tamai-pending',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tamai-pending.component.html',
  styleUrl: './tamai-pending.component.scss',
})
export class TamaiPendingComponent implements OnInit {
  caseId = '';
  subjectId = '';
  sessionId = '';

  showModal = false;
  suggestedName = '';
  editedName = '';
  loadingName = false;
  downloading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private xmlExport: TamaiXmlExportService,
  ) {}

  async ngOnInit() {
    this.caseId = this.route.snapshot.params['caseId'];
    this.subjectId = this.route.snapshot.params['subjectId'];
    this.sessionId = this.route.snapshot.params['sessionId'];
  }

  async openDownloadModal() {
    try {
      this.loadingName = true;
      this.error = '';
      this.suggestedName = await this.xmlExport.loadSuggestedName(this.sessionId);
      this.editedName = this.suggestedName;
      this.showModal = true;
    } catch (err: any) {
      this.error = err.message || 'Error al preparar el XML';
    } finally {
      this.loadingName = false;
    }
  }

  closeModal() { this.showModal = false; this.error = ''; }

  async confirmDownload() {
    if (!this.editedName.trim()) return;
    try {
      this.downloading = true;
      this.error = '';
      const xml = await this.xmlExport.buildXml(this.sessionId, this.editedName.trim());
      this.xmlExport.downloadXml(xml, this.editedName.trim());
      this.showModal = false;
    } catch (err: any) {
      this.error = err.message || 'Error al generar el XML';
    } finally {
      this.downloading = false;
    }
  }

  goToEntry() {
    this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments', this.sessionId, 'tamai-entry']);
  }

  goBack() {
    this.router.navigate(['/cases', this.caseId, 'subjects', this.subjectId, 'assessments']);
  }

  goToCase() { this.router.navigate(['/cases', this.caseId]); }
}
