import "dotenv/config";

const parsePort = (value: string | undefined, fallback: number): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseInt = (value: string | undefined, fallback: number): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
	PORT: parsePort(process.env.PORT, 3000),
	DATABASE_URL: process.env.DATABASE_URL?.trim() || undefined,
	
	// JWT / Token Configuration
	JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
	TOKEN_EXPIRY_MINUTES: parseInt(process.env.TOKEN_EXPIRY_MINUTES, 15),
	
	// Clerk Configuration
	CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || undefined,
	CLERK_JWKS_URL: process.env.CLERK_JWKS_URL || "https://your-clerk-domain.clerk.com/.well-known/jwks.json",
	
	// Service Configuration
	SERVICE_NAME: process.env.SERVICE_NAME || "user-domain-service",
	NODE_ENV: process.env.NODE_ENV || "development",
};

