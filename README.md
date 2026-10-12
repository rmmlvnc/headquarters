# HeadQuarters Iligan

Expo SDK 57 coworking reservation and membership app.

## Authentication backend

Login and registration use the configured Supabase Authentication project. Supabase manages user identities and password verification; this app sends passwords only to its authentication API and does not store passwords itself. Full name and mobile number are stored in the user's authentication metadata. Metadata must never be trusted for staff roles.

The app restores persisted sessions, refreshes sessions while native apps are active, protects Home and Profile with Expo Router guards, displays authentication errors, and supports sign-out on this device. Demo bookings are stored separately for each authenticated user ID. Legacy shared demo bookings are not imported into an account.

## Configuration

Copy `.env.example` to `.env` only if you do not already have `.env`. Set:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

The existing `EXPO_PUBLIC_SUPABASE_KEY` name is also supported. Use only a publishable or legacy anon key; never a secret/service-role key. The existing .env values were preserved.

In Supabase Dashboard, Authentication → Sign In / Providers, enable Email. The configured project's email provider was verified enabled, with confirmation required. Users register, open the confirmation email, then return to the app and log in. Configure Authentication → URL Configuration → Site URL to a real confirmation landing page before releasing; automatic mobile callback handling is not implemented. Password recovery in this app is not yet implemented.

Run `npm install`, then `npx expo start --clear` with Node 22.13 or newer.

## Manual authentication verification

1. Open Create account and register with an email address you control, a Philippine mobile number, and an 8+ character password including a number.
2. Confirm that a user appears in Supabase Dashboard → Authentication → Users. Registration must display email-confirmation instructions without granting member access.
3. Confirm your email and log in. Incorrect credentials must display an error and must not open Home.
4. Restart the app; your session should be restored.
5. Open Profile, verify name/email/mobile, and sign out. Direct access to Home/Profile should return to the public screens.
6. Log in as another account; local demo bookings from the first account must not appear.

## Booking demo limitations

Reservations, memberships, equipment, cancellation estimates, extra-hour bills, favorites, and reports remain local simulations. Payments are not collected. Capacity is not synchronized across devices. Real bookings require server-side capacity validation and database access policies. Member route guards are UI access controls; future database tables must enforce authorization using Row Level Security. The staff portal uses Supabase role checks and requires the migration described below.

## Checks

- `npx tsc --noEmit`
- `node scripts/test-auth.cjs`
- `node scripts/test-booking.cjs`
- `npx expo export --platform web`
- `npx expo export --platform android --output-dir dist-android`

Live email registration, confirmation delivery, session restoration on a physical phone, and sign-out should be tested with an account you control. Automated service checks use mocked Supabase responses and do not create remote accounts.

## Staff portal

See [supabase/SETUP.md](supabase/SETUP.md) for the new administrator area, one-time database migration, staff account assignment, supported operations, and integration limits. The public Admin demo has been removed.


## Reference-inspired mobile interface

The member app now uses a navy dashboard, compact white cards, purple actions, and fixed Home, Bookings, Check-in, Payments, and Profile navigation. The booking journey includes an illustrated seat selector, calendar/time selection, equipment, payment preview, confirmation, history, and cancellation. Membership plans, renewal, notifications, and support follow the same visual system. Seat labels are saved with local demo reservations; overlapping reservations cannot select the same seat.

The access pass is a manual demo identifier, not a scannable authorization credential. Payment methods are visual previews and collect no payment details or money. Live cross-device member booking and signed QR validation still require backend integration.
