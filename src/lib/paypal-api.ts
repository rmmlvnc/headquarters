import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { requireSupabase } from './supabase';

export type PayPalPurchase =
  | { kind: 'booking'; reservationId: string }
  | { kind: 'membership'; planId: string };

export type PayPalOrder = { orderId: string; approveUrl: string; amount: string; title: string };
export type CapturedPayPalOrder = { orderId: string; status: 'COMPLETED'; amount: string };

async function functionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json() as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) return body.error;
    } catch {
      // The function may have returned a non-JSON platform error.
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function createPayPalOrder(purchase: PayPalPurchase) {
  const client = requireSupabase();
  const { data: createData, error: createError } = await client.functions.invoke<PayPalOrder>('paypal-order', {
    body: { action: 'create', purchase },
  });
  if (createError || !createData) throw new Error(await functionErrorMessage(createError, 'Unable to start PayPal checkout.'));
  return createData;
}

export async function capturePayPalOrder(orderId: string) {
  const client = requireSupabase();
  const { data: captureData, error: captureError } = await client.functions.invoke<CapturedPayPalOrder>('paypal-order', {
    body: { action: 'capture', orderId },
  });
  if (captureError || !captureData || captureData.status !== 'COMPLETED') {
    throw new Error(await functionErrorMessage(captureError, 'PayPal approval was not completed.'));
  }
  return captureData;
}

export async function payWithPayPalSandbox(purchase: PayPalPurchase) {
  const createData = await createPayPalOrder(purchase);
  const result = await WebBrowser.openAuthSessionAsync(createData.approveUrl, Linking.createURL('paypal-return'));
  if (result.type !== 'success') throw new Error('PayPal checkout was cancelled before payment approval.');

  const callback = new URL(result.url);
  if (callback.searchParams.get('cancelled') === '1') throw new Error('PayPal checkout was cancelled.');
  if (callback.searchParams.get('token') !== createData.orderId) throw new Error('The PayPal return did not match this checkout. Please try again.');

  return capturePayPalOrder(createData.orderId);
}
