# PayPal checkout setup

The mobile app never receives a PayPal secret. The `paypal-order` Edge Function creates and captures the order on the server.

## 1. Apply the new database migration

Open Supabase Dashboard → **SQL Editor** → **New query**. Paste and run the contents of:

`supabase/migrations/20261105_paypal_sandbox.sql`

Do not run `20261013_admin.sql` again. It was the original migration that created `hq_staff`.

## 2. Configure PayPal

For the current test setup, in Supabase Dashboard → **Edge Functions** → **Secrets**, create these names exactly:

```text
PAYPAL_SANDBOX_CLIENT_ID
PAYPAL_SANDBOX_CLIENT_SECRET
```

Use the Client ID and Secret from your PayPal **Sandbox** app. Never put the secret in `.env`, `app.json`, or Expo public variables.

For real PayPal payments, use a PayPal Live app instead. Add these secrets and set the environment value shown below:

```text
PAYPAL_CLIENT_ID=<PayPal Live Client ID>
PAYPAL_CLIENT_SECRET=<PayPal Live Secret>
PAYPAL_ENVIRONMENT=live
```

Do not set `PAYPAL_ENVIRONMENT=live` until both Live credentials are saved. The app calls the production PayPal API only when that exact value is set.

Set the matching app display mode in the project `.env` before making a new app build:

```text
EXPO_PUBLIC_PAYPAL_ENVIRONMENT=live
```

Leave that value unset while testing with Sandbox credentials. It contains no secret; it only keeps the in-app payment wording consistent with the server mode.

## 3. Deploy the Edge Function

From the project folder, sign in and link the Supabase CLI if needed, then deploy:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_SUPABASE_PROJECT_REF
npx supabase functions deploy paypal-order
```

Keep JWT verification enabled. Customers must be signed in before they can create or capture an order.

## 4. Build and install the app

The PayPal return URL is `headquartersapp://paypal-return`. It requires an installed HeadQuarters development build or APK; Expo Go does not handle this custom scheme. After approval, PayPal redirects to that URL, the app captures the order, and the browser closes.

Create and install a new Android build after the code change. For the test setup, use a PayPal Sandbox **Personal** account to sign in and approve test purchases.

## Expected test result

1. Customer chooses **PayPal**.
2. HeadQuarters opens PayPal login.
3. Customer signs in with the Sandbox Personal account and approves the PHP amount.
4. PayPal returns to the app.
5. The Edge Function captures the order and stores a `paid` record in `hq_payments` and `hq_paypal_orders`.

Sandbox purchases never charge real money. For production, configure the Live credentials above, deploy the function again, add webhook verification, and test refunds before accepting customer payments.
