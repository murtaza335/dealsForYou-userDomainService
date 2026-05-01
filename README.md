# User Domain Service - Identity Resolution & Token Generation

A comprehensive microservice for managing user identity, authentication, and token-based authorization in a distributed system architecture.

## Overview

This service provides:

1. **User Management**: Store and manage user profiles with roles, tenant information, and metadata
2. **Clerk Integration**: Verify Clerk JWT tokens and auto-provision users
3. **Internal Token Generation**: Create short-lived JWT tokens for inter-service communication
4. **Role-Based Access Control**: Support for multiple user roles (END_USER, BRAND_ADMIN, APP_ADMIN)
5. **Logging & Error Handling**: Comprehensive logging and standardized error responses

## Architecture

```
Request Flow:
┌─────────────────┐
│ API Gateway     │
└────────┬────────┘
         │
    Clerk JWT
         │
         ▼
┌──────────────────────────────┐
│ POST /internal/resolve-user  │
│   • Verify Clerk Token       │
│   • Resolve/Provision User   │
│   • Generate Internal Token  │
└──────────┬───────────────────┘
           │
     Internal Token (HS256)
           │
           ▼
┌──────────────────────────────┐
│ Other Microservices          │
│   • Verify Internal Token    │
│   • Extract User Context     │
│   • Make Authorized Requests │
└──────────────────────────────┘
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  roles user_role[] NOT NULL DEFAULT ARRAY['END_USER'],
  tenant_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  brand_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### User Roles
- `END_USER`: Standard user
- `BRAND_ADMIN`: Administrator for a specific brand/tenant
- `APP_ADMIN`: System administrator with full access

## Environment Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/user_domain_db

# JWT/Token Configuration
JWT_SECRET=your-super-secret-key-change-in-production
TOKEN_EXPIRY_MINUTES=15

# Clerk Configuration
CLERK_SECRET_KEY=your-clerk-secret-key
CLERK_JWKS_URL=https://your-instance.clerk.com/.well-known/jwks.json

# Service Configuration
SERVICE_NAME=user-domain-service
```

## API Endpoints

### Public Endpoints

#### POST /internal/resolve-user
**Purpose**: Verify Clerk JWT and resolve/provision user, return internal token

**Authentication**: Clerk JWT (via Authorization header or request body)

**Request**:
```bash
curl -X POST http://localhost:3000/internal/resolve-user \
  -H "Authorization: Bearer <clerk-jwt-token>" \
  -H "Content-Type: application/json"
```

Or with token in body:
```bash
curl -X POST http://localhost:3000/internal/resolve-user \
  -H "Content-Type: application/json" \
  -d '{
    "clerkToken": "<clerk-jwt-token>"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clerkUserId": "user_abc123",
      "role": "END_USER",
      "tenantId": null,
      "email": "user@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1672531200,
    "expiresIn": 900
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid/expired Clerk token
- `400 Bad Request`: Missing or invalid token
- `503 Service Unavailable`: Database not configured

---

#### POST /internal/verify-token
**Purpose**: Verify and decode an internal token (for debugging)

**Authentication**: Internal JWT (via Authorization header)

**Request**:
```bash
curl -X POST http://localhost:3000/internal/verify-token \
  -H "Authorization: Bearer <internal-token>" \
  -H "Content-Type: application/json"
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "valid": true,
    "payload": {
      "sub": "550e8400-e29b-41d4-a716-446655440000",
      "clerk_id": "user_abc123",
      "role": "END_USER",
      "tenant": null,
      "email": "user@example.com",
      "iss": "user-domain-service",
      "iat": 1672530300,
      "exp": 1672531200
    }
  }
}
```

---

### Internal Endpoints (Require Internal Token)

#### GET /internal/user/:userId
**Purpose**: Get user by internal user ID

**Authentication**: Internal JWT token (via Authorization header)

**Request**:
```bash
curl -X GET http://localhost:3000/internal/user/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <internal-token>"
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clerkUserId": "user_abc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "END_USER",
    "tenantId": "tenant_xyz",
    "isActive": true,
    "brandId": "brand_123",
    "metadata": { "customField": "value" },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-02T00:00:00.000Z"
  }
}
```

---

#### PATCH /internal/user/:userId/role
**Purpose**: Update user role (requires APP_ADMIN role)

**Authentication**: Internal JWT token with APP_ADMIN role

**Request**:
```bash
curl -X PATCH http://localhost:3000/internal/user/550e8400-e29b-41d4-a716-446655440000/role \
  -H "Authorization: Bearer <internal-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "BRAND_ADMIN"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clerkUserId": "user_abc123",
    "role": "BRAND_ADMIN",
    ...
  }
}
```

---

#### GET /health
**Purpose**: Health check endpoint

**Request**:
```bash
curl http://localhost:3000/health
```

**Response** (200 OK):
```json
{
  "success": true,
  "service": "user-domain-service"
}
```

---

## Public User Endpoints

#### GET /api/users/me
Get current authenticated user profile

#### PATCH /api/users/me
Update current user profile

#### POST /api/users/upsert-from-clerk
Create or update user from Clerk data

#### GET /api/users/admin/users (APP_ADMIN only)
List all users

---

## Security Features

### Token Security
- **Clerk JWT Verification**: Uses RS256 with JWKS-based key rotation
- **Internal Token Signing**: HS256 with environment-based secret
- **Expiration**: 15-minute default expiry (configurable)
- **No Token Caching Exposure**: Secrets never logged or exposed

### Auto-Provisioning
- New users are automatically created when a valid Clerk JWT is verified
- Default role: END_USER
- Email extracted from Clerk JWT payload

### Role-Based Access Control
- Endpoints can require specific roles via middleware
- All requests validated server-side
- Client claims never trusted directly

### Database Security
- Unique constraints on clerk_user_id and email
- JSONB metadata for flexible extensibility
- Cascade deletion for profile records

---

## Error Handling

All errors follow a standard format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common Status Codes
- `200 OK`: Successful request
- `400 Bad Request`: Invalid input/validation failure
- `401 Unauthorized`: Invalid/missing authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Unexpected server error
- `503 Service Unavailable`: Database not configured

---

## Logging

The service includes comprehensive logging:

```
[2023-12-01T10:30:45.123Z] INFO - Resolving user { clerkUserId: 'user_abc123' }
[2023-12-01T10:30:45.234Z] INFO - User resolved successfully { userId: '550e8400...', roles: ['END_USER'] }
[2023-12-01T10:30:45.345Z] INFO - Internal token generated { userId: '550e8400...', expiresIn: 15 }
```

### Log Levels
- `DEBUG`: Detailed diagnostic information
- `INFO`: General informational messages
- `WARN`: Warning messages for unusual situations
- `ERROR`: Error messages for failures

---

## Development & Testing

### Setup
```bash
npm install
npm run build
npm run dev
```

### Run Tests
```bash
npm test
```

### Test Token Service
```bash
npm test -- token.service.test.ts
```

---

## Integration Guide for Other Services

### 1. Call /internal/resolve-user
```javascript
const response = await fetch('http://user-service:3000/internal/resolve-user', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  }
});

