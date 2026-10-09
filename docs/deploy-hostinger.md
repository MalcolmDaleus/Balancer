# Balancer — Hostinger production deployment guide

Deploying Balancer (Laravel 12 + Inertia/React, MySQL) to **https://balancer.malcolmjdstudio.com** on **Hostinger Premium Web Hosting**, by file upload (no git on the server).

Your setup:

| | Value |
|---|---|
| Plan | Premium Web Hosting (includes SSH, weekly backups) |
| Main domain | `malcolmjdstudio.com` — will host a small website of its own |
| Subdomain | `balancer.malcolmjdstudio.com`, created as a folder inside the main site |
| Email | None. Balancer doesn't need it (password resets are handled from the admin area) |

One placeholder remains — replace it everywhere:

| Placeholder | Meaning | Where to find it |
|---|---|---|
| `u123456789` | Your Hostinger account user | hPanel → Advanced → SSH Access (the username), or the path shown in File Manager |

Paths used throughout:

| Name | Path | Purpose |
|---|---|---|
| `APP_DIR` | `/home/u123456789/domains/malcolmjdstudio.com/balancer-app` | Laravel code, `.env`, `storage/`. **Not** web-accessible |
| `DOCROOT` | `/home/u123456789/domains/malcolmjdstudio.com/public_html/balancer` | What hPanel serves for the subdomain. Becomes a symlink to `APP_DIR/public` |
| `PHP` | `/opt/alt/php83/usr/bin/php` | Hostinger's CLI PHP for the version you pick (confirm in Phase 2.5) |

---

## 0. Where things stand (audit summary)

| Area | State |
|---|---|
| Frontend build (`npm run build`) | Builds. `public/build` is gitignored, so it's copied into the release by hand (Phase 3). |
| TypeScript (`npm run types`) | Clean. |
| Tests (`php artisan test`) | All passing. |
| Fresh database | Importing `database/schema/mysql-schema.sql` then `php artisan migrate --force` gives all 28 tables (4 migrations on top of the dump). No new migrations since. |
| `php artisan optimize` | Works, including the route cache (duplicate API route names fixed). |
| `.env` templates | `.env.example` (local) and `.env.production.example` (pre-filled for this subdomain). |
| Mail | Not needed. Email verification is removed; password reset links are created by an admin at `/admin/password-resets` and sent to the user personally. `MAIL_MAILER=log`. |
| Queues | Nothing is queued. `QUEUE_CONNECTION=sync`, no worker needed. |
| Scheduler | Two daily commands (`finance:process-due` 00:10 UTC, `finance:close-months` 00:30 UTC). Needs one cron entry (Phase 8). |
| File uploads / `storage:link` | Not used. |
| Seeding | Disabled outside local: `db:seed` does nothing in production and `UserSeeder` refuses to run. |
| Dev-only routes (`/dev/reset-onboarding`, `/dev/load-demo`) | 404 outside `APP_ENV=local`. |
| Error pages | Branded 403/404/500/503 pages when `APP_DEBUG=false`. |
| Legal | `/privacy` and `/terms` pages exist, linked from the footer and the sign-up form. Review them (item 6 in Phase 15). |
| PHP | Requires **8.2+**. Extensions: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `ctype`, `fileinfo`, `curl`, `dom`/`xml`. |

---

## 1. Before you start

- [ ] All work committed (Phase 3.1). The release is exported from git, so uncommitted files don't ship.
- [ ] Your admin email for production (this guide uses `maldaleus@gmail.com`).
- [ ] Read through `/privacy` and `/terms` locally and adjust anything that isn't true for you (Phase 15, item 6).
- [ ] Decide where the main website goes: it lives in `public_html` next to the `balancer` folder. When you later upload the main site, **don't delete or overwrite `public_html/balancer`**.

---

## 2. Hostinger account setup (hPanel)

### 2.1 Subdomain

You've already created it as a folder in the main site. Check:

