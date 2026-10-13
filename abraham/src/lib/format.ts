const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** $ 14.900 → "$14.900" (narrow, no space, as used in Argentine menus). */
export function formatPrice(value: number) {
  return ars.format(Math.round(value)).replace(/\s/g, '');
}

// Orders are always shown in Buenos Aires time, whatever the device timezone.
const timeZone = 'America/Argentina/Buenos_Aires';
const dateFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone });
const dateLongFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone });
const timeFmt = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso)).replace('.', '');
export const formatDateLong = (iso: string) => dateLongFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

export function formatExpiry(iso: string) {
  const d = new Date(`${iso}T23:59:59-03:00`);
  return `Vence el ${dateLongFmt.format(d)}`;
}

export function pluralize(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
