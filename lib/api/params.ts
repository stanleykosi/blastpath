import { AppError } from "@/lib/api/errors";

const incidentIdPattern = /^(?:advisory:)?GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;
const decimalIdPattern = /^[1-9]\d*$/;

function decodeParameter(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    throw new AppError("INVALID_REQUEST", "A route parameter is not valid.", false, error);
  }
}

export function parseIncidentId(value: string): string {
  const decoded = decodeParameter(value);
  if (!incidentIdPattern.test(decoded))
    throw new AppError("INVALID_REQUEST", "The incident ID is not valid.");
  return decoded;
}

export function parseServiceId(value: string): string {
  const decoded = decodeParameter(value);
  if (!decimalIdPattern.test(decoded) || !Number.isSafeInteger(Number(decoded)))
    throw new AppError("INVALID_REQUEST", "The service ID is not valid.");
  return decoded;
}
