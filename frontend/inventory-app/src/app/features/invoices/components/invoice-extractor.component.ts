import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExtractedInvoice, InvoiceSummary } from '../../../shared/models/models';
import { InvoiceService } from '../services/invoice.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

type Stage = 'capture' | 'camera' | 'extracting' | 'preview' | 'saved';

@Component({
  selector: 'app-invoice-extractor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent],
  template: `
    <div class="page-header fade-in">
      <div>
        <h1>Invoice Extractor</h1>
        <p style="color: var(--color-text-muted); margin:0;">Photograph or upload an invoice — AI reads it, you review, then save or discard.</p>
      </div>
    </div>

    <div class="tabs fade-in">
      <button class="tab" [class.active]="activeTab() === 'scan'" (click)="activeTab.set('scan')">Scan Invoice</button>
      <button class="tab" [class.active]="activeTab() === 'history'" (click)="switchToHistory()">Saved Invoices</button>
    </div>

    <div *ngIf="activeTab() === 'scan'">
      <!-- ---------- Capture stage ---------- -->
      <div class="card card-hover capture-card slide-up" *ngIf="stage() === 'capture'">
        <div class="capture-empty">
          <div class="capture-icon">🧾</div>
          <h3>Scan an invoice</h3>
          <p style="color: var(--color-text-muted); max-width:420px; margin: 0 auto 22px;">
            Use your phone's camera to photograph a paper invoice, or upload an image. The AI will read vendor, line items and totals automatically.
          </p>
          <div class="capture-actions">
            <button class="btn btn-primary" (click)="startCamera()">📷 Take Photo</button>
            <button class="btn btn-secondary" (click)="galleryInput.click()">🖼️ Choose from Gallery</button>
          </div>
          <input #galleryInput type="file" accept="image/*" hidden (change)="onFileSelected($event)" />
        </div>
      </div>

      <!-- ---------- Live camera stage ---------- -->
      <div class="camera-overlay scale-in" *ngIf="stage() === 'camera'">
        <div class="camera-frame">
          <video #videoEl autoplay playsinline muted class="camera-video"></video>
          <div class="camera-guide"></div>
        </div>
        <div class="alert alert-danger" *ngIf="errorMessage()" style="max-width:480px;">{{ errorMessage() }}</div>
        <div class="camera-controls">
          <button class="btn btn-secondary" (click)="stopCamera()">Cancel</button>
          <button class="shutter-btn" (click)="capturePhoto()" title="Capture"></button>
          <button class="btn btn-secondary" (click)="switchCamera()" title="Switch camera">🔄</button>
        </div>
      </div>

      <!-- ---------- Extracting stage ---------- -->
      <div class="card extracting-card scale-in" *ngIf="stage() === 'extracting'">
        <img [src]="previewImage()" class="thumb" alt="Captured invoice" />
        <div class="extracting-status">
          <app-loading-spinner></app-loading-spinner>
          <p>Reading invoice with AI…</p>
          <span style="color: var(--color-text-muted); font-size: 12.5px;">This usually takes a few seconds.</span>
        </div>
      </div>

      <div class="alert alert-danger fade-in" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <!-- ---------- Preview / edit stage ---------- -->
      <div class="invoice-doc card slide-up" *ngIf="stage() === 'preview' && form">
        <div class="doc-grid">
          <img [src]="previewImage()" class="thumb thumb-side" alt="Captured invoice" />

          <form [formGroup]="form" class="doc-form">
            <div class="alert alert-success" *ngIf="extractionNotes()">
              <strong>AI note:</strong> {{ extractionNotes() }}
            </div>

            <div class="doc-header-row">
              <div class="form-group">
                <label class="form-label">Vendor</label>
                <input class="form-control" formControlName="vendorName" />
              </div>
              <div class="form-group">
                <label class="form-label">Invoice #</label>
                <input class="form-control" formControlName="invoiceNumber" />
              </div>
              <div class="form-group">
                <label class="form-label">Date</label>
                <input class="form-control" type="date" formControlName="invoiceDate" />
              </div>
              <div class="form-group">
                <label class="form-label">Currency</label>
                <input class="form-control" formControlName="currency" style="max-width:100px" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Vendor address</label>
              <input class="form-control" formControlName="vendorAddress" />
            </div>

            <h3 style="margin-top:20px;">Line Items</h3>
            <div style="overflow-x:auto">
              <table class="data-table" formArrayName="lineItems">
                <thead>
                  <tr><th>Description</th><th style="width:80px">Qty</th><th style="width:120px">Unit Price</th><th style="width:120px">Line Total</th><th></th></tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of lineItems.controls; let i = index" [formGroupName]="i">
                    <td><input class="form-control" formControlName="description" /></td>
                    <td><input class="form-control" type="number" formControlName="quantity" (input)="recalcLine(i)" /></td>
                    <td><input class="form-control" type="number" formControlName="unitPrice" (input)="recalcLine(i)" /></td>
                    <td><input class="form-control" type="number" formControlName="lineTotal" /></td>
                    <td><button type="button" class="btn btn-icon" (click)="removeLine(i)" title="Remove line">✕</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" style="margin-top:8px;" (click)="addLine()">+ Add line item</button>

            <div class="totals-box">
              <div class="totals-row">
                <span>Subtotal</span>
                <input class="form-control totals-input" type="number" formControlName="subtotal" />
              </div>
              <div class="totals-row">
                <span>Tax</span>
                <input class="form-control totals-input" type="number" formControlName="taxAmount" />
              </div>
              <div class="totals-row totals-final">
                <span>Total</span>
                <input class="form-control totals-input" type="number" formControlName="totalAmount" />
              </div>
            </div>

            <div class="doc-actions">
              <button type="button" class="btn btn-secondary" (click)="discard()" [disabled]="saving()">Discard</button>
              <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving() || form.invalid">
                {{ saving() ? 'Saving…' : '💾 Save to Supabase' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ---------- Saved confirmation ---------- -->
      <div class="card saved-card scale-in" *ngIf="stage() === 'saved' && savedInvoice() as s">
        <div class="saved-icon">✅</div>
        <h3>Invoice saved</h3>
        <p style="color: var(--color-text-muted);">{{ s.vendorName }} — {{ s.currency }} {{ s.totalAmount | number:'1.2-2' }}</p>
        <div class="capture-actions">
          <button class="btn btn-secondary" (click)="invoiceService.downloadPdf(s.id, s.pdfFileName)">⬇ Download PDF</button>
          <button class="btn btn-primary" (click)="reset()">Scan Another Invoice</button>
        </div>
      </div>
    </div>

    <div *ngIf="activeTab() === 'history'">
      <app-loading-spinner *ngIf="historyLoading()"></app-loading-spinner>
      <div class="card slide-up" *ngIf="!historyLoading()">
        <div class="empty-state" *ngIf="invoices().length === 0">No invoices saved yet.</div>
        <div style="overflow-x:auto" *ngIf="invoices().length > 0">
          <table class="data-table">
            <thead>
              <tr><th>Vendor</th><th>Invoice #</th><th>Date</th><th>Total</th><th>Saved</th><th></th></tr>
            </thead>
            <tbody class="stagger">
              <tr *ngFor="let inv of invoices()">
                <td><strong>{{ inv.vendorName }}</strong></td>
                <td>{{ inv.invoiceNumber || '—' }}</td>
                <td>{{ inv.invoiceDate || '—' }}</td>
                <td>{{ inv.currency }} {{ inv.totalAmount | number:'1.2-2' }}</td>
                <td>{{ inv.createdAt | date:'short' }}</td>
                <td>
                  <div style="display:flex; gap:6px;">
                    <button class="btn btn-secondary btn-sm" (click)="invoiceService.downloadPdf(inv.id, inv.pdfFileName)">⬇ PDF</button>
                    <button class="btn btn-danger btn-sm" (click)="deleteInvoice(inv)">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--color-border); }
    .tab {
      background: none; border: none; padding: 10px 16px; font-size: 14px; font-weight: 600;
      color: var(--color-text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: color 0.15s ease;
    }
    .tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

    .capture-card { padding: 56px 24px; }
    .capture-empty { text-align: center; }
    .capture-icon { font-size: 52px; margin-bottom: 8px; animation: fadeIn 0.5s ease; }
    .capture-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

    .camera-overlay {
      position: fixed; inset: 0; z-index: 100;
      background: #0b0f1a;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 20px; padding: 20px;
    }
    .camera-frame { position: relative; width: 100%; max-width: 640px; border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    .camera-video { width: 100%; max-height: 70vh; display: block; background: #000; }
    .camera-guide {
      position: absolute; inset: 6%; border: 2px dashed rgba(255,255,255,0.55); border-radius: var(--radius-md);
      pointer-events: none;
    }
    .camera-controls { display: flex; align-items: center; gap: 24px; }
    .shutter-btn {
      width: 66px; height: 66px; border-radius: 50%;
      background: #fff; border: 4px solid rgba(255,255,255,0.35);
      cursor: pointer; transition: transform 0.15s ease;
      box-shadow: 0 4px 18px rgba(0,0,0,0.4);
    }
    .shutter-btn:hover { transform: scale(1.08); }
    .shutter-btn:active { transform: scale(0.92); }

    .extracting-card { display: flex; gap: 24px; align-items: center; padding: 28px; }
    .extracting-status { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
    .extracting-status p { margin: 4px 0 0; font-weight: 600; }

    .thumb { width: 160px; height: 160px; object-fit: cover; border-radius: var(--radius-md); box-shadow: var(--shadow-md); flex-shrink: 0; }
    .thumb-side { width: 220px; height: 280px; }

    .invoice-doc { padding: 0; overflow: hidden; }
    .doc-grid { display: grid; grid-template-columns: 220px 1fr; gap: 0; }
    @media (max-width: 800px) { .doc-grid { grid-template-columns: 1fr; } .thumb-side { width: 100%; height: 200px; } }
    .doc-grid .thumb-side { border-radius: 0; margin: 0; box-shadow: none; }
    .doc-form { padding: 28px; }
    .doc-header-row { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 12px; }
    @media (max-width: 640px) { .doc-header-row { grid-template-columns: 1fr 1fr; } }

    .totals-box { margin-top: 18px; margin-left: auto; max-width: 280px; }
    .totals-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
    .totals-input { max-width: 130px; text-align: right; }
    .totals-final { font-weight: 800; font-size: 15px; border-top: 1px solid var(--color-border); padding-top: 8px; }

    .doc-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }

    .saved-card { text-align: center; padding: 48px 24px; }
    .saved-icon { font-size: 52px; animation: scaleIn 0.4s var(--ease-out) both; }
  `]
})
export class InvoiceExtractorComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef?: ElementRef<HTMLVideoElement>;

  activeTab = signal<'scan' | 'history'>('scan');
  stage = signal<Stage>('capture');

  previewImage = signal<string>('');
  errorMessage = signal('');
  extractionNotes = signal<string | null>(null);
  saving = signal(false);
  savedInvoice = signal<InvoiceSummary | null>(null);

  invoices = signal<InvoiceSummary[]>([]);
  historyLoading = signal(false);

  form: FormGroup | null = null;
  private sourceImageName = '';
  private mediaStream: MediaStream | null = null;
  private facingMode: 'environment' | 'user' = 'environment';

  constructor(private fb: FormBuilder, public invoiceService: InvoiceService) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopMediaStream();
  }

  // ---------- Live camera capture ----------
  async startCamera(): Promise<void> {
    this.errorMessage.set('');

    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMessage.set('This browser does not support camera access. Please use "Choose from Gallery" instead.');
      return;
    }

    this.stage.set('camera');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode },
        audio: false
      });
      this.mediaStream = stream;

      // The <video> element only exists once the 'camera' stage renders — wait a tick for it.
      setTimeout(() => {
        if (this.videoRef) {
          this.videoRef.nativeElement.srcObject = stream;
        }
      });
    } catch (err) {
      this.errorMessage.set('Could not access the camera. Check that you have granted camera permission, then try again.');
      this.stage.set('capture');
    }
  }

  async switchCamera(): Promise<void> {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    this.stopMediaStream();
    await this.startCamera();
  }

  capturePhoto(): void {
    const video = this.videoRef?.nativeElement;
    if (!video || video.videoWidth === 0) return;

    this.processImageSource(video, video.videoWidth, video.videoHeight);
    this.sourceImageName = `camera-capture-${Date.now()}.jpg`;
    this.stopMediaStream();
  }

  stopCamera(): void {
    this.stopMediaStream();
    this.stage.set('capture');
  }

  private stopMediaStream(): void {
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
  }

  get lineItems(): FormArray {
    return this.form!.get('lineItems') as FormArray;
  }

  switchToHistory(): void {
    this.activeTab.set('history');
    this.loadHistory();
  }

  loadHistory(): void {
    this.historyLoading.set(true);
    this.invoiceService.getAll().subscribe({
      next: (data) => { this.invoices.set(data); this.historyLoading.set(false); },
      error: () => { this.historyLoading.set(false); }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.sourceImageName = file.name;
    input.value = '';

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => this.processImageSource(img, img.width, img.height);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  private processImageSource(source: CanvasImageSource, sourceWidth: number, sourceHeight: number): void {
    const maxDim = 1600;
    let width = sourceWidth;
    let height = sourceHeight;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width *= scale;
      height *= scale;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(source, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    this.previewImage.set(dataUrl);
    const base64 = dataUrl.split(',')[1];

    this.stage.set('extracting');
    this.errorMessage.set('');

    this.invoiceService.extract(base64, 'image/jpeg').subscribe({
      next: (extracted) => this.populateForm(extracted),
      error: (err) => {
        this.errorMessage.set(err.friendlyMessage || 'Could not read this invoice. Try a clearer, well-lit photo.');
        this.stage.set('capture');
      }
    });
  }

  private populateForm(data: ExtractedInvoice): void {
    this.extractionNotes.set(data.extractionNotes ?? null);

    this.form = this.fb.group({
      vendorName: [data.vendorName, Validators.required],
      vendorAddress: [data.vendorAddress ?? ''],
      invoiceNumber: [data.invoiceNumber ?? ''],
      invoiceDate: [data.invoiceDate ?? ''],
      currency: [data.currency || 'INR', Validators.required],
      subtotal: [data.subtotal ?? 0],
      taxAmount: [data.taxAmount ?? 0],
      totalAmount: [data.totalAmount ?? 0, Validators.required],
      lineItems: this.fb.array((data.lineItems ?? []).map(li => this.buildLineGroup(li)))
    });

    this.stage.set('preview');
  }

  private buildLineGroup(li?: { description: string; quantity: number; unitPrice: number; lineTotal: number }): FormGroup {
    return this.fb.group({
      description: [li?.description ?? ''],
      quantity: [li?.quantity ?? 1],
      unitPrice: [li?.unitPrice ?? 0],
      lineTotal: [li?.lineTotal ?? 0]
    });
  }

  addLine(): void {
    this.lineItems.push(this.buildLineGroup());
  }

  removeLine(index: number): void {
    this.lineItems.removeAt(index);
  }

  recalcLine(index: number): void {
    const group = this.lineItems.at(index);
    const qty = Number(group.get('quantity')?.value) || 0;
    const price = Number(group.get('unitPrice')?.value) || 0;
    group.get('lineTotal')?.setValue(+(qty * price).toFixed(2));
  }

  save(): void {
    if (!this.form || this.form.invalid) return;
    this.saving.set(true);
    this.errorMessage.set('');

    const payload = { ...this.form.value, sourceImageName: this.sourceImageName };

    this.invoiceService.save(payload).subscribe({
      next: (summary) => {
        this.saving.set(false);
        this.savedInvoice.set(summary);
        this.stage.set('saved');
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.friendlyMessage || 'Failed to save invoice.');
      }
    });
  }

  discard(): void {
    this.reset();
  }

  reset(): void {
    this.stage.set('capture');
    this.form = null;
    this.previewImage.set('');
    this.errorMessage.set('');
    this.extractionNotes.set(null);
    this.savedInvoice.set(null);
    this.sourceImageName = '';
  }

  deleteInvoice(inv: InvoiceSummary): void {
    this.invoiceService.delete(inv.id).subscribe({
      next: () => this.loadHistory(),
      error: (err) => this.errorMessage.set(err.friendlyMessage || 'Failed to delete invoice.')
    });
  }
}
