import { createClient } from 'redis'

// Redis client for production
let redisClient: ReturnType<typeof createClient> | null = null

export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      // For production, add authentication
      password: process.env.REDIS_PASSWORD,
    })

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err)
    })

    await redisClient.connect()
  }

  return redisClient
}

// Store verification code
export async function storeVerificationCode(phoneNumber: string, code: string, expirationSeconds: number = 300) {
  try {
    const client = await getRedisClient()
    const key = `sms_verification:${phoneNumber}`
    
    await client.setEx(key, expirationSeconds, code)
    return true
  } catch (error) {
    console.error('Error storing verification code:', error)
    return false
  }
}

// Get and verify code
export async function verifyCode(phoneNumber: string, code: string) {
  try {
    const client = await getRedisClient()
    const key = `sms_verification:${phoneNumber}`
    
    const storedCode = await client.get(key)
    
    if (!storedCode) {
      return { success: false, error: 'Doğrulama kodu bulunamadı veya süresi dolmuş' }
    }
    
    if (storedCode !== code) {
      return { success: false, error: 'Geçersiz doğrulama kodu' }
    }
    
    // Delete the code after successful verification
    await client.del(key)
    
    return { success: true }
  } catch (error) {
    console.error('Error verifying code:', error)
    return { success: false, error: 'Doğrulama sırasında hata oluştu' }
  }
}

// Rate limiting for SMS sending
export async function checkRateLimit(phoneNumber: string, maxAttempts: number = 3, windowMinutes: number = 60) {
  try {
    const client = await getRedisClient()
    const key = `sms_rate_limit:${phoneNumber}`
    
    const attempts = await client.get(key)
    const currentAttempts = attempts ? parseInt(attempts) : 0
    
    if (currentAttempts >= maxAttempts) {
      return { allowed: false, remainingAttempts: 0 }
    }
    
    // Increment attempts
    await client.multi()
      .incr(key)
      .expire(key, windowMinutes * 60)
      .exec()
    
    return { allowed: true, remainingAttempts: maxAttempts - currentAttempts - 1 }
  } catch (error) {
    console.error('Error checking rate limit:', error)
    // Allow on error to prevent blocking users
    return { allowed: true, remainingAttempts: maxAttempts }
  }
}

// Get remaining time for rate limit
export async function getRateLimitTTL(phoneNumber: string) {
  try {
    const client = await getRedisClient()
    const key = `sms_rate_limit:${phoneNumber}`
    
    const ttl = await client.ttl(key)
    return ttl > 0 ? ttl : 0
  } catch (error) {
    console.error('Error getting rate limit TTL:', error)
    return 0
  }
} 