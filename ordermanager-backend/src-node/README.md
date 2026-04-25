# OrderManager Backend (NestJS migration)

## Setup
```bash
npm install
cp .env.example .env
```

## Run
```bash
npm run start:dev
```

## Environment variables
- `PORT`: backend port (default 8080)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL connection
- `JWT_SECRET`: JWT signing secret (matches Spring `app.ordermanager.security.auth-key`)
- `JWT_EXPIRES_IN`: JWT validity (Spring equivalent = 30 minutes)
- `CORS_ORIGIN`: allowed origins

## Example auth flow
### Login
```bash
curl -X POST http://localhost:8080/login   -H 'Login-Credentials: dXNlcjpwYXNz' 
```

### Protected call
```bash
curl http://localhost:8080/persons   -H 'Authorization: Bearer <token>'
```
