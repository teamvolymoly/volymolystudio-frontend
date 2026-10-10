# volymolystudio-frontend

## Production connection

The browser calls this Next.js application's `/api/auth/...` endpoints. The
server-side route forwards those requests to `https://volymoly.com` by default.
This keeps Laravel's session and CSRF cookies on the frontend origin, so login
does not depend on third-party cookies between `vercel.app` and `volymoly.com`.
No `NEXT_PUBLIC_API_URL` is needed in Vercel; the old public variable is ignored.

If the Laravel origin changes, set the **server-only** Vercel environment
variable `API_UPSTREAM_URL` to its HTTPS origin and redeploy. The current
production origin works without adding that variable.

Laravel must still have `FRONTEND_URL=https://volymolystudio-frontend.vercel.app`
so password-reset emails point to the deployed frontend. The Laravel queue
worker and SMTP configuration must be active on the server for reset and
verification emails to be delivered. Frontend code cannot start that worker.

Run `npm test` and `npm run build` before deployment.

## Google OAuth

Google login uses the same API proxy and Laravel session as password login.
See ../backend-api/README.md for Google Console URLs, credentials, migration,
local testing and production rollout instructions. Set API_UPSTREAM_URL to
http://localhost:8000 locally and https://volymoly.com in production.
LARAVEL_SESSION_COOKIE must match Laravel SESSION_COOKIE (laravel_session).
OAuth logic and Google secrets live only in backend-api.


## Password login with email OTP

Email -> password -> existing six-digit verification screen -> dashboard.
Password success opens ?screen=verify&purpose=login; refreshing that screen
keeps the challenge in Laravel's session cookie. The OTP is never put in the URL.
Only a successful /api/auth/login/verify response navigates to the dashboard.
Expired/locked challenges show an error and a Back to sign in action.
Six-digit paste/autofill are supported. Submit with Verify or Enter once all six
digits are entered. A successful resend clears the inputs and shows a dismissible
New code sent banner; failed resends show an error without a success banner.

The API proxy forwards POST login/verify and login/resend with the session and
fresh CSRF token. Next.js does not generate or validate OTPs. Deploy with the
matching Laravel change and keep its mail queue worker running; see the backend
README for setup and manual test steps. Registration/recovery and Google flows
retain their existing behavior.


## Resend and expired reset links

Successful OTP resends show New code sent and a 60-second resend cooldown.
Laravel Retry-After responses also start the countdown without showing success.
The link-expired screen now contains an email field and Send new reset link;
the link-sent screen includes Resend reset link after the cooldown. Both call
the existing Laravel password/forgot endpoint through the same CSRF/session
proxy. No email is sent automatically on page load. Reset links remain in the
URL while editing a short password, so refreshing does not lose the token.
See the backend README for the SMTP and supervised queue worker requirements.


## New-device activity and Secure My Account

The public /security/activity page opens from the new-device email. New links
carry the opaque review token in the URL fragment; legacy query links are moved
there immediately. The page sends it to the proxy in a dedicated header and
loads only the event's account, device, location, IP, time and secured state.
Opening the page is read-only so email link scanners cannot sign users out.

Secure My Account sends a separate CSRF-protected POST through the auth proxy.
Laravel signs out every session, removes API tokens, invalidates pending login
OTPs, rotates the remember token, revokes recognized browsers and resolves older
alerts. Repeating the action is safe. The success screen sends the user into the
existing password-reset flow as the recommended next step.

Deploy the frontend page with the backend migration and secure endpoint. Then set
LOGIN_ACTIVITY_REVIEW_PATH=/security/activity and enable
NEW_DEVICE_ALERTS_ENABLED=true in Laravel only after the production queue worker
and SMTP delivery are healthy.


### Deployment configuration safety

Local development settings live in the ignored .env.development.local file. Do not
upload it to Vercel. Set API_UPSTREAM_URL=https://volymoly.com and
LARAVEL_SESSION_COOKIE=laravel_session in the Vercel server environment.
Set AUTH_PROXY_SECRET to the same private random value (at least 32 ASCII
characters) as Laravel. This is also used for per-client auth rate limits,
even when new-device emails are disabled. Never use a NEXT_PUBLIC_ prefix.
Production rejects insecure HTTP and localhost upstreams instead of forwarding
session cookies to them. Redeploy after updating the Vercel environment.

The Google callback URL for this deployment is
https://volymolystudio-frontend.vercel.app/api/auth/google/callback.
A 404 on /api/auth/google/redirect means the deployed frontend/backend or route
cache is not current; check both deployments before testing with real accounts.
