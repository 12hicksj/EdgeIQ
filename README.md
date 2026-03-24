# EdgeIQ — Sports Betting Intelligence Dashboard

## Prerequisites
- Docker and Docker Compose
- Node.js 20+
- npm 10+

## Setup

### 1. Start infrastructure
```bash
docker-compose up -d
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Run database migrations
```bash
npm run db:migrate -w packages/db
npm run db:seed -w packages/db
```

### 5. Start development
```bash
npm run dev
```
