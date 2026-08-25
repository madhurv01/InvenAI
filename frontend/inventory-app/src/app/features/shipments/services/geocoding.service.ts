import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GeocodeResult } from '../../../shared/models/models';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Free, open-source geocoding via OpenStreetMap's public Nominatim API — no key, no billing.
 * Called directly from the browser; callers should debounce input to stay within Nominatim's
 * fair-use policy (max ~1 request/second).
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';

  constructor(private http: HttpClient) {}

  search(query: string): Observable<GeocodeResult[]> {
    if (!query || query.trim().length < 3) return new Observable(sub => { sub.next([]); sub.complete(); });

    return this.http.get<NominatimResult[]>(`${this.baseUrl}/search`, {
      params: { q: query, format: 'json', limit: '6', addressdetails: '0' }
    }).pipe(
      map(results => results.map(r => ({
        displayName: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon)
      })))
    );
  }

  reverse(lat: number, lng: number): Observable<GeocodeResult> {
    return this.http.get<NominatimResult>(`${this.baseUrl}/reverse`, {
      params: { lat: String(lat), lon: String(lng), format: 'json' }
    }).pipe(
      map(r => ({ displayName: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }))
    );
  }
}
