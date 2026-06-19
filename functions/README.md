# Cloud Functions — ZeroWasteHome

Server-side code for **real expiry push notifications**. This is the missing
half of the push pipeline: the client (service worker + `usePushNotifications`)
already registers device tokens into `users/{uid}.fcmTokens`; this function is
what actually *sends* the scheduled push.

## What it does

`checkExpiringItems` runs **daily at 09:00 (Europe/Bucharest)**, finds every
`inventory` item expiring in **exactly 2 days**, groups them per recipient
(household, else owner), and sends one multicast web-push per recipient to all
their registered devices. Invalid/expired tokens are pruned automatically.

### Silent hours

Each user's quiet window (`users/{uid}.userPreferences.silentHours`,
`{ enabled, start, end }`) is honored: if "now" falls inside an enabled window,
that user's devices are skipped for the run. Filtering is **per-user**, so in a
shared household a silenced member is skipped while others still receive the push.
The window logic mirrors the client's `isWithinSilentHours()` exactly.

Two limitations to be aware of:

- **Timezone:** windows are evaluated in `APP_TIMEZONE` (`Europe/Bucharest`,
  matching the schedule), because no per-user timezone is stored. Users in other
  zones will have their window applied in Bucharest local time. To make this
  fully correct, persist a per-user IANA timezone and pass it to
  `minutesNowInZone`.
- **Single daily run:** the job fires only at 09:00, so silent hours only have a
  practical effect for windows that **overlap 09:00**. The common default
  (22:00–07:00) never suppresses anything here, since the job doesn't run at
  night. For true deferral (send after the quiet window ends), switch to an
  hourly schedule or a queue/retry — a larger change not done here.

## Prerequisites (you must do these — they touch your live Firebase project)

1. **Blaze plan.** Scheduled functions (`onSchedule`) require the pay-as-you-go
   Blaze plan. The free Spark plan cannot run them.
   → https://console.firebase.google.com/project/zerowastehome-v2/usage/details

2. **Firebase CLI** installed and authenticated:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

## Deploy

From the **repo root** (not this folder):

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

The first deploy will also enable the required Google Cloud APIs
(Cloud Functions, Cloud Scheduler, Pub/Sub, Artifact Registry) — accept the
prompts.

## Verify it works

- **Logs:** `firebase functions:log` (or the Console → Functions → Logs).
- **Run on demand without waiting for 09:00:** Google Cloud Console →
  Cloud Scheduler → find the `checkExpiringItems` job → **Run now**.
- **End-to-end test:** add an inventory item with `expiry` set to exactly 2 days
  from today (`YYYY-MM-DD`), grant notification permission in the app on a
  device so a token is saved, then trigger the job. You should get a push even
  with the app closed.

## Notes

- `expiry` is matched as a **string** (`YYYY-MM-DD`), which is how the client
  writes it (`useDataStore.jsx`). If you ever switch `expiry` to a Firestore
  Timestamp, change the query in `index.js` to a range query.
- The window is "exactly 2 days out." Adjust `toDateKey(2)` in `index.js` to
  change the lead time, or loop over multiple offsets for multi-day reminders.
