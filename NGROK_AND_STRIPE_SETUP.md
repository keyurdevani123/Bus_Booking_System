Ngrok & Stripe setup

Overview

This file shows how to get the tokens you need and where to place them for local testing via ngrok.

1) Ngrok: get your ngrok authtoken
- Sign up / log in at https://ngrok.com
- From the dashboard, copy the authtoken string.
- Authenticate locally (PowerShell):

```powershell
ngrok authtoken YOUR_NGROK_AUTHTOKEN_HERE
```

- To expose your backend (default port 3200):

```powershell
ngrok http 3200 --host-header="localhost"
```

- Note the HTTPS forwarding URL (e.g. https://abcd-1234.ngrok.io). You will use this as your frontend `REACT_APP_API_URL`.

2) Stripe: API keys and webhook signing secret
- In the Stripe Dashboard, go to Developers -> API keys:
  - Copy the `Secret key` (starts with `sk_live_` or `sk_test_`). This goes into your backend env as `STRIPE_SECRET_KEY`.
- To receive webhook events locally:
  - In Developers -> Webhooks, click "Add endpoint" and set URL:
    - `https://<YOUR_NGROK_ID>.ngrok.io/webhook`
  - Subscribe to event `checkout.session.completed` (and `payment_intent.succeeded` if used).
  - After creating, copy the `Signing secret` for that endpoint — this is `STRIPE_WEBHOOK_SECRET`.

3) Where to put tokens locally
- Frontend (E-Ticket-Frontend): create/modify `.env.local` with:

```text
REACT_APP_API_URL=https://<YOUR_NGROK_ID>.ngrok.io
```

- Backend (E-Ticket-Project-Backend-main): create `.env.local` (or add to your existing `.env`) with at least:

```text
PORT=3200
DATABASE_URI=mongodb://<...>
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
FRONTEND_URL=http://localhost:3000
```

4) Restart services
- Restart backend so it picks env vars, then start ngrok, then restart frontend.

5) Test endpoints
- Search API example (replace with your ngrok URL):

```bash
curl -X POST https://<NGROK_ID>.ngrok.io/search \
  -H "Content-Type: application/json" \
  -d '{"from":"Ahemedabad","to":"Amreli","date":"2026-03-01","isToday":true}'
```

6) Notes
- If you restart ngrok and URL changes, update frontend `.env.local` and Stripe webhook endpoint.
- For a stable webhook URL consider ngrok reserved domains (paid plan).

If you want, paste your ngrok HTTPS URL and Stripe secrets here and I can create the `.env.local` files for you (I won't store secrets beyond creating files in your workspace).