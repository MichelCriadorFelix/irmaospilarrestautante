import { CompanyInfo, DayHours } from '../types';

export const DEFAULT_OPENING_HOURS: { [key: string]: DayHours } = {
  '1': { isOpen: true, openTime: '11:00', closeTime: '23:00' }, // Monday
  '2': { isOpen: true, openTime: '11:00', closeTime: '23:00' }, // Tuesday
  '3': { isOpen: true, openTime: '11:00', closeTime: '23:00' }, // Wednesday
  '4': { isOpen: true, openTime: '11:00', closeTime: '23:00' }, // Thursday
  '5': { isOpen: true, openTime: '11:00', closeTime: '23:00' }, // Friday
  '6': { isOpen: true, openTime: '11:00', closeTime: '23:00' }, // Saturday
  '0': { isOpen: true, openTime: '11:00', closeTime: '23:00' }, // Sunday
};

export const DAY_NAMES: { [key: string]: string } = {
  '1': 'Segunda-feira',
  '2': 'Terça-feira',
  '3': 'Quarta-feira',
  '4': 'Quinta-feira',
  '5': 'Sexta-feira',
  '6': 'Sábado',
  '0': 'Domingo',
};

export const DAYS_ORDER = ['1', '2', '3', '4', '5', '6', '0'];

export function isStoreOpen(companyInfo: CompanyInfo | null): { isOpen: boolean; reason: string } {
  if (!companyInfo) return { isOpen: true, reason: '' };
  
  if (companyInfo.forceClosed) {
    return { isOpen: false, reason: 'O estabelecimento está temporariamente FECHADO para novos pedidos.' };
  }

  const hours = companyInfo.openingHours || DEFAULT_OPENING_HOURS;
  
  // Get current local date & time
  const now = new Date();
  const dayOfWeek = now.getDay().toString(); // '0' for Sunday, '1' for Monday, etc.
  const currentDayHours = hours[dayOfWeek] || DEFAULT_OPENING_HOURS[dayOfWeek];

  if (!currentDayHours || !currentDayHours.isOpen) {
    return { isOpen: false, reason: `Estamos FECHADOS hoje (${DAY_NAMES[dayOfWeek]}).` };
  }

  // Parse current time in minutes since start of day
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Parse open & close times
  const [openH, openM] = currentDayHours.openTime.split(':').map(Number);
  const [closeH, closeM] = currentDayHours.closeTime.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // Handle shifts crossing midnight (e.g., 18:00 to 02:00)
  if (closeMinutes < openMinutes) {
    if (currentMinutes >= openMinutes || currentMinutes < closeMinutes) {
      return { isOpen: true, reason: '' };
    }
  } else {
    // Normal shift (same day)
    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return { isOpen: true, reason: '' };
    }
  }

  return { 
    isOpen: false, 
    reason: `Estamos FECHADOS agora. Horário de funcionamento de hoje (${DAY_NAMES[dayOfWeek]}): das ${currentDayHours.openTime} às ${currentDayHours.closeTime}.` 
  };
}
