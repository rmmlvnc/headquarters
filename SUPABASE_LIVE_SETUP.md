# HeadQuarters live-service checklist

Run this checklist before building the final APK. The mobile application uses a hosted Supabase project; never use `localhost` URLs or a service-role key in the app.

## 1. Apply the database migrations

In **Supabase Dashboard → SQL Editor**, run these files once, in this order:

1. `supabase/migrations/20261013_admin.sql` (only if it has never been run)
2. `supabase/migrations/20261105_paypal_sandbox.sql`
3. `supabase/migrations/20261105_secure_qr_access.sql`
4. `supabase/migrations/20261105_member_booking_payment_link.sql`
5. `supabase/migrations/20261105_push_notifications.sql`

## 2. Configure live authentication

In **Authentication → Providers → Email**, enable **Confirm email**. In **Authentication → URL Configuration**, add:

```
headquartersapp://verified
headquartersapp://paypal-return
```

The app already sends registration through `emailRedirectTo: "headquartersapp://verified"`. Configure a custom SMTP provider if you need reliable delivery beyond Supabase's development email limits.

## 3. Deploy the API

From this project folder, authenticate and deploy after configuring the PayPal secrets in Supabase:

```powershell
npx supabase login
npx supabase functions deploy paypal-order
```

The function creates and captures PayPal orders on the server, records the payment in `hq_payments`, and sends an Expo Push receipt to registered devices.

## 4. Configure Android push credentials

In Expo/EAS, add the Android Firebase Cloud Messaging v1 credentials for this app. Push notifications require an installed development or production build; they do not work in Expo Go. The app registers its Expo push token in `hq_push_tokens` after the customer allows notifications.

## 5. Test before APK packaging

- Register a new customer and confirm the email.
- Sign in on a physical Android device and allow notifications.
- Confirm a sandbox PayPal booking.
- Check `hq_reservations`, `hq_payments`, and `hq_push_tokens` in Supabase.
- Generate the QR access pass and scan it using the staff account.

Only when each test passes should you use the `production` EAS profile to create the APK/AAB.
