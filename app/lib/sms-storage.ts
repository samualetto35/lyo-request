import { redis } from './redis-client'

interface CodeData {
  code: string
  expiry: number
  attempts: number
}

interface RateLimitData {
  attempts: number
  resetTime: number
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Store code in Redis
export async function storeCode(phoneNumber: string, data: CodeData): Promise<void> {
  const key = `sms:${phoneNumber}`
  try {
    // Store data directly without JSON.stringify
    await redis.set(key, data, {
      ex: Math.ceil((data.expiry - Date.now()) / 1000) // Convert ms to seconds
    })
  } catch (error) {
    console.error('Error storing code in Redis:', error)
    throw error
  }
}

// Get code from Redis
export async function getCode(phoneNumber: string): Promise<CodeData | null> {
  const key = `sms:${phoneNumber}`
  try {
    // Get data directly as CodeData type
    const data = await redis.get<CodeData>(key)
    return data
  } catch (error) {
    console.error('Error getting code from Redis:', error)
    return null
  }
}

// Delete code from Redis
export async function deleteCode(phoneNumber: string): Promise<void> {
  const key = `sms:${phoneNumber}`
  try {
    await redis.del(key)
  } catch (error) {
    console.error('Error deleting code from Redis:', error)
    throw error
  }
}

// Update code attempts in Redis
export async function updateCodeAttempts(phoneNumber: string, attempts: number): Promise<void> {
  const key = `sms:${phoneNumber}`
  try {
    const data = await getCode(phoneNumber)
    if (data) {
      data.attempts = attempts
      await storeCode(phoneNumber, data)
    }
  } catch (error) {
    console.error('Error updating code attempts in Redis:', error)
    throw error
  }
}

// Rate limiting with Redis
export async function checkRateLimit(phoneNumber: string, maxAttempts: number = 3, windowMinutes: number = 60) {
  const now = Date.now()
  const key = `rate:${phoneNumber}`
  
  try {
    // Get rate limit data directly as RateLimitData type
    const rateLimitData = await redis.get<RateLimitData>(key)
    
    if (!rateLimitData || now > rateLimitData.resetTime) {
      const newData: RateLimitData = {
        attempts: 1,
        resetTime: now + (windowMinutes * 60 * 1000)
      }
      // Store data directly without JSON.stringify
      await redis.set(key, newData, {
        ex: windowMinutes * 60 // Set expiry in seconds
      })
      return { allowed: true, remainingAttempts: maxAttempts - 1 }
    }
    
    if (rateLimitData.attempts >= maxAttempts) {
      const remainingTime = Math.ceil((rateLimitData.resetTime - now) / 60000)
      return { allowed: false, remainingAttempts: 0, remainingTime }
    }
    
    rateLimitData.attempts++
    // Store updated data directly without JSON.stringify
    await redis.set(key, rateLimitData, {
      ex: Math.ceil((rateLimitData.resetTime - now) / 1000)
    })
    return { allowed: true, remainingAttempts: maxAttempts - rateLimitData.attempts }
  } catch (error) {
    console.error('Error checking rate limit in Redis:', error)
    // If Redis fails, allow the request but log the error
    return { allowed: true, remainingAttempts: maxAttempts - 1 }
  }
} 