1. hPanel → **Websites** → `malcolmjdstudio.com` → **Dashboard** → sidebar **Domains → Subdomains**.
2. `balancer.malcolmjdstudio.com` is listed with folder `public_html/balancer`.
3. If the domain uses Hostinger nameservers, DNS is automatic. If DNS is elsewhere (registrar or Cloudflare), add an `A` record `balancer` → the server IP shown on the website dashboard. With Cloudflare's orange-cloud proxy, see the trusted-proxies note in Phase 11.

### 2.2 PHP version and extensions

1. Website dashboard → **Advanced → PHP Configuration**. The subdomain uses the main site's PHP settings.
2. **PHP version:** 8.3 (8.2 minimum). Make sure the main site's code is fine with this too.
3. **PHP extensions:** tick `pdo_mysql` (sometimes `nd_pdo_mysql`), `mbstring`, `fileinfo`, `curl`, `dom`, `xml`, `ctype`, `tokenizer`, `openssl`. Save.

### 2.3 SSL

1. hPanel → **Security → SSL** → `balancer.malcolmjdstudio.com` must have an active certificate. Subdomains sometimes need the free certificate installed manually.
2. Turn on **Force HTTPS** for it.
3. Wait until `https://balancer.malcolmjdstudio.com` shows a valid padlock. Reset links are built from `APP_URL`, which must be `https`.

### 2.4 MySQL database

1. hPanel → **Databases → Management**.
2. Create database `balancer` and user `balancer` → hPanel saves them as `u123456789_balancer`. Use a **long random password** and store it in your password manager.
3. Note the host (normally `localhost`; if hPanel shows a hostname or IP, use that).

### 2.5 SSH access

1. hPanel → **Advanced → SSH Access** → **Enable**. Note host, port (usually **65002**) and username. Add your SSH key, or set a strong password.
2. Test from PowerShell:

```powershell
ssh -p 65002 u123456789@YOUR_SERVER_IP
```

3. On the server, find the CLI PHP that matches the version you picked:

```bash
ls /opt/alt/ | grep php
/opt/alt/php83/usr/bin/php -v
```

Use that full path wherever this guide says `$PHP`. The plain `php` command may be a different version. Put these in `~/.bashrc` so every session has them:

```bash
echo 'export PHP=/opt/alt/php83/usr/bin/php' >> ~/.bashrc
echo 'export APP=~/domains/malcolmjdstudio.com/balancer-app' >> ~/.bashrc
source ~/.bashrc
```

---

## 3. Build the release package on your PC

### 3.1 Pre-flight

```powershell
cd C:\xampp\htdocs\Balancer

php artisan test --compact
npm run types

# The export in 3.2 only includes committed files
git status
git add -A
git commit -m "Release 1.0.0"

# Fresh production frontend build (also regenerates Wayfinder route helpers)
npm run build
```

### 3.2 Staging copy

```powershell
$release = "C:\deploy\balancer"
Remove-Item -Recurse -Force $release -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force C:\deploy | Out-Null

# Committed files only (no .env, node_modules, vendor, public/hot, etc.)
git archive --format=zip -o C:\deploy\balancer-src.zip HEAD
Expand-Archive C:\deploy\balancer-src.zip $release

# Production PHP dependencies only
cd $release
composer install --no-dev --optimize-autoloader --no-interaction
# If composer sits silent for many minutes, Ctrl+C and re-run with -vvv to see what's stuck.

# Frontend build (gitignored, so not in the export)
Copy-Item -Recurse C:\xampp\htdocs\Balancer\public\build "$release\public\build"

# Leftovers that must not ship
Remove-Item "$release\public\hot" -ErrorAction SilentlyContinue
Get-ChildItem "$release\bootstrap\cache" -Exclude .gitignore | Remove-Item -Force
```

