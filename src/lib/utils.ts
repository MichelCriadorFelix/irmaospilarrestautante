import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { BillingInfo } from "../types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Calculate distance in meters using Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export interface BrazilianAddressParts {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
}

async function tryGeocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Restaurante-App' }
    });
    const geodata = await res.json();
    if (geodata && geodata.length > 0) {
      return { lat: parseFloat(geodata[0].lat), lng: parseFloat(geodata[0].lon) };
    }
  } catch (e) {
    console.error('Geocoding request failed', e);
  }
  return null;
}

// Free-tier OpenStreetMap/Nominatim geocoding has real coverage gaps for
// minor residential streets in Brazil — a query that includes the exact
// street can come back completely empty even for a valid address. The old
// pattern of then falling back to a bare "CEP, Brasil" text search is
// actively dangerous: Nominatim can misparse the last digits of a CEP as
// an unrelated place/block number anywhere in the country. This instead
// backs off through progressively broader — but still geographically real
// — queries, and never touches the CEP as a bare search string. Worst case
// it resolves to the city center, which for a local delivery radius is
// always going to be far closer to correct than a CEP misparse in another
// state.
export async function geocodeBrazilianAddress(parts: BrazilianAddressParts): Promise<{ lat: number; lng: number } | null> {
  const { street, number, neighborhood, city, state, zip } = parts;

  if (street && city) {
    const full = [`${street} ${number || ''}`.trim(), neighborhood, `${city}${state ? ` - ${state}` : ''}`, zip]
      .filter(Boolean).join(', ') + ', Brasil';
    const result = await tryGeocode(full);
    if (result) return result;

    const streetCity = [`${street} ${number || ''}`.trim(), `${city}${state ? ` - ${state}` : ''}`]
      .filter(Boolean).join(', ') + ', Brasil';
    const result2 = await tryGeocode(streetCity);
    if (result2) return result2;
  }

  if (neighborhood && city) {
    const neighborhoodCity = `${neighborhood}, ${city}${state ? ` - ${state}` : ''}, Brasil`;
    const result = await tryGeocode(neighborhoodCity);
    if (result) return result;
  }

  if (city) {
    const cityOnly = `${city}${state ? ` - ${state}` : ''}, Brasil`;
    const result = await tryGeocode(cityOnly);
    if (result) return result;
  }

  return null;
}

// The two developer accounts that own billing/pause enforcement for this
// client's app — hardcoded rather than a Firestore-editable role, because
// the whole point is that the paying client (an admin) cannot grant this
// power to themselves or anyone else.
export const BILLING_ADMIN_EMAILS = ['michelgeminicriador@gmail.com', 'rafaelvitorsantos08@gmail.com'];

export function isBillingAdminEmail(email?: string | null): boolean {
  return !!email && BILLING_ADMIN_EMAILS.includes(email);
}

export interface BillingPauseState {
  paused: boolean;
  reason: 'launch_fee_overdue' | 'monthly_overdue' | null;
  deadline: number | null;
}

// Pause is always derived from stored timestamps, never a manually
// toggled flag — "unpausing" just means a developer confirms payment,
// which moves launchFeePaid/nextDueDate, which changes this result. No
// separate on/off switch exists to get out of sync with actual payment
// status.
export function getBillingPauseState(billing: BillingInfo | null | undefined): BillingPauseState {
  if (!billing) return { paused: false, reason: null, deadline: null };
  const now = Date.now();

  if (!billing.launchFeePaid) {
    const deadline = billing.launchFeeDeadline ?? null;
    const overdue = !!deadline && now > deadline;
    return { paused: overdue, reason: overdue ? 'launch_fee_overdue' : null, deadline };
  }

  if (billing.nextDueDate) {
    const graceDeadline = billing.nextDueDate + 48 * 60 * 60 * 1000;
    if (now > graceDeadline) {
      return { paused: true, reason: 'monthly_overdue', deadline: graceDeadline };
    }
    return { paused: false, reason: null, deadline: billing.nextDueDate };
  }

  return { paused: false, reason: null, deadline: null };
}

export function formatCountdown(deadline: number): string {
  const ms = deadline - Date.now();
  if (ms <= 0) return 'Prazo esgotado';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

// Compresses an image client-side to a base64 data URL small enough to
// store directly as a Firestore string field — this app stores receipt/
// proof images inline (see OrderDetails.tsx's compressImage) rather than
// via Storage, so proof-of-payment uploads follow the same pattern.
export function compressImageToBase64(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
