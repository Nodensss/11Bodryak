import { timingSafeEqual } from "node:crypto";

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_SECRET);
}

export function isValidAdminSecret(candidate: string) {
  const configuredSecret = process.env.ADMIN_SECRET;

  if (!configuredSecret) {
    return false;
  }

  const configuredBuffer = Buffer.from(configuredSecret);
  const candidateBuffer = Buffer.from(candidate);

  if (configuredBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return timingSafeEqual(configuredBuffer, candidateBuffer);
}