Check the staging folder has **no** `.env`, `public\hot`, `node_modules\`, `database\*.sqlite`, or `bootstrap\cache\*.php`. Stale `bootstrap\cache\*.php` files list dev packages (Pail, Sail) that aren't installed in production.

Optional, to shrink the upload: delete `tests\`, `resources\js\`, `resources\css\` from the staging copy.

### 3.3 Zip it

```powershell
cd C:\deploy
tar -a -c -f balancer-release.zip -C C:\deploy\balancer .
(Get-Item balancer-release.zip).Length / 1MB
```

---

## 4. Upload and point the subdomain at `public/`

Only Laravel's `public/` folder may be reachable from the web. `.env`, `vendor/` and `storage/` live in `APP_DIR`, outside `public_html`.

### 4.1 Upload

1. hPanel → **Files → File Manager** → open `domains/malcolmjdstudio.com/` (the folder that **contains** `public_html`).
2. Create folder `balancer-app`, open it, **Upload** `balancer-release.zip`, right-click → **Extract** here.
3. Check `balancer-app/artisan`, `balancer-app/vendor/`, `balancer-app/public/index.php` and `balancer-app/public/build/manifest.json` exist (not nested one level deeper). Delete the zip.

(Or upload with FileZilla/WinSCP over SFTP, port 65002, and `unzip` over SSH.)

### 4.2 Replace the subdomain folder with a symlink

```bash
cd ~/domains/malcolmjdstudio.com/public_html
ls -la balancer            # should only hold Hostinger's default files — confirm before deleting
rm -rf balancer
ln -s ../balancer-app/public balancer
ls -la balancer            # balancer -> ../balancer-app/public
```

Future releases only replace `balancer-app`; the symlink keeps working.

Notes for sharing `public_html` with the main site:

- Because the folder sits inside the main site, `malcolmjdstudio.com/balancer/...` would also reach Balancer. `public/.htaccess` already redirects those requests to `https://balancer.malcolmjdstudio.com/...`.
- Balancer's `.htaccess` turns on its own `RewriteEngine`, so rewrite rules in the main site's `public_html/.htaccess` don't affect it. Other parent directives (password protection, headers) can still apply.
- When you deploy the main website, upload into `public_html` without removing the `balancer` symlink.

---

## 5. Production `.env`

**You create it separately; it is never the local `.env` and it never goes into git.** The repo has a committed template with no secrets, `.env.production.example`, pre-filled for this subdomain. `.env.production` itself is gitignored, so you can keep your filled-in copy on your PC under that name.

1. On your PC:

```powershell
cd C:\xampp\htdocs\Balancer
Copy-Item .env.production.example .env.production
php artisan key:generate --show      # copy the output
```

2. Edit `.env.production`:
   - `APP_KEY=` → paste the generated key
   - `DB_DATABASE` / `DB_USERNAME` → your `u123456789_balancer` names
   - `DB_PASSWORD=""` → the database password, inside the quotes
3. Upload it to `APP_DIR` and rename it to **`.env`** (File Manager → Upload, then Rename). Don't put it in `public_html`.
4. Keep `.env.production` on your PC (or in your password manager) as the master copy. If you lose `APP_KEY`, everyone is logged out but no data is lost.

Settings worth knowing:

- `SESSION_DOMAIN` stays **empty**, so the login cookie belongs only to `balancer.malcolmjdstudio.com` and isn't shared with the main site.
- `SESSION_LIFETIME=43200` keeps people logged in for 30 days.
- `AUTH_PASSWORD_RESET_EXPIRE=1440`: reset links you create stay valid for 24 hours.
- `MAIL_MAILER=log`: nothing is emailed. If you add a mailbox later, see "Adding email later" at the end.
- Once config is cached (Phase 7), `.env` edits do nothing until you run `$PHP artisan optimize` again.

---

## 6. Database

### 6.1 Import the base schema (phpMyAdmin)

1. hPanel → **Databases → phpMyAdmin** → open `u123456789_balancer`.
2. **Import** → choose `database/schema/mysql-schema.sql` from your PC → **Go**.
3. You should see 25 tables, including `migrations`, `users`, `sessions`, `cache`.

