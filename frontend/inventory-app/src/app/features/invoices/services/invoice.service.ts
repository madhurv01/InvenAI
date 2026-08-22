import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ExtractedInvoice, InvoiceSummary, SaveInvoiceRequest } from '../../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  constructor(private api: ApiService) {}

  extract(imageBase64: string, mimeType: string): Observable<ExtractedInvoice> {
    return this.api.post<ExtractedInvoice>('/invoices/extract', { imageBase64, mimeType });
  }

  save(payload: SaveInvoiceRequest): Observable<InvoiceSummary> {
    return this.api.post<InvoiceSummary>('/invoices', payload);
  }

  getAll(): Observable<InvoiceSummary[]> {
    return this.api.get<InvoiceSummary[]>('/invoices');
  }

  downloadPdf(id: string, fileName: string): void {
    this.api.getBlob(`/invoices/${id}/pdf`).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/invoices/${id}`);
  }
}
