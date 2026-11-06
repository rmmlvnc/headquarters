import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const plans: Record<string, { title: string; amount: number }> = {
  'standard-5': { title: 'Standard 5-Hour Pass', amount: 205 }, 'private-5': { title: 'Private 5-Hour Pass', amount: 270 }, 'huddle-5': { title: 'Huddle Room 5-Hour Pass', amount: 1260 },
  'standard-8': { title: 'Standard 8-Hour Pass', amount: 325 }, 'private-8': { title: 'Private 8-Hour Pass', amount: 430 }, 'huddle-8': { title: 'Huddle Room 8-Hour Pass', amount: 2015 },
  'standard-10': { title: 'Standard 10-Hour Pass', amount: 385 }, 'private-10': { title: 'Private 10-Hour Pass', amount: 510 }, 'huddle-10': { title: 'Huddle Room 10-Hour Pass', amount: 2380 },
  'standard-12': { title: 'Standard 12-Hour Pass', amount: 460 }, 'private-12': { title: 'Private 12-Hour Pass', amount: 610 }, 'huddle-12': { title: 'Huddle Room 12-Hour Pass', amount: 2855 },
  'standard-week': { title: 'Standard Stations · 1-Week Subscription', amount: 980 }, 'standard-month': { title: 'Standard Stations · 1-Month Subscription', amount: 4340 },
  'private-week': { title: 'Private Stations · 1-Week Subscription', amount: 1540 }, 'private-month': { title: 'Private Stations · 1-Month Subscription', amount: 6820 },
  'premium-solo-week': { title: 'Premium Solo · 1-Week Subscription', amount: 3570 }, 'premium-solo-month': { title: 'Premium Solo · 1-Month Subscription', amount: 14400 },
  'premium-trio-week': { title: 'Premium Trio · 1-Week Subscription', amount: 5710 }, 'premium-trio-month': { title: 'Premium Trio · 1-Month Subscription', amount: 23040 },
  'lifting-week': { title: 'Lifting Table · 1-Week Subscription', amount: 2140 }, 'lifting-month': { title: 'Lifting Table · 1-Month Subscription', amount: 8370 },
  'collab-week': { title: 'Collab Area · 1-Week Subscription', amount: 1680 }, 'collab-month': { title: 'Collab Area · 1-Month Subscription', amount: 7370 },
  'lounge-week': { title: 'Lounge Area · 1-Week Subscription', amount: 1190 }, 'lounge-month': { title: 'Lounge Area · 1-Month Subscription', amount: 4650 },
};
const promos: Record<string, { title: string; amount: number; spaceId: string; hours: number }> = {
  'standard-day': { title: 'Standard Day Pass + Laptop', amount: 799, spaceId: 'standard', hours: 12 }, 'standard-night': { title: 'Standard Overnight Pass + Laptop', amount: 749, spaceId: 'standard', hours: 12 },
  'private-day': { title: 'Private Day Pass + Laptop', amount: 849, spaceId: 'private', hours: 12 }, 'private-night': { title: 'Private Overnight Pass + Laptop', amount: 899, spaceId: 'private', hours: 12 },
  'standard-five': { title: 'Standard 5-Hour Pass + Laptop', amount: 329, spaceId: 'standard', hours: 5 }, 'private-five': { title: 'Private 5-Hour Pass + Laptop', amount: 349, spaceId: 'private', hours: 5 },
};
const spaceRates: Record<string, { title: string; rate: number }> = {
  standard: { title: 'Standard Station', rate: 45 }, private: { title: 'Private Station', rate: 60 }, meeting: { title: 'Huddle Room', rate: 280 },
};
const addOnRates: Record<string, number> = { laptop: 50, projector: 80, locker: 10 };
const laptopPackages: Record<number, number> = { 1: 50, 4: 180, 8: 300 };

function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function fail(message: string, status = 400) { return response({ error: message }, status); }
function quote(purchase: Record<string, unknown>) {
  if (purchase.kind === 'membership') {
    const plan = plans[String(purchase.planId)];
    if (!plan) throw new Error('This membership plan is unavailable.');
    return plan;
  }
  if (purchase.kind !== 'booking') throw new Error('Unknown purchase type.');
  const spaceId = String(purchase.spaceId), hours = Number(purchase.hours), addons = Array.isArray(purchase.addons) ? purchase.addons.map(String) : [];
  const space = spaceRates[spaceId];
  if (!space || !Number.isInteger(hours) || hours < 1 || hours > 24) throw new Error('Invalid booking details.');
  const promo = purchase.promoId ? promos[String(purchase.promoId)] : undefined;
  if (promo) {
    if (promo.spaceId !== spaceId || promo.hours !== hours || !addons.includes('laptop')) throw new Error('The selected promo no longer matches this booking.');
    return promo;
  }
  const invalidAddOn = addons.some(id => !(id in addOnRates));
  if (invalidAddOn || new Set(addons).size !== addons.length) throw new Error('Invalid booking add-on.');
  const laptopPackage = purchase.laptopRentalHours ? laptopPackages[Number(purchase.laptopRentalHours)] : undefined;
  if (purchase.laptopRentalHours && !addons.includes('laptop')) throw new Error('A laptop package requires a laptop add-on.');
  const addOnTotal = addons.reduce((total, id) => total + (id === 'laptop' && laptopPackage ? 0 : addOnRates[id] * hours), 0);
  return { title: `${space.title} booking`, amount: space.rate * hours + addOnTotal + (laptopPackage || 0) };
}

