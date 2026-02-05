import { Role } from "./validaton-schema";

export const DEFAULT_LOGIN_REDIRECT: string = "/";

// Prefix for API authentication routes.
export const apiAuthPrefix: string = "/api/auth";

// Routes which are accessible to all.
export const publicRoutes: string[] = ["/", "/auth/verify-email"];

// APIs which are accessible to all.
export const publicApis: string[] = ["/api/uploadthing"];

// Routes which are used for authentication.
export const authRoutes: string[] = [
  "/auth/error",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

// Routes which are protected with diffferent roles
export const protectedRoutes: Record<string, Role[]> = {
  "^/dashboard/admin(/.*)?$": ["ADMIN"],
  "^/dashboard/user(/.*)?$": ["USER"],
};