Importing through phpMyAdmin means Laravel doesn't need the server's `mysql` command-line client to load the dump.

### 6.2 Run the newer migrations

```bash
cd $APP
$PHP artisan migrate --force
$PHP artisan migrate:status
```

Expected: four migrations run (`create_bug_reports_table`, `create_budget_tables`, `add_onboarding_and_liquidity_to_users`, `add_bug_report_status_and_user_is_admin`), giving **28 tables**.

Don't run `db:seed` in production. It's disabled and would only print a warning, but there's no reason to.

---

## 7. Permissions and caches

```bash
cd $APP
find storage bootstrap/cache -type d -exec chmod 755 {} \;
find storage bootstrap/cache -type f -exec chmod 644 {} \;
chmod 600 .env

$PHP artisan optimize:clear
$PHP artisan optimize
```

`optimize` caches config, events, routes and views. Run it again after every deploy and every `.env` change. Never use `chmod 777`.

---

## 8. Scheduler cron (required)

Daily finance processing only happens if Laravel's scheduler runs every minute.

hPanel → **Advanced → Cron Jobs** → **Custom**, every minute (`* * * * *`):

```text
cd /home/u123456789/domains/malcolmjdstudio.com/balancer-app && /opt/alt/php83/usr/bin/php artisan schedule:run >> storage/logs/cron.log 2>&1
```

- Check it: `$PHP artisan schedule:list` shows both commands with their next run.
- The day after launch, `storage/logs/cron.log` should show `finance:process-due` and `finance:close-months` runs. After a week, you can change the redirect to `>> /dev/null 2>&1`.
- Manual catch-up for one user: `$PHP artisan finance:sync --user=ID`.

---

## 9. Create your admin account

1. Go to `https://balancer.malcolmjdstudio.com/register` and sign up with `maldaleus@gmail.com` and a **strong, new** password (not `password123`, which is the local seed password).
2. Complete onboarding. You get the default categories automatically.
3. Promote the account in phpMyAdmin → SQL:

```sql
UPDATE users SET is_admin = 1 WHERE email = 'maldaleus@gmail.com';
```

   Or over SSH: `$PHP artisan tinker --execute="App\Models\User::where('email','maldaleus@gmail.com')->update(['is_admin'=>true]);"`

4. Reload the dashboard. The shield icon appears in the header and `/admin` opens.

---

## 10. Smoke test (before announcing)

Public and security:

- [ ] `https://balancer.malcolmjdstudio.com` shows the landing page with styling, logo and images; footer has Privacy and Terms links that open
- [ ] `http://balancer.malcolmjdstudio.com` redirects to `https://`
- [ ] `https://malcolmjdstudio.com/balancer` redirects to the subdomain
- [ ] `https://balancer.malcolmjdstudio.com/up` returns 200
- [ ] `/.env`, `/vendor/` and `/storage/` all return **404**. If `.env` shows content, stop and fix Phase 4
- [ ] A made-up URL shows the **Balancer-styled 404**, not a stack trace (confirms `APP_DEBUG=false`)
- [ ] `/robots.txt` disallows everything except the landing and legal pages

Accounts:

- [ ] Register a second test account → lands in onboarding → finishes with default categories in the Ledger
- [ ] Log out / log in. The login page has no "Forgot password?" link
- [ ] Settings drawer opens; change currency/locale display

Core app (test account):

- [ ] Ledger: add, edit and delete a purchase; add income; add a recurring payment. These writes prove the API's CSRF protection works on the live domain
- [ ] Balance Sheet, Budget, Statistics, Standing and Past Balance Sheets load (DevTools → Network: no red `/api/v1/...` requests)
- [ ] Mobile layout (phone or DevTools device mode)
- [ ] Dark / light toggle

Admin:

