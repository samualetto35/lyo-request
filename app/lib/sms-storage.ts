// Global storage that persists across Next.js development reloads
declare global {
  var __smsCodeStorage: Map<string, { code: string, expiry: number, attempts: number }> | undefined
  var __rateLimitMap: Map<string, { attempts: number, resetTime: number }> | undefined
}

// Initialize or reuse existing storage
const codeStorage = globalThis.__smsCodeStorage ?? new Map<string, { code: string, expiry: number, attempts: number }>()
const rateLimitMap = globalThis.__rateLimitMap ?? new Map<string, { attempts: number, resetTime: number }>()

// Store in global to persist across reloads
if (process.env.NODE_ENV === 'development') {
  globalThis.__smsCodeStorage = codeStorage
  globalThis.__rateLimitMap = rateLimitMap
}

export { codeStorage, rateLimitMap }

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function checkRateLimit(phoneNumber: string, maxAttempts: number = 3, windowMinutes: number = 60) {
  const now = Date.now()
  const key = phoneNumber
  const rateLimit = rateLimitMap.get(key)
  
  if (!rateLimit || now > rateLimit.resetTime) {
    rateLimitMap.set(key, {
      attempts: 1,
      resetTime: now + (windowMinutes * 60 * 1000)
    })
    return { allowed: true, remainingAttempts: maxAttempts - 1 }
  }
  
  if (rateLimit.attempts >= maxAttempts) {
    const remainingTime = Math.ceil((rateLimit.resetTime - now) / 60000)
    return { allowed: false, remainingAttempts: 0, remainingTime }
  }
  
  rateLimit.attempts++
  return { allowed: true, remainingAttempts: maxAttempts - rateLimit.attempts }
} 