# Balancer — Hostinger production deployment guide

Deploying Balancer (Laravel 12 + Inertia/React, MySQL) to a **Hostinger subdomain** using **file upload** (no git on the server).

Placeholders used throughout — replace them with your real values:

| Placeholder | Meaning | Example |
|---|---|---|
| `yourdomain.com` | Main domain on Hostinger | `daleus.com` |
| `balancer.yourdomain.com` | The subdomain Balancer will live on | `balancer.daleus.com` |
| `u123456789` | Your Hostinger account user (shown in hPanel → Files → FTP Accounts / SSH Access) | `u482913377` |
| `APP_DIR` | Folder that holds the Laravel code (**not** web-accessible) | see Phase 4 |
| `DOCROOT` | Folder hPanel serves for the subdomain | see Phase 4 |
| `PHP` | Full path of Hostinger's CLI PHP binary | `/opt/alt/php83/usr/bin/php` |

---

## 0. Where things stand today (audit summary)

Verified locally on 26 Sep 2026:

| Area | State |
|---|---|
| Frontend production build (`npm run build`) | Builds successfully and includes the admin + onboarding pages. `public/build` is gitignored, so it has to be copied into the release by hand (Phase 3). |
| Fresh database build | Verified: importing `database/schema/mysql-schema.sql` and then running `php artisan migrate --force` produces all 28 tables, including `users.is_admin` and `bug_reports.status`. |
| `php artisan optimize` | Config, event and view caches build. **Route cache fails** because of duplicate API route names (see Missing items, item 7). Skip `route:cache` until that's fixed. |
| Admin + bug-report status work | **Not committed yet** (about 30 modified/untracked files). The release export below only packages committed files, so commit first. |
| `.env.example` | Does not exist. A full production `.env` template is in Phase 5. |
| Mail | Local `.env` uses `MAIL_MAILER=log`. Every app route requires a **verified email**, so production mail must work or nobody (including you) can get past sign-up. |
| Queues | Nothing in the app is queued. Use `QUEUE_CONNECTION=sync` in production; no queue worker is needed. |
| Scheduler | Two daily commands (`finance:process-due` 00:10 UTC, `finance:close-months` 00:30 UTC). Needs one Hostinger cron entry (Phase 8). |
| File uploads / `storage:link` | Not used. No `storage:link` needed. |
| SSR | `config/inertia.php` has SSR enabled, but no SSR bundle is built, so Inertia skips it. Harmless; optional cleanup. |
| Dev-only routes (`/dev/reset-onboarding`, `/dev/load-demo`) | Return 404 outside `APP_ENV=local` (`LocalDevController::ensureLocalDev`). Safe. |
| Seeders | `UserSeeder` hard-codes your email, password `peanut12`, and admin rights. **Never run it in production.** `DevDataSeeder` refuses to run outside local. |
| PHP | Requires PHP **8.2+** (`composer.json`). Local is 8.2.12. PHP extensions needed: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `ctype`, `fileinfo`, `curl`, `dom`/`xml`. No `intl`, `gd` or `bcmath` needed. |

---

## 1. Decisions and info to gather first

- [ ] **Hostinger plan.** SSH is included on **Premium and above**, not on Single. This guide assumes SSH (Option A). There's a no-SSH fallback (Option B), but it's clumsier.
- [ ] **Subdomain name** (e.g. `balancer`).
- [ ] **Where DNS is managed.** If the domain uses Hostinger nameservers, the subdomain DNS record is created automatically. If DNS is elsewhere (Cloudflare, registrar), you'll add an `A` record yourself (Phase 2.1).
- [ ] **How to create the subdomain in hPanel** (Phase 2.1):
  - *Part of the existing website* — no extra website slot used; folder lands inside the main site's `public_html`.
  - *Its own website* — uses one website slot (Premium has 3); cleanest isolation.