- [ ] Submit a bug report from the test account; as admin it appears in `/admin/bug-reports` and a status change sticks after reload
- [ ] `/admin/users` → **Reset link** on the test account → link is shown on `/admin/password-resets` → open it in a private window → set a new password → log in with it. The link disappears from "Open links"
- [ ] The test account gets the branded **403** at `/admin` and has no shield icon
- [ ] Delete the test account in Settings

Server:

- [ ] `storage/logs/laravel-YYYY-MM-DD.log` has no errors after the smoke test
- [ ] Next morning: `cron.log` shows the scheduler ran

---

## 11. Security checklist

- [ ] `APP_ENV=production`, `APP_DEBUG=false`, `LOG_LEVEL=warning`
- [ ] `.env` in `APP_DIR`, `chmod 600`, and the `/.env` URL returns 404
- [ ] No `public/hot` on the server
- [ ] Strong, unique database password and admin password
- [ ] `SESSION_SECURE_COOKIE=true` and Force HTTPS on
- [ ] SSH uses a key or a strong password
- [ ] **Trusted proxies — only if you put Cloudflare (proxied) or Hostinger CDN in front.** Laravel then sees the proxy's IP and `http` scheme, which breaks per-IP rate limits and secure URLs. Add `$middleware->trustProxies(at: '*');` inside `withMiddleware` in `bootstrap/app.php`. Without a proxy, leave it out.

---

## 12. Backups and monitoring

- Premium has **weekly** automatic backups (hPanel → Files → Backups). Know how to restore one.
- **Before every release:** phpMyAdmin → Export (Quick, SQL), and keep the file with that release's zip.
- Keep the previous `balancer-release.zip` for quick code rollback.
- Error monitoring is postponed (Phase 15). Until then, glance at `storage/logs` weekly and consider a free uptime monitor (e.g. UptimeRobot) on `https://balancer.malcolmjdstudio.com/up`.

---

## 13. Shipping updates (repeatable release)

1. PC: tests and types green → commit → `npm run build` → Phase 3.2–3.3 for a new zip.
2. Export the production database in phpMyAdmin.
3. Maintenance mode (shows the branded "Back shortly" page):

```bash
cd $APP && $PHP artisan down --retry=60
```

4. Upload and extract the new zip into `~/domains/malcolmjdstudio.com/balancer-app-new`, then swap:

```bash
cd ~/domains/malcolmjdstudio.com
cp balancer-app/.env balancer-app-new/.env
mv balancer-app balancer-app-old
mv balancer-app-new balancer-app
cd balancer-app
chmod 600 .env
$PHP artisan migrate --force
$PHP artisan optimize:clear && $PHP artisan optimize
$PHP artisan up
```

   The symlink points at the path `balancer-app`, so it follows the swap. The new folder has no "down" file, so maintenance ends at the swap; `artisan up` is harmless.

5. Re-run the key smoke tests, then delete `balancer-app-old`.

**Rollback:** `mv balancer-app balancer-app-bad && mv balancer-app-old balancer-app`, run `optimize` again, and restore the database export if the release ran migrations.

