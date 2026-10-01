# Setting up accounts (Supabase)

This turns on invite-only sign-in and cloud backup for Overload. Each person's data is private to them, synced across their devices, and still works offline.

Until you finish these steps, the app keeps working exactly as before (local-only, no sign-in).

**Time:** about 20 minutes. **Cost:** free. The Supabase free tier is plenty for a small group.

---

## Try it first: test mode (no setup needed)

Pull-request previews on Netlify run the account screens in **test mode**. `netlify.toml` switches this on for previews only, never for the live site. Test mode uses a pretend backend inside the browser: no emails are sent and nothing leaves the phone. The sign-in screen shows the test accounts:

| Email | Code |
| --- | --- |
| `test@overload.app` | `123456` |
| `owner@example.com` | `123456` |
| `friend@example.com` | `123456` |

Use two of them on the same phone to see that each person's data stays separate. On a computer, `npm run dev:test` runs the same thing locally.

When you add the Supabase keys (step 7), they take priority over test mode, so previews switch to real sign-in automatically.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), sign up, and click **New project**.
2. Pick any name (e.g. `overload`), set a database password (save it somewhere; the app doesn't need it), and choose the region nearest you.
3. Wait a minute or two for it to finish setting up.

## 2. Create the tables and the invite rule

1. In the left sidebar, open **SQL Editor** and click **New query**.
2. Open [`supabase/migrations/0001_accounts.sql`](../supabase/migrations/0001_accounts.sql) from this repo, copy the whole file, paste it into the editor, and click **Run**. You should see "Success. No rows returned".

The script creates:
- `allowed_emails`: your invite list. Only you can see or change it.
- `user_state`: one row per person with their training data. Each person can only ever read or write their own row.
- a rule that refuses to create an account for any email that isn't on the invite list.

It's safe to run again if you're unsure it worked.

## 3. Invite people

In the SQL Editor, run one line per person, yourself included:

```sql
insert into public.allowed_emails (email) values ('you@example.com');
insert into public.allowed_emails (email) values ('friend@example.com');
```

To see the list: `select * from public.allowed_emails;`

To remove someone: `delete from public.allowed_emails where email = 'friend@example.com';`. This stops them creating an account. If they already have one, also delete them under **Authentication → Users**, which removes their data too.

## 4. Set up email sending (required for anyone but you)

Supabase's built-in email only sends to members of your Supabase team, and only about 2 emails an hour. Your group needs a real email sender. The simplest option, if you use Gmail:

1. Turn on 2-Step Verification for your Google account, then create an **App password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
2. In Supabase: **Authentication → Emails → SMTP Settings**, turn on **Enable Custom SMTP**, and fill in:
   - Sender email: your Gmail address. Sender name: `Overload`
   - Host: `smtp.gmail.com`, Port: `465`
   - Username: your Gmail address. Password: the app password from step 1
3. Save.

Any other email provider's SMTP details work the same way (Resend, Brevo, Postmark and others have free tiers but need your own domain).

## 5. Put the sign-in code in the emails

On iPhone, tapping an email link opens Safari rather than the home-screen app, so the app signs people in with a **code** from the email instead.

In **Authentication → Emails → Templates**, edit both **Magic Link** and **Confirm signup** (new people may get the second one the first time). Add this line to each, keeping the rest as it is:

```html
<p>Or enter this code in the Overload app: <strong>{{ .Token }}</strong></p>
```

Save both.

## 6. Tell Supabase your app's web address

In **Authentication → URL Configuration**:
- **Site URL:** your live Netlify address, e.g. `https://fatigueandfailure.netlify.app`
- **Redirect URLs:** add both
  - `https://fatigueandfailure.netlify.app/**`
  - `https://deploy-preview-*--fatigueandfailure.netlify.app/**` (so you can test on pull-request previews)

Use your real Netlify address if it's different.

## 7. Connect the app

1. In Supabase, go to **Project Settings → API** (or **Data API**). Copy the **Project URL** and the **anon public** key.
2. In Netlify, go to **Site configuration → Environment variables → Add a variable** and add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key

   Leave the scopes and deploy contexts at their defaults, so previews get them too.
3. Redeploy: **Deploys → Trigger deploy → Deploy site**. For a pull-request preview, push a new commit or use **Retry deploy** on that preview. The keys are read when the site is built, so they only take effect after a new build.

The anon key is designed to be public. It's the database rules from step 2 that keep each person's data private. **Never** put the `service_role` key in Netlify or the app.

---

## Check it works

On the deployed site (or the PR preview):

1. You see a sign-in screen. Enter your email and tap **Email me a sign-in code**.
2. Enter the code from the email. You land on your home screen with your existing training still there (it's uploaded on your first sign-in).
3. **Settings → Account** shows your email and "Synced at …".
4. An email that isn't on the invite list gets "This email isn't on the invite list".
5. Sign in on a second device. Your data appears there too.

In Supabase you can see the data under **Table Editor → user_state** (one row per person).

## Good to know

- **Offline:** everything is saved on the phone first. Changes sync a couple of seconds later, or when the phone is back online.
- **Two phones edited offline at the same time:** logged sets from both are kept. For other changes, like settings, the most recent one wins. A set deleted on one phone can reappear if the other phone still had it.
- **Sign out** keeps that person's data on the phone in their own space. Someone else signing in on the same phone starts with their own, separate data.
- **Reset all data** (Settings) while signed in clears the data in the account too.
- **Adding someone later:** just step 3 for their email.

## Testing the database rules without Supabase

`supabase/tests/security.sh` runs the migration against a plain PostgreSQL database, using a small stand-in for Supabase's auth tables. It then checks 18 rules: invites, each user seeing only their own row, no deletes, no access when logged out, and the size limit.

```sh
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres bash supabase/tests/security.sh
```