function paypalApiBase(environment: 'sandbox' | 'live') {
  return environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

async function paypalToken(clientId: string, secret: string, apiBase: string) {
  const auth = btoa(`${clientId}:${secret}`);
  const result = await fetch(`${apiBase}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!result.ok) throw new Error('PayPal authentication failed. Check the configured PayPal credentials.');
  return (await result.json()).access_token as string;
}

async function notifyPaymentConfirmed(admin: ReturnType<typeof createClient>, userId: string, title: string, reservationId: string | null) {
  try {
    const { data: tokens } = await admin.from('hq_push_tokens').select('token').eq('user_id', userId);
    if (!tokens?.length) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(tokens.map(({ token }: { token: string }) => ({
        to: token,
        title: 'Payment confirmed',
        body: `${title} has been paid successfully.`,
        data: { url: reservationId ? '/home?view=Bookings' : '/home?view=Payments' },
        channelId: 'headquarters',
      }))),
    });
  } catch {
    // A notification failure must not undo an already captured PayPal payment.
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return fail('Sign in before starting PayPal checkout.', 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return fail('Your session has expired. Sign in again.', 401);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await request.json() as Record<string, unknown>;
    const environment = Deno.env.get('PAYPAL_ENVIRONMENT') === 'live' ? 'live' : 'sandbox';
    const clientId = environment === 'live'
      ? Deno.env.get('PAYPAL_CLIENT_ID')
      : Deno.env.get('PAYPAL_CLIENT_ID') ?? Deno.env.get('PAYPAL_SANDBOX_CLIENT_ID');
    const secret = environment === 'live'
      ? Deno.env.get('PAYPAL_CLIENT_SECRET')
      : Deno.env.get('PAYPAL_CLIENT_SECRET') ?? Deno.env.get('PAYPAL_SANDBOX_CLIENT_SECRET');
    if (!clientId || !secret) return fail('PayPal is not configured on the server.', 503);
    const apiBase = paypalApiBase(environment);
    const token = await paypalToken(clientId, secret, apiBase);

    if (body.action === 'create') {
      const purchase = body.purchase as Record<string, unknown>;
      let reservationId: string | null = null;
      let item: { title: string; amount: number };
      if (purchase.kind === 'booking') {
        reservationId = String(purchase.reservationId || '');
        if (!reservationId) return fail('Create the reservation before starting PayPal checkout.', 422);
        const { data: reservation, error: reservationError } = await admin
          .from('hq_reservations')
          .select('id, quoted_total, starts_at, ends_at, status, resource:hq_resources(name)')
          .eq('id', reservationId).eq('user_id', user.id).maybeSingle();
        if (reservationError || !reservation) return fail('Reservation not found.', 404);
        if (reservation.status !== 'reserved' || new Date(reservation.ends_at).getTime() <= Date.now()) {
          return fail('This reservation can no longer be paid for.', 422);
        }
        const resource = Array.isArray(reservation.resource) ? reservation.resource[0] : reservation.resource;
        item = { title: `${resource?.name || 'HeadQuarters'} booking`, amount: Number(reservation.quoted_total) };
      } else {
        item = quote(purchase);
      }
      const createOrder = await fetch(`${apiBase}/v2/checkout/orders`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': crypto.randomUUID() },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{ description: item.title, amount: { currency_code: 'PHP', value: item.amount.toFixed(2) } }],
          payment_source: {
            paypal: {
              experience_context: {
                return_url: 'headquartersapp://paypal-return',
                cancel_url: 'headquartersapp://paypal-return?cancelled=1',
                user_action: 'PAY_NOW',
                landing_page: 'LOGIN',
                shipping_preference: 'NO_SHIPPING',
              },
            },
          },
        }),
      });
      if (!createOrder.ok) throw new Error('PayPal could not create the order.');
      const order = await createOrder.json();
      const approveUrl = order.links?.find((link: { rel: string }) => link.rel === 'payer-action' || link.rel === 'approve')?.href;
      if (!order.id || !approveUrl) throw new Error('PayPal did not return an approval link.');
      const { error } = await admin.from('hq_paypal_orders').insert({ user_id: user.id, order_id: order.id, purchase_kind: purchase.kind, title: item.title, amount: item.amount, reservation_id: reservationId });
      if (error) throw new Error('Could not save the PayPal order.');
      return response({ orderId: order.id, approveUrl, amount: item.amount.toFixed(2), title: item.title });
    }

    if (body.action === 'capture') {
      const orderId = String(body.orderId || '');
      const { data: record, error } = await admin.from('hq_paypal_orders').select('*').eq('order_id', orderId).eq('user_id', user.id).maybeSingle();
      if (error || !record) return fail('This PayPal order was not created for your account.', 404);
      if (record.status === 'captured') return response({ orderId, status: 'COMPLETED', amount: Number(record.amount).toFixed(2) });
      const capture = await fetch(`${apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': crypto.randomUUID() } });
      const captured = await capture.json();
      if (!capture.ok || captured.status !== 'COMPLETED') { await admin.from('hq_paypal_orders').update({ status: 'failed' }).eq('id', record.id); return fail('PayPal did not confirm this payment.', 422); }
      const amount = Number(record.amount);
      await admin.from('hq_paypal_orders').update({ status: 'captured', captured_at: new Date().toISOString() }).eq('id', record.id);
      const { error: paymentError } = await admin.from('hq_payments').insert({
        user_id: user.id,
        reservation_id: record.reservation_id,
        amount,
        status: 'paid',
        provider_reference: `paypal-${environment}:${orderId}`,
      });
      if (paymentError) throw new Error('PayPal was approved, but the payment record could not be saved. Please contact staff with your PayPal order ID.');
      await notifyPaymentConfirmed(admin, user.id, record.title, record.reservation_id);
      return response({ orderId, status: 'COMPLETED', amount: amount.toFixed(2) });
    }
    return fail('Unknown PayPal action.');
  } catch (error) { return fail(error instanceof Error ? error.message : 'PayPal checkout failed.', 500); }
});
