# fuarbul

fuarbul is a responsive Next.js web app foundation for discovering fairs in
Turkey. Visitors can browse fairs without logging in; authentication will be
required later for following fairs, reminders, interests and profile settings.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL-ready schema for Supabase
- Auth.js / NextAuth
- Google OAuth
- Resend email infrastructure
- Database-backed fair listings with seeded sample data

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On Windows PowerShell, if script execution blocks `npm`, use:

```bash
npm.cmd install
npm.cmd run dev
```

## Project Structure

- `src/app` contains App Router pages and route segments.
- `src/components/layout` contains shared layout components.
- `src/components/ui` contains reusable UI primitives.
- `src/components/fairs` contains fair-specific components.
- `src/lib/fairs.ts` contains stage-1 mock fair data.
- `prisma/schema.prisma` contains the database model foundation.
- `prisma/seed.ts` seeds initial categories and subcategories.

## Database Setup

Add a PostgreSQL connection string to `.env` when you are ready to use a
database:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

Generate Prisma Client:

```bash
npm run db:generate
```

Push the schema to the configured database:

```bash
npm run db:push
```

Seed initial categories and subcategories:

```bash
npm run db:seed
```

Open Prisma Studio:

```bash
npm run db:studio
```

For Windows PowerShell environments that block npm scripts, use `npm.cmd`:

```bash
npm.cmd run db:generate
npm.cmd run db:push
npm.cmd run db:seed
npm.cmd run db:studio
```

## Authentication Setup

fuarbul uses Auth.js / NextAuth with the Prisma adapter. Browsing fairs is public;
authentication is only required for profile, following fairs, interests and
notification settings.

Add the auth variables to `.env`:

```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-long-random-secret"
AUTH_SECRET="your-long-random-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

For local development, `NEXTAUTH_URL` should be:

```bash
http://localhost:3000
```

For production, `NEXTAUTH_URL` should be:

```bash
https://fuarbul.app
```

Google OAuth should use the NextAuth callback URL configured in Google Cloud:

```bash
http://localhost:3000/api/auth/callback/google
```

Email/password users are stored in the existing `User` table with a hashed
password. Google users are stored through the Auth.js Prisma adapter using the
existing `Account` model.

## Email Setup

fuarbul uses Resend for reminder email infrastructure. The app includes reusable
mail utilities, a development-only test endpoint and a protected cron endpoint
for reminder jobs.

Create a Resend account, then add these variables to `.env`:

```bash
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="fuarbul <noreply@mail.fuarbul.app>"
CRON_SECRET="your-long-random-cron-secret"
MAINTENANCE_MODE="true"
```

For local testing without a verified domain, Resend's development sender can be
used:

```bash
EMAIL_FROM="fuarbul <onboarding@resend.dev>"
```

The test route is available only while `NODE_ENV !== "production"`:

```bash
POST /api/dev/send-test-reminder
```

It requires a logged-in user and sends one test reminder email for one followed
fair. It is not a bulk sender and should not be used as a cron job.

## Reminder Cron

The reminder job checks followed fairs against four triggers:

- 30 days before the fair starts
- 7 days before the fair starts
- 1 day before the fair starts
- the day the fair starts

The job only sends email when the user follows the fair, email notifications are
enabled, the matching reminder preference is enabled and no `SENT`
`NotificationLog` exists for the same user, fair, email type and trigger.

The protected cron endpoint is:

```bash
GET /api/cron/send-reminders
```

The project includes `vercel.json` with a daily schedule at 06:00 UTC:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 6 * * *"
    }
  ]
}
```

In production, manual calls can use:

```bash
curl -H "Authorization: Bearer your-long-random-cron-secret" \
  https://fuarbul.app/api/cron/send-reminders
```

For local manual testing, start the app and call:

```bash
curl -H "Authorization: Bearer your-long-random-cron-secret" \
  http://localhost:3000/api/cron/send-reminders
```

If `CRON_SECRET` is missing in development, the endpoint is allowed and logs a
warning. If `CRON_SECRET` is missing in production, the endpoint returns an
error.

Vercel Cron sends scheduled requests to the configured path. When the Vercel
project has `CRON_SECRET` set, Vercel sends it as an `Authorization` bearer
header. The route also accepts Vercel production cron requests with the
`vercel-cron/1.0` user agent, while still requiring `CRON_SECRET` to exist in
production.

## Admin Imports

TOBB is the active fair import source for fuarbul. The TOBB importer reads Excel
calendar data, creates or updates fair records, and keeps imported fairs in
admin review/publish workflows.

TOBB is the only supported fair import workflow. Other source-specific import
routes and helpers are intentionally not exposed in the admin panel.

## Maintenance Mode

Public pages can be temporarily closed with maintenance mode while admin work
continues. Maintenance mode is enabled by default unless this variable is set:

```bash
MAINTENANCE_MODE="false"
```

When maintenance mode is enabled:

- Public pages redirect to `/maintenance`.
- `/admin` remains available.
- `/api` remains available so authentication, admin actions and TOBB import keep
  working.
- `/login?next=/admin` remains available for admin access.

To reopen the public site, set `MAINTENANCE_MODE=false` in the deployment
environment and redeploy.

## Fair Data Reset

To remove all existing fair records before importing a clean TOBB list, use the
SQL file:

```bash
prisma/sql/clear-all-fairs.sql
```

The file includes pre-delete count queries, FK-safe delete statements and
post-delete verification counts. Take a database backup first, run the count
section, review the numbers, then run the delete transaction.

The current schema uses `cuid()` string IDs, so there are no identity sequences
to reset after deletion.

## Vercel Deployment

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add production environment variables in Vercel:

```bash
DATABASE_URL="your-supabase-pooled-postgres-url"
DIRECT_URL="your-supabase-direct-postgres-url"
NEXTAUTH_URL="https://fuarbul.app"
NEXTAUTH_SECRET="your-long-random-secret"
AUTH_SECRET="your-long-random-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="fuarbul <noreply@mail.fuarbul.app>"
CRON_SECRET="your-long-random-cron-secret"
```

4. Deploy from Vercel.
5. Add the custom domains `fuarbul.app` and `www.fuarbul.app`.
6. Configure GoDaddy DNS if needed:
   - Point the apex domain `fuarbul.app` to Vercel using Vercel's recommended `A` record.
   - Point `www.fuarbul.app` to Vercel using the recommended `CNAME` record.
   - Confirm DNS values in the Vercel Domains screen before changing records.
7. Test the production app at `https://fuarbul.app`.
8. Test login, profile, following, interests and fair pages.
9. Test the development email route locally only; use the cron endpoint manually in production with the bearer secret if needed.
10. Confirm the Vercel Cron entry appears in the Vercel project after deployment.

## Deployment Checklist

- `npm.cmd run build` passes locally
- Environment variables are added in Vercel
- Supabase connection works
- Resend API key works
- `mail.fuarbul.app` is verified in Resend
- `EMAIL_FROM` is `fuarbul <noreply@mail.fuarbul.app>`
- `fuarbul.app` and `www.fuarbul.app` are configured in Vercel
- Login works
- Profile works
- Follow/unfollow works
- Test email works
- Cron route works

## Future Integrations

- Supabase PostgreSQL for production data storage
- Prisma ORM for database modeling and queries
- Resend for transactional emails and reminder notifications
- Vercel deployment and Vercel Cron for scheduled reminder jobs
