import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
