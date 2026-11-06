export const spaces = [
  { id: 'standard', name: 'Standard Station', category: 'Desk', rate: 45, capacity: 12, image: require('../../assets/images/hq-standard-stations.png'), description: 'The “Get Things Done” zone. Built for marathon study sessions and affordable, consistent focus.', features: ['Open space', 'Ergonomic chairs'] },
  { id: 'private', name: 'Private Station', category: 'Desk', rate: 60, capacity: 6, image: require('../../assets/images/hq-private-stations-new.png'), description: 'Need to lock in? Perfect for exam takers and anyone who needs an extra layer of privacy—just you, your goals, and zero distractions.', features: ['Enclosed space', 'Noise-free', 'Upgraded ergonomic chairs'] },
  { id: 'meeting', name: 'Huddle Room', category: 'Room', rate: 280, capacity: 8, image: require('../../assets/images/hq-huddle-room.png'), description: 'Group work without the “shhhh!” Your team’s private space to brainstorm, hold meetings, or power through group projects comfortably.', features: ['2+ pax', 'Noise-allowed area', 'Own aircon', 'Own LAN cable · Premium Rooms only'] },
];
export const plans = [
  { id: 'standard-5', name: 'Standard 5-Hour Pass', spaceId: 'standard', price: 205, originalPrice: 225, discount: 10, days: 1, hours: 5, freeHours: 1, unlimited: false },
  { id: 'private-5', name: 'Private 5-Hour Pass', spaceId: 'private', price: 270, originalPrice: 300, discount: 10, days: 1, hours: 5, freeHours: 1, unlimited: false },
  { id: 'huddle-5', name: 'Huddle Room 5-Hour Pass', spaceId: 'meeting', price: 1260, originalPrice: 1400, discount: 10, days: 1, hours: 5, freeHours: 0, unlimited: false },
  { id: 'standard-8', name: 'Standard 8-Hour Pass', spaceId: 'standard', price: 325, originalPrice: 360, discount: 10, days: 1, hours: 8, freeHours: 2, unlimited: false },
  { id: 'private-8', name: 'Private 8-Hour Pass', spaceId: 'private', price: 430, originalPrice: 480, discount: 10, days: 1, hours: 8, freeHours: 2, unlimited: false },
  { id: 'huddle-8', name: 'Huddle Room 8-Hour Pass', spaceId: 'meeting', price: 2015, originalPrice: 2240, discount: 10, days: 1, hours: 8, freeHours: 0, unlimited: false },
  { id: 'standard-10', name: 'Standard 10-Hour Pass', spaceId: 'standard', price: 385, originalPrice: 450, discount: 15, days: 1, hours: 10, freeHours: 3, unlimited: false },
  { id: 'private-10', name: 'Private 10-Hour Pass', spaceId: 'private', price: 510, originalPrice: 600, discount: 15, days: 1, hours: 10, freeHours: 3, unlimited: false },
  { id: 'huddle-10', name: 'Huddle Room 10-Hour Pass', spaceId: 'meeting', price: 2380, originalPrice: 2800, discount: 15, days: 1, hours: 10, freeHours: 0, unlimited: false },
  { id: 'standard-12', name: 'Standard 12-Hour Pass', spaceId: 'standard', price: 460, originalPrice: 540, discount: 15, days: 1, hours: 12, freeHours: 4, unlimited: false },
  { id: 'private-12', name: 'Private 12-Hour Pass', spaceId: 'private', price: 610, originalPrice: 720, discount: 15, days: 1, hours: 12, freeHours: 4, unlimited: false },
  { id: 'huddle-12', name: 'Huddle Room 12-Hour Pass', spaceId: 'meeting', price: 2855, originalPrice: 3360, discount: 15, days: 1, hours: 12, freeHours: 0, unlimited: false },
  { id: 'standard-week', name: 'Standard Stations · 1-Week Subscription', spaceId: 'standard', price: 980, originalPrice: 980, discount: 0, days: 7, hours: 0, freeHours: 0, unlimited: true },
  { id: 'standard-month', name: 'Standard Stations · 1-Month Subscription', spaceId: 'standard', price: 4340, originalPrice: 4340, discount: 0, days: 30, hours: 0, freeHours: 0, unlimited: true },
  { id: 'private-week', name: 'Private Stations · 1-Week Subscription', spaceId: 'private', price: 1540, originalPrice: 1540, discount: 0, days: 7, hours: 0, freeHours: 0, unlimited: true },
  { id: 'private-month', name: 'Private Stations · 1-Month Subscription', spaceId: 'private', price: 6820, originalPrice: 6820, discount: 0, days: 30, hours: 0, freeHours: 0, unlimited: true },
  { id: 'premium-solo-week', name: 'Premium Solo · 1-Week Subscription', spaceId: 'premium-solo', price: 3570, originalPrice: 3570, discount: 0, days: 7, hours: 0, freeHours: 0, unlimited: true },
  { id: 'premium-solo-month', name: 'Premium Solo · 1-Month Subscription', spaceId: 'premium-solo', price: 14400, originalPrice: 14400, discount: 0, days: 30, hours: 0, freeHours: 0, unlimited: true },
  { id: 'premium-trio-week', name: 'Premium Trio · 1-Week Subscription', spaceId: 'premium-trio', price: 5710, originalPrice: 5710, discount: 0, days: 7, hours: 0, freeHours: 0, unlimited: true },
  { id: 'premium-trio-month', name: 'Premium Trio · 1-Month Subscription', spaceId: 'premium-trio', price: 23040, originalPrice: 23040, discount: 0, days: 30, hours: 0, freeHours: 0, unlimited: true },
  { id: 'lifting-week', name: 'Lifting Table · 1-Week Subscription', spaceId: 'lifting-table', price: 2140, originalPrice: 2140, discount: 0, days: 7, hours: 0, freeHours: 0, unlimited: true },
  { id: 'lifting-month', name: 'Lifting Table · 1-Month Subscription', spaceId: 'lifting-table', price: 8370, originalPrice: 8370, discount: 0, days: 30, hours: 0, freeHours: 0, unlimited: true },
  { id: 'collab-week', name: 'Collab Area · 1-Week Subscription', spaceId: 'collab-area', price: 1680, originalPrice: 1680, discount: 0, days: 7, hours: 0, freeHours: 0, unlimited: true },
  { id: 'collab-month', name: 'Collab Area · 1-Month Subscription', spaceId: 'collab-area', price: 7370, originalPrice: 7370, discount: 0, days: 30, hours: 0, freeHours: 0, unlimited: true },
  { id: 'lounge-week', name: 'Lounge Area · 1-Week Subscription', spaceId: 'lounge-area', price: 1190, originalPrice: 1190, discount: 0, days: 7, hours: 0, freeHours: 0, unlimited: true },
  { id: 'lounge-month', name: 'Lounge Area · 1-Month Subscription', spaceId: 'lounge-area', price: 4650, originalPrice: 4650, discount: 0, days: 30, hours: 0, freeHours: 0, unlimited: true },
];
export const equipment = [
  { id: 'laptop', name: 'Laptop', rate: 50, capacity: 4 },
  { id: 'projector', name: 'Projector', rate: 80, capacity: 2 },
  { id: 'locker', name: 'Locker', rate: 10, capacity: 10 },
];
export const laptopRentalRates = [
  { hours: 1, price: 50, label: '1 hour' },
  { hours: 4, price: 180, label: '4 hours' },
  { hours: 8, price: 300, label: '8 hours' },
] as const;
export const laptopSpecifications = ['Intel processor', '8 GB RAM', '256 GB SSD', '60 Hz display', 'Windows OS'] as const;
export const laptopMonthlyRate = '₱2,500–₱4,000';
export const stationLaptopPromos = [
  { id: 'standard-day', name: 'Standard Day Pass', spaceId: 'standard', price: 799, hours: 12, window: 'DAYTIME · 6 AM – 6 PM' },
  { id: 'standard-night', name: 'Standard Overnight Pass', spaceId: 'standard', price: 749, hours: 12, window: 'OVERNIGHT · 6 PM – 6 AM' },
  { id: 'private-day', name: 'Private Day Pass', spaceId: 'private', price: 849, hours: 12, window: 'DAYTIME · 6 AM – 6 PM' },
  { id: 'private-night', name: 'Private Overnight Pass', spaceId: 'private', price: 899, hours: 12, window: 'OVERNIGHT · 6 PM – 6 AM' },
  { id: 'standard-five', name: 'Standard 5-Hour Pass', spaceId: 'standard', price: 329, hours: 5, window: 'OPEN TIME' },
  { id: 'private-five', name: 'Private 5-Hour Pass', spaceId: 'private', price: 349, hours: 5, window: 'OPEN TIME' },
] as const;
export type Booking = {
  id: string; spaceId: string; unit?: number; start: number; end: number; hours: number;
  addons: string[]; total: number; status: 'reserved' | 'checked-in' | 'completed' | 'cancelled';
  created: number; paymentMethod?: 'paypal_sandbox' | 'cash'; paymentStatus?: 'pending' | 'paid'; checkedIn?: number; checkedOut?: number; overtime?: number; refund?: number;
};
export type Membership = { planId: string; expires: number; remaining: number };
export type Purchase = { id: string; title: string; amount: number; created: number; paymentMethod?: 'paypal_sandbox' | 'cash'; paymentStatus?: 'pending' | 'paid' };
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