---

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 500 on every page | Missing/invalid `.env`, empty `APP_KEY`, stale config cache | Check `.env`, `$PHP artisan optimize:clear`, read `storage/logs` |
| 500 and no log written | `storage/` not writable, or wrong PHP version | Phase 7 permissions; PHP 8.2+ in hPanel |
| Blank page, console shows requests to `[::1]:5173` | `public/hot` was uploaded | Delete `public/hot` |
| Blank page, 404s for `/build/assets/...`, or "Vite manifest not found" | `public/build` missing from the zip | Phase 3.2 copy step |
| Source files or a directory listing visible | Subdomain serves the project root, not `public/` | Fix Phase 4 now; rotate `APP_KEY` and passwords if `.env` was exposed |
| `419 Page Expired` on login | Cookie/HTTPS mismatch | `APP_URL` with https, `SESSION_SECURE_COOKIE=true`, Force HTTPS on, re-run `optimize` |
| Saving in the Ledger says "Your session expired" | Session ended, or the `XSRF-TOKEN` cookie is blocked | Reload the page. If it keeps happening, check `SESSION_DOMAIN` is empty and `APP_URL` matches the address bar |
| Reset link says "This password reset token is invalid" | Expired (24 h), already used, or replaced by a newer link | Create a new one in `/admin/password-resets` |
| `Class "Laravel\Pail\..." not found` | Stale `bootstrap/cache/packages.php` from your PC | Delete `bootstrap/cache/*.php` on the server |
| `migrate` on an empty DB tries to call `mysql` | Schema dump not imported first | Phase 6.1 |
| Month-close never happens | Cron missing or wrong PHP path | Phase 8; run the exact command over SSH |
| `403` on `/admin` for you | `is_admin` not set, or not onboarded | Phase 9 |
| Main site upload broke Balancer | `public_html/balancer` symlink deleted | Recreate it (Phase 4.2) |

---

## 15. Launch items — status

| # | Item | Status |
|---|---|---|
| 1 | Commit the work | **You:** commit everything before Phase 3. |
| 2 | Password reset | Done. Manual: Admin → Password resets (or **Reset link** on Admin → Users) creates a 24-hour single-use link to send yourself. `/forgot-password` does not exist. |
| 3 | Production `.env` | Done. `.env.production.example` → fill in → upload as `.env` (Phase 5). |
| 4 | Frontend build in the zip | Covered by Phase 3.2. |
| 5 | Admin bootstrap | Seeding disabled outside local; local seed account is `test@test.com` / `password123`. Production admin via Phase 9. |
| 6 | Privacy policy and terms | Drafted at `/privacy` and `/terms` (text in `resources/js/config/legal-copy.ts`). **You:** check the contact email (`maldaleus@gmail.com` is shown publicly), confirm the facts match how you run it, and ideally have it reviewed. Bump `updated` whenever the text changes. |
| 7 | Duplicate API route names | Fixed. `route:cache` works. |
| 8 | Default categories | Done. On finishing onboarding: purchases (Groceries, Dining, Household, Entertainment, Gifts, Other), debts (Personal, Loan), recurring (Rent / Mortgage, Utilities, Subscriptions, Insurance, Phone / Internet). Skipped per type if the user already has categories. |
| 9 | Branded emails | N/A — no email. |
| 10 | Error pages | Done. Branded 403/404/500/503 (including maintenance mode). |
| 11 | Error monitoring | Postponed. |
| 12 | SSR config | Fixed (disabled). |
| 13 | `.env.example` | Added. |
| 14 | TypeScript errors | Fixed. `npm run types` is clean. |
| 15 | API CSRF | Fixed. `/api/v1` writes require the `X-XSRF-TOKEN` header, which the app sends automatically. |
| 16 | Performance (546 KB dashboard chunk) | Postponed. |
| 17 | Small polish | Done. Real Balancer `apple-touch-icon.png` and `favicon.ico` (the old ones were Laravel's logo); README updated; `robots.txt` only allows the landing and legal pages. |

Still open, only you can answer:

- Where DNS for `malcolmjdstudio.com` is managed (Hostinger or elsewhere). Only matters for Phase 2.1 and the trusted-proxies note.

---

## Adding email later (optional)

If you set up Hostinger Email or a provider such as Postmark/Resend, replace the mail lines in `.env`:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=noreply@malcolmjdstudio.com
MAIL_PASSWORD="MAILBOX_PASSWORD"
MAIL_FROM_ADDRESS=noreply@malcolmjdstudio.com
MAIL_FROM_NAME="${APP_NAME}"
```

`MAIL_FROM_ADDRESS` must be the mailbox you log in with. If 465 fails, try `MAIL_SCHEME=smtp` and `MAIL_PORT=587`. SPF/DKIM DNS records keep mail out of spam. You would then also need a public "Forgot password?" page again; it was removed.
