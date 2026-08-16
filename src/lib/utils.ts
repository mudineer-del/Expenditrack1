import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a human-readable message from anything a catch block or mutation's
 * onError might receive. A plain `e instanceof Error` check misses Supabase's
 * PostgrestError — a plain `{ message, details, hint, code }` object, not an
 * Error subclass — so that check silently falls through to a generic fallback
 * on every real database error instead of showing what actually went wrong.
 */
export function errorMessage(e: unknown, fallback = "Something went wrong."): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message
  }
  return fallback
}