- [ ] **Sending address for app email**, e.g. `noreply@yourdomain.com`. Check in hPanel → Emails whether Hostinger Email is active on the domain or only a free trial.
- [ ] **Privacy policy / terms.** Balancer stores personal financial data for EU users and there are no legal pages yet (see Missing items, item 6).

---

## 2. Hostinger account setup (hPanel)

### 2.1 Create the subdomain

**Option 1 — subdomain as part of the main website (recommended if the main site is on Hostinger):**

1. hPanel → **Websites** → main site → **Dashboard** → sidebar **Domains → Subdomains**.
2. Enter `balancer`, keep the default folder, click **Create**.
3. Hostinger creates `/home/u123456789/domains/yourdomain.com/public_html/balancer`.

**Option 2 — subdomain as its own website:**

1. hPanel → **Websites** → **Add website** → enter `balancer.yourdomain.com` → choose an empty/custom PHP site.
2. Hostinger creates `/home/u123456789/domains/balancer.yourdomain.com/public_html`.

If DNS is **not** on Hostinger: add an `A` record `balancer` → your Hostinger server IP (hPanel → Websites → Dashboard → sidebar, "IP address"). If that DNS provider is Cloudflare with the orange-cloud proxy on, see the trusted-proxies note in Phase 11.

### 2.2 PHP version and extensions

1. Open the subdomain's site dashboard (or the main site for Option 1) → **Advanced → PHP Configuration**.
2. **PHP version:** choose **8.3** (8.2 minimum).
3. **PHP extensions** tab — make sure these are ticked: `pdo_mysql` (sometimes listed as `nd_pdo_mysql`), `mbstring`, `fileinfo`, `curl`, `dom`, `xml`, `ctype`, `tokenizer`, `openssl`. Save.
4. **PHP options**: defaults are fine. Don't raise `memory_limit` unless the logs ask for it.

### 2.3 SSL

