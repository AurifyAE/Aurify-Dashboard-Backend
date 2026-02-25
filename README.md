# Aurify Backend

## Environment

Copy `.env.example` to `.env` and set:

| Variable     | Description                    | Example                          |
|-------------|--------------------------------|----------------------------------|
| `PORT`      | Server port                    | `5000`                           |
| `MONGO_URI` | MongoDB connection string      | `mongodb://localhost:27017/aurify` |
| `JWT_SECRET`| Secret for JWT signing        | (use a long random string)       |

## Database

- **MongoDB** is required for auth and commodities.
- Run MongoDB locally or use Atlas; set `MONGO_URI` in `.env`.
- Commodities are scoped by `adminId` (sent as `X-Admin-Id` from the dashboard).

## API

- Base path: `/api`
- **Commodities**: `GET/POST /api/commodities`, `PATCH/DELETE /api/commodities/:id`
  - Send `X-Admin-Id` header to scope data (or use Bearer token after login).
- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`

## Run

```bash
npm run dev
```

Server runs at `http://localhost:5000` (or your `PORT`).
