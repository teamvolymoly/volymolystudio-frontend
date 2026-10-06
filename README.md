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
