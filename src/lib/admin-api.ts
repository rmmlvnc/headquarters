import { requireSupabase } from './supabase';
export type Resource = { id:string; name:string; kind:'Desk'|'Room'|'Equipment'; capacity:number; hourly_rate:number; active:boolean };
export type Plan = { id:string; name:string; price:number; valid_days:number; included_hours:number; active:boolean };
export type Reservation = { id:string; user_id:string; resource_id:string; starts_at:string; ends_at:string; status:string; quoted_total:number; overtime_due:number; refund_estimate:number; created_at:string };
export type Member = {id:string; email:string; full_name:string; mobile_number:string};
export type Membership = {id:string;user_id:string;plan_id:string;expires_at:string;remaining_hours:number;status:string};
export type Payment = {id:string;amount:number;status:string;created_at:string;provider_reference:string|null};
export type Refund = {id:string;reservation_id:string;amount:number;reason:string;status:string};
export type Audit = {id:number;actor:string;action:string;record_id:string;created_at:string};
export type AdminData = { resources:Resource[]; plans:Plan[]; reservations:Reservation[]; members:Member[]; memberships:Membership[]; payments:Payment[]; refunds:Refund[]; audit:Audit[]; cutoff:number };
export async function isStaff() {
 const {data,error}=await requireSupabase().rpc('hq_is_admin');
 if(error) throw new Error('Staff database setup is missing or unavailable. Run the admin SQL migration, then retry.');
 return data===true;
}
export async function loadAdmin():Promise<AdminData> {
 if(!await isStaff()) throw new Error('Access denied. Your account has not been assigned a staff role.');
 const client=requireSupabase();
 const requests = [
  client.from('hq_resources').select('*').order('name').limit(500),
  client.from('hq_plans').select('*').order('price').limit(500),
  client.from('hq_reservations').select('*').order('starts_at',{ascending:false}).limit(500),
  client.rpc('hq_list_members'),
  client.from('hq_memberships').select('*').order('expires_at',{ascending:false}).limit(500),
  client.from('hq_payments').select('*').order('created_at',{ascending:false}).limit(500),
  client.from('hq_refunds').select('*').order('created_at',{ascending:false}).limit(500),
  client.from('hq_audit').select('*').order('created_at',{ascending:false}).limit(100),
  client.from('hq_policy').select('*').eq('id',1).single(),
 ];
 const results=await Promise.all(requests);
 for(const r of results) if(r.error) throw r.error;
 return {resources:results[0].data as Resource[],plans:results[1].data as Plan[],reservations:results[2].data as Reservation[],members:results[3].data as Member[],memberships:results[4].data as Membership[],payments:results[5].data as Payment[],refunds:results[6].data as Refund[],audit:results[7].data as Audit[],cutoff:(results[8].data as {free_cancellation_hours:number}).free_cancellation_hours};
}
export async function adminRpc(name:string,args:Record<string,unknown>) {
 const {error}=await requireSupabase().rpc(name,args); if(error) throw error;
}
export async function saveResource(value:Omit<Resource,'id'>,id?:string) {
 const q=requireSupabase().from('hq_resources');
 const {error}=id?await q.update(value).eq('id',id):await q.insert(value); if(error) throw error;
}
export async function savePlan(value:Omit<Plan,'id'>,id?:string) {
 const q=requireSupabase().from('hq_plans');
 const {error}=id?await q.update(value).eq('id',id):await q.insert(value); if(error) throw error;
}
export async function savePolicy(hours:number) {
 const {error}=await requireSupabase().from('hq_policy').update({free_cancellation_hours:hours}).eq('id',1); if(error) throw error;
}
export function financialTotals(payments:Payment[]) {
 return {collected:payments.filter(p=>p.status==='paid').reduce((n,p)=>n+Number(p.amount),0),refunded:payments.filter(p=>p.status==='refunded').reduce((n,p)=>n+Number(p.amount),0)};
}
export function iliganTime(value:string) {
 if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) throw new Error('Use YYYY-MM-DD HH:mm for Iligan time.');
 const time=Date.parse(value.replace(' ','T')+':00+08:00');
 if(!Number.isFinite(time)||new Date(time+8*3600000).toISOString().slice(0,16).replace('T',' ')!==value) throw new Error('Enter a valid calendar date and time.');
 return new Date(time).toISOString();
}