1. hPanel → **Security → SSL** → make sure `balancer.yourdomain.com` has an active certificate (install the free one if it's missing; subdomains sometimes need it done manually).
2. Turn on **Force HTTPS** for the subdomain.
3. Wait until `https://balancer.yourdomain.com` shows a valid padlock before continuing. Email verification links are generated from `APP_URL`, which must be `https`.

### 2.4 MySQL database

1. hPanel → **Databases → Management** (MySQL Databases).
2. Create:
   - Database: `balancer` → Hostinger saves it as `u123456789_balancer`
   - User: `balancer` → saved as `u123456789_balancer`
   - A **long random password**. Store it in your password manager.
3. Note the host. For apps on the same Hostinger server it is `localhost`; hPanel shows it next to the database. If it shows an IP or hostname, use that instead.

### 2.5 Email mailbox for the app

1. hPanel → **Emails** → your domain → **Create email account** → `noreply@yourdomain.com` with a strong password.
2. **Emails → Connect Apps & Devices** shows the SMTP settings: host `smtp.hostinger.com`, port `465` (SSL). Port `587` (STARTTLS) is the fallback.
3. If DNS is on Hostinger, SPF/DKIM/DMARC records are usually added automatically. Check under Emails → *DNS records / Deliverability*. If DNS is elsewhere, copy those records to your DNS provider. Without them, verification emails land in spam.

### 2.6 SSH access

1. hPanel → **Advanced → SSH Access** → **Enable**.
2. Note host, port (usually **65002**), username, and set a password or add your SSH key.
3. Test from PowerShell on your PC:

```powershell
ssh -p 65002 u123456789@YOUR_SERVER_IP
```

4. On the server, find the CLI PHP that matches the version you picked:

```bash
php -v
ls /opt/alt/ | grep php
/opt/alt/php83/usr/bin/php -v
```

Use the full path (e.g. `/opt/alt/php83/usr/bin/php`) everywhere this guide says `PHP`. The plain `php` command may be a different version from the website's.

---

## 3. Build the release package on your PC

This produces one zip containing code, production-only `vendor/` and the fresh frontend build — and nothing else.

### 3.1 Pre-flight in the project

```powershell
cd C:\xampp\htdocs\Balancer

# 1) Tests green
php artisan test --compact

# 2) Commit everything that should ship (the export in 3.2 only includes committed files)
git status
git add -A
git commit -m "Release 1.0.0"

# 3) Fresh production frontend build (also regenerates Wayfinder route helpers)
npm run build
```

Confirm `public\build\manifest.json` lists `resources/js/pages/admin/overview.tsx` and `resources/js/pages/onboarding.tsx`.

### 3.2 Create a clean staging copy

```powershell
$release = "C:\deploy\balancer"
Remove-Item -Recurse -Force $release -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force C:\deploy | Out-Null

# Export only committed files (excludes .env, node_modules, vendor, public/hot, archived, project_notes, etc.)
git archive --format=zip -o C:\deploy\balancer-src.zip HEAD
Expand-Archive C:\deploy\balancer-src.zip $release

# Production PHP dependencies only
cd $release
composer install --no-dev --optimize-autoloader --no-interaction

# If composer sits silent for many minutes, stop it (Ctrl+C) and re-run with -vvv to see which download is stuck.

# Add the frontend build (gitignored, so not in the export)
Copy-Item -Recurse C:\xampp\htdocs\Balancer\public\build "$release\public\build"
```

### 3.3 Make sure these are NOT in the staging folder

- [ ] `.env` (you'll create the production one on the server)
- [ ] `public\hot` — if present, production pages load JS from your PC's dev server and render blank
- [ ] `node_modules\`
- [ ] `bootstrap\cache\*.php` and `*.tmp` — only `.gitignore` should remain. Laravel regenerates `packages.php` / `services.php` on the server; stale local copies list dev packages (Pail, Sail, Collision) that aren't installed in production.
- [ ] `storage\logs\*.log`, `storage\framework\sessions\*`, `storage\framework\views\*.php`
- [ ] `database\*.sqlite`

```powershell
Remove-Item "$release\public\hot" -ErrorAction SilentlyContinue
Get-ChildItem "$release\bootstrap\cache" -Exclude .gitignore | Remove-Item -Force
```

Optional, to shrink the upload: delete `tests\`, `resources\js\`, `resources\css\`. The server only needs `resources\views`.

### 3.4 Zip it

```powershell
cd C:\deploy
tar -a -c -f balancer-release.zip -C C:\deploy\balancer .
(Get-Item balancer-release.zip).Length / 1MB
```

Hostinger's File Manager extracts archives up to **256 MB**. This zip should be far below that; if it isn't, extract over SSH with `unzip`.

---

## 4. Upload and folder layout

The rule: **only Laravel's `public/` folder may be reachable from the web.** `.env`, `vendor/`, `storage/` must sit outside the served folder.

| Subdomain created as… | `APP_DIR` (code) | `DOCROOT` (served) |
|---|---|---|
| Part of main website | `/home/u123456789/domains/yourdomain.com/balancer-app` | `/home/u123456789/domains/yourdomain.com/public_html/balancer` |
| Own website | `/home/u123456789/domains/balancer.yourdomain.com/balancer-app` | `/home/u123456789/domains/balancer.yourdomain.com/public_html` |

### 4.1 Upload

1. hPanel → **Files → File Manager**.
2. Navigate to the parent of `APP_DIR` (e.g. `domains/yourdomain.com/`), create folder `balancer-app`.
3. Open it, **Upload** `balancer-release.zip`, right-click → **Extract** into the current folder.
4. Check `balancer-app/artisan`, `balancer-app/vendor/`, `balancer-app/public/index.php` and `balancer-app/public/build/manifest.json` all exist (not nested one level deeper).
5. Delete the uploaded zip.

(Alternatively, upload with FileZilla over SFTP on port 65002 and unzip on the server with `unzip balancer-release.zip`.)

### 4.2 Option A (SSH) — point the subdomain at `public/` with a symlink (recommended)

Part-of-main-website layout:

```bash
cd ~/domains/yourdomain.com/public_html
ls -la balancer            # should be empty (maybe a default index.html) — confirm before deleting
rm -rf balancer
ln -s ../balancer-app/public balancer
ls -la balancer            # balancer -> ../balancer-app/public
```

Own-website layout:

```bash
cd ~/domains/balancer.yourdomain.com
ls -la public_html         # confirm it only holds Hostinger's default files
rm -rf public_html
ln -s balancer-app/public public_html
```

Future releases only replace `balancer-app`; the symlink keeps working.

> Part-of-main-website layout: if the main site's `public_html/.htaccess` contains rewrite rules (e.g. WordPress), Balancer's own `public/.htaccess` turns on its own `RewriteEngine` and wins for rewrites. Other parent directives (password protection, header rules) can still apply, so check if something odd happens.

### 4.3 Option B (no SSH) — copy `public/` into DOCROOT and patch `index.php`

Use this only if you can't get SSH.

1. Copy **the contents** of `balancer-app/public/` (including `.htaccess`, `build/`, `branding/`, `img/`) into `DOCROOT`.
2. Edit `DOCROOT/index.php` to:

```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$appDir = '/home/u123456789/domains/yourdomain.com/balancer-app';

if (file_exists($maintenance = $appDir.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $appDir.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $appDir.'/bootstrap/app.php';

$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());
```

3. On every release you must upload **both** `balancer-app` **and** a new `DOCROOT/build/`. Forgetting the second causes blank pages or old UI.
4. Artisan commands without SSH: see the one-off cron trick in Phase 6.3.

---

## 5. Production `.env`

Create `APP_DIR/.env` in File Manager (or `nano .env` over SSH). **Never put it in `DOCROOT`.**

Generate a fresh key on your PC and paste the output into `APP_KEY`:

```powershell
cd C:\xampp\htdocs\Balancer
php artisan key:generate --show
```

Template:

```dotenv
APP_NAME=Balancer
APP_ENV=production
APP_KEY=base64:PASTE_GENERATED_KEY
APP_DEBUG=false
APP_URL=https://balancer.yourdomain.com

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

APP_MAINTENANCE_DRIVER=file

BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=daily
LOG_DAILY_DAYS=14
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u123456789_balancer
DB_USERNAME=u123456789_balancer
DB_PASSWORD="LONG_RANDOM_DB_PASSWORD"

SESSION_DRIVER=database
SESSION_LIFETIME=43200
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=
SESSION_SECURE_COOKIE=true

SANCTUM_STATEFUL_DOMAINS=balancer.yourdomain.com

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
CACHE_STORE=database

MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=noreply@yourdomain.com
MAIL_PASSWORD="MAILBOX_PASSWORD"
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"

VITE_APP_NAME="${APP_NAME}"
```

Notes:

- `SESSION_DOMAIN` stays **empty**, so the session cookie belongs only to `balancer.yourdomain.com` and isn't shared with the main domain.
- `SESSION_LIFETIME=43200` keeps people logged in for 30 days (same as local). Lower it if you prefer.
- If port 465 fails: `MAIL_SCHEME=smtp`, `MAIL_PORT=587` (STARTTLS is negotiated automatically).
- `MAIL_FROM_ADDRESS` must be the same mailbox you authenticate with, or Hostinger rejects/flags the mail.
- Quote any value containing spaces, `#` or `$`.
- Once config is cached (Phase 7), `.env` edits do nothing until you run `PHP artisan config:cache` again.

---

## 6. Database

### 6.1 Import the base schema (phpMyAdmin)

1. hPanel → **Databases → phpMyAdmin** → open `u123456789_balancer`.
2. **Import** → choose `database/schema/mysql-schema.sql` from your PC (about 27 KB) → **Go**.
3. You should see 25 tables including `migrations`, `users`, `sessions`, `cache`.

Importing this through phpMyAdmin means Laravel doesn't need Hostinger's `mysql` command-line client to load the dump.

### 6.2 Run the newer migrations (SSH)

```bash
cd ~/domains/yourdomain.com/balancer-app
PHP=/opt/alt/php83/usr/bin/php
$PHP artisan migrate --force
$PHP artisan migrate:status
```

Expected: four migrations run — `create_bug_reports_table`, `create_budget_tables`, `add_onboarding_and_liquidity_to_users`, `add_bug_report_status_and_user_is_admin`. That makes **28 tables** total.

**Do not run** `db:seed`, `UserSeeder` or `DevDataSeeder` in production.

### 6.3 No-SSH alternatives

**A. Import a complete schema built on your PC.** This is the same procedure that was verified locally:

```powershell
cd C:\xampp\htdocs\Balancer
$mysql = "C:\xampp\mysql\bin\mysql.exe"
& $mysql -u root -e "DROP DATABASE IF EXISTS balancer_release; CREATE DATABASE balancer_release CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Get-Content database\schema\mysql-schema.sql -Raw | & $mysql -u root balancer_release

# temporary env file pointing at the scratch DB
(Get-Content .env) | ForEach-Object {
  if ($_ -match '^DB_DATABASE=') { 'DB_DATABASE=balancer_release' }
  elseif ($_ -match '^DB_USERNAME=') { 'DB_USERNAME=root' }
  elseif ($_ -match '^DB_PASSWORD=') { 'DB_PASSWORD=' }
  elseif ($_ -match '^APP_ENV=') { 'APP_ENV=release' }
  else { $_ }
} | Set-Content .env.release
php artisan migrate --force --env=release
Remove-Item .env.release

C:\xampp\mysql\bin\mysqldump.exe -u root --single-transaction balancer_release > C:\deploy\balancer-full-schema.sql
```

Then import `balancer-full-schema.sql` in phpMyAdmin instead of `mysql-schema.sql` and skip 6.2.

**B. One-off cron trick** (runs any artisan command without SSH): hPanel → **Advanced → Cron Jobs** → **Custom**, every minute:

```text
cd /home/u123456789/domains/yourdomain.com/balancer-app && /opt/alt/php83/usr/bin/php artisan migrate --force >> storage/logs/deploy.log 2>&1
```

Wait two minutes, read `storage/logs/deploy.log` in File Manager, then **delete that cron job**. The same trick works for the cache commands in Phase 7.

---

## 7. Permissions and caches

Hostinger runs PHP as your own user, so standard permissions work. **Never use 777.**

```bash
cd ~/domains/yourdomain.com/balancer-app
find storage bootstrap/cache -type d -exec chmod 755 {} \;
find storage bootstrap/cache -type f -exec chmod 644 {} \;
chmod 600 .env
```

Build caches (run again after every deploy and every `.env` change):

```bash
PHP=/opt/alt/php83/usr/bin/php
$PHP artisan optimize:clear
$PHP artisan config:cache
$PHP artisan event:cache
$PHP artisan view:cache
# $PHP artisan route:cache   <- skip until duplicate API route names are fixed (Missing items, item 7)
```

After item 7 is fixed, replace all of the above with `$PHP artisan optimize`.

---

## 8. Scheduler cron (required)

Balancer's daily finance processing (`finance:process-due` at 00:10 UTC, `finance:close-months` at 00:30 UTC) only happens if Laravel's scheduler is triggered every minute.

hPanel → **Advanced → Cron Jobs** → **Custom** → schedule **every minute** (`* * * * *`):

```text
cd /home/u123456789/domains/yourdomain.com/balancer-app && /opt/alt/php83/usr/bin/php artisan schedule:run >> storage/logs/cron.log 2>&1
```

- For the first week, keep the log redirect so you can see it running. After that you can swap `>> storage/logs/cron.log 2>&1` for `>> /dev/null 2>&1`.
- Check it's wired up (SSH): `$PHP artisan schedule:list` shows both commands with their next run time.
- The day after launch, open `storage/logs/cron.log` and look for `finance:process-due` / `finance:close-months` runs.
- Manual catch-up for one user if ever needed: `$PHP artisan finance:sync --user=ID`.

---

## 9. Create your admin account

`UserSeeder` must not run in production: it contains your password in source code. Instead:

1. Visit `https://balancer.yourdomain.com/register` and sign up with `mdaleus21@gmail.com` and a **new** strong password.
2. Click the verification link in the email. This also proves mail works.
3. Complete onboarding. Admin pages require a verified and onboarded user.
4. Promote the account in phpMyAdmin → SQL:

```sql
UPDATE users SET is_admin = 1 WHERE email = 'mdaleus21@gmail.com';
```

   Or over SSH: `$PHP artisan tinker --execute="App\Models\User::where('email','mdaleus21@gmail.com')->update(['is_admin'=>true]);"`

5. Reload the dashboard. The shield icon appears in the header, and `/admin` works.

---

## 10. Smoke test (do all of these before announcing)

Public and security:

- [ ] `https://balancer.yourdomain.com` loads the landing page with styling, logo and images
- [ ] `http://` redirects to `https://`
- [ ] `https://balancer.yourdomain.com/up` returns 200
- [ ] `https://balancer.yourdomain.com/.env` → **404** (if it shows content, `DOCROOT` is wrong — stop and fix Phase 4)
- [ ] `https://balancer.yourdomain.com/vendor/` and `/storage/` → 404
- [ ] A non-existent URL shows a plain 404, **not** a stack trace (confirms `APP_DEBUG=false`)

Accounts:

- [ ] Register a second test account → verification email arrives (check spam) → link works
- [ ] Forgot password → email arrives → reset works
- [ ] Log out / log in
- [ ] Settings drawer opens; change locale/currency display; delete the test account at the end

Core app (on the test account):

- [ ] Onboarding saves cash/savings/budget and lands on the dashboard
- [ ] Ledger: add, edit and delete a purchase; add income; add a recurring payment
- [ ] Balance Sheet, Budget, Statistics, Standing and Past Balance Sheets cards load (browser DevTools → Network: no red `/api/v1/...` requests)
- [ ] Mobile layout (phone or DevTools device mode) — carousel, settings card, bug report card
- [ ] Dark / light mode toggle

Admin:

- [ ] Submit a bug report from the test account
- [ ] As admin: `/admin` shows counts; the report appears; changing its status sticks after reload
- [ ] The test (non-admin) account gets **403** at `/admin` and doesn't see the shield icon
- [ ] `POST /dev/load-demo` → 404 (dev routes disabled)

Server:

- [ ] `storage/logs/laravel-YYYY-MM-DD.log` has no errors after the smoke test
- [ ] The next morning: `cron.log` shows the scheduler ran

---

## 11. Security hardening checklist

- [ ] `APP_ENV=production`, `APP_DEBUG=false`, `LOG_LEVEL=warning`
- [ ] `.env` outside `DOCROOT`, `chmod 600`, and the `/.env` URL test returns 404
- [ ] No `public/hot` on the server
- [ ] `UserSeeder` never run; your production password differs from `peanut12`
- [ ] Strong, unique DB and mailbox passwords
- [ ] `SESSION_SECURE_COOKIE=true` and Force HTTPS on
- [ ] Hostinger SSH uses a key, or a strong password
- [ ] **Trusted proxies — only if you put Cloudflare (proxied) or Hostinger CDN in front.** Laravel then sees the proxy's IP and `http` scheme, which breaks rate limiting per IP and secure-URL generation. Add to `bootstrap/app.php` inside `withMiddleware`: `$middleware->trustProxies(at: '*');`. Without a proxy in front, leave it out.
- [ ] Optional: `public/robots.txt` → add `Disallow: /admin` and `Disallow: /dashboard`

---

## 12. Backups and monitoring

- Hostinger automatic backups: **weekly on Premium, daily on Business/Unlimited** (hPanel → Files → Backups). Check yours and know how to restore.
- **Before every release:** phpMyAdmin → Export (Quick, SQL) → keep the file with the release zip.
- Keep the previous `balancer-release.zip` so you can roll back code quickly.
- Monitoring: there is no error tracking in the app. At minimum, check `storage/logs` weekly. Consider a free uptime monitor (e.g. UptimeRobot) on `https://balancer.yourdomain.com/up`.

---

## 13. Shipping updates later (repeatable release procedure)

1. On your PC: tests green → commit → `npm run build` → Phase 3.2–3.4 to produce a new zip.
2. Export the production DB in phpMyAdmin (backup).
3. Put the site in maintenance mode (SSH):

```bash
cd ~/domains/yourdomain.com/balancer-app
$PHP artisan down --retry=60
```

4. Upload and extract the new zip to `~/domains/yourdomain.com/balancer-app-new`, then swap:

```bash
cd ~/domains/yourdomain.com
cp balancer-app/.env balancer-app-new/.env
mv balancer-app balancer-app-old
mv balancer-app-new balancer-app
cd balancer-app
chmod 600 .env
$PHP artisan migrate --force
$PHP artisan optimize:clear && $PHP artisan config:cache && $PHP artisan event:cache && $PHP artisan view:cache
$PHP artisan up
```

   The symlink from Phase 4.2 points at the path `balancer-app`, so it follows the swap automatically. Maintenance mode ends with the swap anyway, because the new folder has no "down" file; `artisan up` is harmless.

5. Re-run the key smoke tests. Once happy, delete `balancer-app-old`.

**Rollback:** `mv balancer-app balancer-app-bad && mv balancer-app-old balancer-app`, rebuild caches, and restore the DB export if the release ran migrations.

Option B (no SSH) users: also re-upload `public/build` into `DOCROOT/build`, and run migrate/caches via the cron trick (Phase 6.3 B).

---

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 500 error on every page | Missing/invalid `.env`, empty `APP_KEY`, or stale config cache | Check `.env`, run `$PHP artisan config:clear`, read `storage/logs` |
| 500 and no log file written | `storage/` not writable, or wrong PHP version | Phase 7 permissions; hPanel PHP version 8.2+ |
| Page is blank, console shows requests to `[::1]:5173` | `public/hot` was uploaded | Delete `public/hot` |
| Page is blank, 404s for `/build/assets/...` | `public/build` missing (git archive excludes it) or, with Option B, not copied to `DOCROOT/build` | Phase 3.2 copy step / Option B step 3 |
| "Vite manifest not found" | Same as above | Same |
| Directory listing or the source files are visible | `DOCROOT` points at the project root, not `public/` | Fix Phase 4 immediately; rotate `APP_KEY` and passwords if `.env` was exposed |
| `419 Page Expired` on login | Cookie/HTTPS mismatch | `APP_URL` https, `SESSION_SECURE_COOKIE=true`, Force HTTPS on, clear config cache |
| Verification or reset emails never arrive | Mail settings or DNS | Check `storage/logs`; try port 587 with `MAIL_SCHEME=smtp`; confirm SPF/DKIM; test with mail-tester.com |
| `Class "Laravel\Pail\..." not found` | Stale `bootstrap/cache/packages.php` from your PC | Delete `bootstrap/cache/*.php` on the server |
| `route:cache` fails "Another route has already been assigned name" | Duplicate API route names | Skip `route:cache` until fixed (Missing items, item 7) |
| `migrate` on an empty DB fails calling `mysql` | No MySQL CLI or `proc_open` restricted | Import `mysql-schema.sql` via phpMyAdmin first (Phase 6.1) |
| Finance month-close never happens | Cron missing or wrong PHP path | Phase 8; test the exact command over SSH |
| `403` on `/admin` for you | `is_admin` not set, or not verified/onboarded | Phase 9 |

---

## 15. Still missing or undecided (acknowledged)

### Blockers — must be handled before a public launch

1. **Commit the current work.** The admin area, bug-report status, `is_admin` migration and header changes are uncommitted. The release export (`git archive HEAD`) only ships committed files; without a commit the server gets no admin area and is missing one migration.
2. **Working production email.** All app routes require a verified email (`MustVerifyEmail`). Without SMTP nobody can use Balancer. The mailbox, SMTP credentials and SPF/DKIM all need to be in place (Phase 2.5 and Phase 5).
3. **Production `.env`.** Doesn't exist yet and there's no `.env.example` to start from. Use the Phase 5 template.
4. **Fresh frontend build in the zip.** `public/build` is gitignored, so it must be copied into the release every time (Phase 3.2).
5. **Admin bootstrap without the seeder.** `UserSeeder` hard-codes credentials. Use the Phase 9 procedure.
6. **Privacy policy (and ideally terms of use).** None exist. Balancer handles personal financial data of EU users (GDPR). The landing page footer has no legal links. Cookies are only strictly necessary ones (session, XSRF, appearance), so no consent banner should be needed — but a privacy policy is.

### Should fix soon (not hard blockers)

7. **Duplicate API route names.** In `routes/api.php`, `apiResource('categories/purchases', …)` and `apiResource('categories/debts', …)` generate the same names as the main `purchases` / `debts` resources (e.g. `api.v1.purchases.index`). This breaks `php artisan route:cache` and causes most of the TypeScript errors in the generated Wayfinder files under `resources/js/routes/`. Likely fix: add `->names('categories.purchases')` / `->names('categories.debts')` to those two routes, then re-run `npm run build`. The frontend calls the API by URL string, so renaming should be safe, but re-test the Ledger category tabs afterwards.
8. **New users start with no categories.** The category seeders only fill in defaults for the *first* user in the database; registration doesn't create any. Decide whether new accounts should get default purchase/debt/recurring categories on sign-up (or on onboarding completion).
9. **Unbranded emails.** Verification and reset emails use Laravel's default template (`APP_NAME` as the header). Works, but looks generic.
10. **Default error pages.** 404/500/503 pages are Laravel's plain defaults; no Balancer-styled error or maintenance page.
11. **No error monitoring.** Only log files. Consider Sentry/Flare or at least an uptime monitor.
12. **SSR config.** `config/inertia.php` has `'enabled' => true`, but no SSR bundle is built or served. Harmless (Inertia skips it); set it to `false` to avoid confusion.
13. **`.env.example` missing.** Worth adding (with no secrets) so future deploys and Composer scripts have a template.
14. **Pre-existing TypeScript errors.** `npm run types` fails: the generated Wayfinder files (item 7) plus `HistoryRow` typing in the Ledger schedule/stream panels. `npm run build` still succeeds because Vite doesn't type-check.
15. **API CSRF.** `/api/v1` uses the session cookie without CSRF-token verification; protection relies on `SameSite=Lax` session cookies. Acceptable for a same-origin SPA, but a hardening candidate (e.g. Sanctum `statefulApi()` with an XSRF header in `apiFetch`).
16. **Performance.** The dashboard JS chunk is ~546 KB (150 KB gzipped). Fine for launch; code-splitting is a later improvement.
17. **Small polish.** `apple-touch-icon` in `app.blade.php` points to an SVG while `public/apple-touch-icon.png` exists; README still says "In Development"; `robots.txt` allows everything.

### Unknowns only you can answer

- Which Hostinger plan (SSH or not) → Option A vs B.
- The exact domain/subdomain, and whether DNS is on Hostinger or elsewhere (Cloudflare → trusted proxies).
- Whether the main domain already hosts a site on this Hostinger account (affects which subdomain method to use).
- Whether Hostinger Email is fully active on the domain or a trial, and its daily sending limit. For larger sign-up volumes, a transactional provider (Postmark, Resend, Mailgun) is more reliable; Laravel supports those with only `.env` changes plus a small package.
