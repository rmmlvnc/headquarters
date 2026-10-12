# Enable the HeadQuarters staff portal

The staff portal is implemented in the app and uses Supabase tables and server functions. The database migration has been validated in an isolated PostgreSQL runtime, but has NOT been applied to your hosted Supabase project. A publishable app key cannot run schema migrations or assign staff roles.

## One-time setup

1. In Supabase Dashboard, open **SQL Editor → New query**.
2. Paste the complete contents of `supabase/migrations/20261013_admin.sql` and select **Run**. Run this migration once; it uses a transaction, so a failure rolls back its changes. Do not rerun after a successful migration.
3. Register your staff account through the app and confirm its email.
4. Open `supabase/assign-admin.sql`, replace `REPLACE_WITH_YOUR_ADMIN_EMAIL` with that account's email, and run the script in SQL Editor. Verify that the output contains the intended email. Do not grant access to ordinary member accounts.
5. Restart Expo if needed, log in, and open **Profile → Staff portal**. Select **Refresh**.

To revoke staff access, the project owner can delete the intended user ID from `public.hq_staff` in the dashboard. Backend authorization checks apply to each operation; member accounts cannot insert themselves into that table or forge a role through profile metadata.

## Available operations

- Overview: checked-in visits, current resource reservations, active memberships, collected payments, and refund queue.
- Reservations: search/filter, create a future staff reservation for an existing user, check in during its booked window, check out with rounded extra-hour billing, and cancel with server-calculated refund eligibility.
- Spaces and equipment: add/edit inventory, capacity, hourly rates, and availability/maintenance status. Capacity means count of desks, rooms, or equipment units, not room guest count. Existing bookings retain quoted rates.
- Plans: add/edit daily and membership plans, price, validity, included hours, and availability.
- Members: directory of registered accounts, current memberships, and manual grants/renewal. Renewal extends the same active plan and adds its hours. Granting does not collect a payment.
- Refunds: review eligible payment-backed cancellation requests. Approval records a review only; it does not transfer funds or mark payments refunded.
- Reports: collected and refunded payment totals, reservation statuses, and overtime amounts. Reports cover loaded records, not all-time totals. The payment provider must insert verified payment events using trusted server code.
- Audit and policy: edit free-cancellation notice hours and inspect automatically logged changes.

## Important integration boundaries

Member-side reservations, membership purchases, and the member resource catalog still use the existing local demo. They are not automatically synced/imported into these staff tables. Staff-created reservations and plan/resource edits currently appear in the staff portal only. Connecting member booking/purchase screens to server transactions is a separate integration.

Digital payments, actual refunds, membership-hour redemption, push notifications, signed QR passes/scanning, and downloadable reports are not implemented here. Access validation uses a reservation reference and manual check-in. Equipment is booked as a separate reservation. Unpaid overtime can be viewed but is not reconciled against provider payments.

The portal loads at most 500 rows per collection and 100 audit events. Use Refresh to fetch current server data. Pagination and subscriptions should be added before operating above these limits.

Changing resource capacity/availability does not cancel existing bookings. Refund policy edits apply when a booking is cancelled. Review these business rules before operational use.

## Validation

- `npx tsc --noEmit`
- `node scripts/test-admin.cjs`
- `node scripts/test-auth.cjs`
- `node scripts/test-booking.cjs`
- `npx expo export --platform web`
- `npx expo export --platform android --output-dir dist-android`

The database test uses a temporary PGlite installation without modifying app dependencies:

```powershell
npm install --prefix "$env:TEMP/hq-admin-db-check" @electric-sql/pglite
node scripts/test-admin-db.cjs
```

After hosted migration, test staff and ordinary member accounts separately. Verify denied role assignment and reservation access, overlapping capacity rejection, check-in/out, renewal, refund review, and audit visibility.
