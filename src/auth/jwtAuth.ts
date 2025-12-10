/**
 * HeatSeaker Backend - Commercial Software
 * Copyright (c) 2024 Paul Stortini
 * Software Development & Maintenance by Alexander Meyer
 * 
 * ZERO LIABILITY NOTICE: Service provider assumes no liability for betting operations.
 * Client bears 100% responsibility for all business outcomes.
 * 
 * This software is provided "AS IS" without warranty.
 * For complete terms, see SERVICE_AGREEMENT.md
 * 
 * JWT authentication utilities for admin login
 */

import jwt from "jsonwebtoken";
import config from "../config/config";

export interface JwtPayload {
  sub: string;
  role: string;
  exp?: number;
  iat?: number;
}

/**
 * Generate a JWT token for a user
 * @param payload - The payload to include in the token (sub: username, role: 'admin')
 * @returns The signed JWT token
 */
export function generateJwt(payload: { sub: string; role: string }): string {
  if (!config.jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: "1h", // Token expires in 1 hour
    algorithm: "HS256",
  });
}

/**
 * Verify and decode a JWT token
 * @param token - The JWT token to verify
 * @returns The decoded payload
 * @throws Error if token is invalid or expired
 */
export function verifyJwt(token: string): JwtPayload {
  if (!config.jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
    }) as JwtPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    } else {
      throw new Error("Token verification failed");
    }
  }
}
