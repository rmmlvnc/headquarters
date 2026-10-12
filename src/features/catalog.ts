export const spaces = [
  { id: 'standard', name: 'Standard Station', category: 'Desk', rate: 35, capacity: 12, image: require('../../assets/images/hq-standard.jpg') },
  { id: 'private', name: 'Private Station', category: 'Desk', rate: 55, capacity: 6, image: require('../../assets/images/hq-private-stations.jpg') },
  { id: 'premium', name: 'Premium Solo', category: 'Desk', rate: 75, capacity: 4, image: require('../../assets/images/hq-premium-solo.jpg') },
  { id: 'meeting', name: 'Meeting Room', category: 'Room', rate: 250, capacity: 2, image: require('../../assets/images/hq-collab.jpg') },
];
export const plans = [
  { id: 'daily', name: 'Daily Pass', price: 250, days: 1, hours: 8 },
  { id: 'flex', name: 'Flex Membership', price: 1800, days: 30, hours: 60 },
  { id: 'pro', name: 'Pro Membership', price: 3200, days: 30, hours: 120 },
];
export const equipment = [
  { id: 'laptop', name: 'Laptop', rate: 50, capacity: 4 },
  { id: 'projector', name: 'Projector', rate: 80, capacity: 2 },
  { id: 'locker', name: 'Locker', rate: 10, capacity: 10 },
];
export type Booking = {
  id: string; spaceId: string; unit?: number; start: number; end: number; hours: number;
  addons: string[]; total: number; status: 'reserved' | 'checked-in' | 'completed' | 'cancelled';
  created: number; checkedIn?: number; checkedOut?: number; overtime?: number; refund?: number;
};
export type Membership = { planId: string; expires: number; remaining: number };
export type Purchase = { id: string; title: string; amount: number; created: number };
export type Store = { bookings: Booking[]; membership: Membership | null; purchases: Purchase[]; notices: string[]; favorites: string[] };
export const emptyStore: Store = { bookings: [], membership: null, purchases: [], notices: [], favorites: [] };
export const money = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const active = (b: Booking) => b.status === 'reserved' || b.status === 'checked-in';
export const overlaps = (b: Booking, start: number, end: number) => active(b) && b.start < end && b.end > start;
export function available(bookings: Booking[], resource: string, capacity: number, start: number, end: number, exclude?: string) {
  const matching = bookings.filter(b => b.id !== exclude && overlaps(b, start, end) && (b.spaceId === resource || b.addons.includes(resource)));
  const points = [start, ...matching.map(b => Math.max(start, b.start))];
  const peak = Math.max(0, ...points.map(t => matching.filter(b => b.start <= t && b.end > t).length));
  return Math.max(0, capacity - peak);
}
export function cancellationRefund(b: Booking, now: number) {
  return b.status === 'reserved' && b.start - now >= 24 * 3600000 ? b.total : 0;
}
export function overtimeCharge(b: Booking, now: number, rate: number) {
  return Math.max(0, Math.ceil((now - b.end) / 3600000)) * rate;
}