const { data } = await response.json();
const { token, user } = data;
```

### 2. Store Token
Cache the token (with expiration of `expiresAt` field) for 15 minutes

### 3. Use Token for Subsequent Requests
```javascript
// Call other services with the internal token
const response = await fetch('http://other-service:3001/api/endpoint', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${internalToken}`
  }
});
```

### 4. Verify Token (Optional)
```javascript
const response = await fetch('http://user-service:3000/internal/verify-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${internalToken}`
  }
});

const { data } = await response.json();
// data.valid = true/false
```

---

## Database Migrations

### Running Migrations
```bash
# Using SQL directly
psql $DATABASE_URL < src/db/migrations/001_init_user_domain.sql

# Using Prisma (if enabled)
npx prisma migrate dev
```

---

## Project Structure

```
src/
├── config/
│   ├── db.ts          # Database pool initialization
│   └── env.ts         # Environment configuration
├── controllers/
│   ├── user.controller.ts      # Public API controllers
│   └── internal.controller.ts  # Internal API controllers
├── middlewares/
│   ├── auth.ts              # Clerk JWT verification
│   ├── internalAuth.ts      # Internal token verification
│   ├── errorHandler.ts      # Error handling
│   └── notFoundHandler.ts   # 404 handler
├── models/
│   └── user.model.ts        # Zod validation schemas
├── repositories/
│   └── user.repository.ts   # Database queries
├── routes/
│   ├── user.routes.ts       # Public API routes
│   └── internal.routes.ts   # Internal API routes
├── services/
│   ├── clerk.service.ts     # Clerk JWT verification
│   ├── token.service.ts     # Internal token generation
│   ├── user.service.ts      # User business logic
│   └── token.service.test.ts # Token service tests
├── types/
│   ├── user.type.ts         # User entity types
│   └── role.type.ts         # Role enum types
├── utils/
│   └── logger.ts            # Logging utility
├── db/
│   └── migrations/
│       └── 001_init_user_domain.sql  # Database schema
├── app.ts                   # Express app setup
├── error.ts                 # Custom error class
├── server.ts                # Server startup
└── index.ts                 # Application entry point
```

---

## FAQ

**Q: What happens if a user doesn't exist when calling /internal/resolve-user?**
A: The user is automatically created with the default END_USER role.

**Q: How long do internal tokens last?**
A: Default 15 minutes (configurable via TOKEN_EXPIRY_MINUTES env var).

**Q: Can I use the Clerk token directly for subsequent requests?**
A: No. You should use the internal token returned by /internal/resolve-user. The internal token is designed for inter-service communication.

**Q: How should the API Gateway cache tokens?**
A: Use Redis or in-memory cache with TTL matching the token's expiresAt timestamp (typically 15 minutes).

**Q: What if JWT_SECRET is compromised?**
A: Update JWT_SECRET in environment and restart the service. Note: Previously issued tokens will still be valid until expiration.

---

## Support

For issues or questions, check the logs and error messages. All errors are designed to be informative without exposing security-sensitive information.
