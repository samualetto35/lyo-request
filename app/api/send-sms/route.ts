import { NextRequest, NextResponse } from 'next/server'

// Generate 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// In-memory storage for development (when Redis is not available)
const verificationCodes = new Map<string, { code: string, expires: number }>()
const rateLimitMap = new Map<string, { attempts: number, resetTime: number }>()

// Simple rate limiting without Redis
function checkSimpleRateLimit(phoneNumber: string, maxAttempts: number = 3, windowMinutes: number = 60) {
  const now = Date.now()
  const key = phoneNumber
  const rateLimit = rateLimitMap.get(key)
  
  if (!rateLimit || now > rateLimit.resetTime) {
    // Reset or create new rate limit entry
    rateLimitMap.set(key, {
      attempts: 1,
      resetTime: now + (windowMinutes * 60 * 1000)
    })
    return { allowed: true, remainingAttempts: maxAttempts - 1 }
  }
  
  if (rateLimit.attempts >= maxAttempts) {
    const remainingTime = Math.ceil((rateLimit.resetTime - now) / 60000) // minutes
    return { allowed: false, remainingAttempts: 0, remainingTime }
  }
  
  rateLimit.attempts++
  return { allowed: true, remainingAttempts: maxAttempts - rateLimit.attempts }
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Telefon numarası gerekli' },
        { status: 400 }
      )
    }

    // Check rate limiting
    const rateLimit = checkSimpleRateLimit(phoneNumber, 3, 60) // 3 attempts per hour
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Çok fazla deneme yapıldı. ${rateLimit.remainingTime} dakika sonra tekrar deneyin.` },
        { status: 429 }
      )
    }

    // Generate verification code
    const verificationCode = generateVerificationCode()
    
    // Store code in memory with 5-minute expiration
    const expirationTime = Date.now() + (5 * 60 * 1000) // 5 minutes
    verificationCodes.set(phoneNumber, {
      code: verificationCode,
      expires: expirationTime
    })

    // Prepare SMS content
    const smsMessage = `LYO Request doğrulama kodunuz: ${verificationCode}

Bu kod 5 dakika geçerlidir. Kodu kimseyle paylaşmayın.`

    // Send SMS via NetGSM
    const netgsmResponse = await sendSMSViaNetGSM(phoneNumber, smsMessage)
    
    if (!netgsmResponse.success) {
      return NextResponse.json(
        { error: 'SMS gönderilemedi. Lütfen tekrar deneyin.' },
        { status: 500 }
      )
    }

    // Log for development (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`SMS sent to ${phoneNumber}: ${verificationCode}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Doğrulama kodu gönderildi',
      expiresIn: 300, // 5 minutes in seconds
      remainingAttempts: rateLimit.remainingAttempts
    })

  } catch (error) {
    console.error('Error sending SMS:', error)
    return NextResponse.json(
      { error: 'SMS gönderilirken hata oluştu' },
      { status: 500 }
    )
  }
}

async function sendSMSViaNetGSM(phoneNumber: string, message: string) {
  try {
    // NetGSM API credentials from environment variables
    const netgsmUsername = process.env.NETGSM_USERNAME
    const netgsmPassword = process.env.NETGSM_PASSWORD
    const netgsmHeader = process.env.NETGSM_HEADER || 'LYOREQUEST'

    if (!netgsmUsername || !netgsmPassword) {
      console.error('NetGSM credentials not configured')
      return { success: false, error: 'SMS configuration error' }
    }

    // Format phone number for NetGSM (remove leading 0, add 90 if needed)
    let formattedPhone = phoneNumber.replace(/\D/g, '')
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '90' + formattedPhone.substring(1)
    } else if (!formattedPhone.startsWith('90')) {
      formattedPhone = '90' + formattedPhone
    }

    // NetGSM API URL
    const netgsmUrl = 'https://api.netgsm.com.tr/sms/send/get'
    
    // Prepare parameters
    const params = new URLSearchParams({
      usercode: netgsmUsername,
      password: netgsmPassword,
      gsmno: formattedPhone,
      message: message,
      msgheader: netgsmHeader,
      filter: '0' // No filtering
    })

    const response = await fetch(`${netgsmUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })

    const responseText = await response.text()
    
    // NetGSM returns "00 MSGID" for success
    if (responseText.startsWith('00 ')) {
      return { success: true, messageId: responseText.split(' ')[1] }
    } else {
      console.error('NetGSM error:', responseText)
      return { success: false, error: responseText }
    }

  } catch (error) {
    console.error('NetGSM API error:', error)
    return { success: false, error: 'Network error' }
  }
}

// Verify SMS code endpoint
export async function PUT(request: NextRequest) {
  try {
    const { phoneNumber, code } = await request.json()
    
    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: 'Telefon numarası ve kod gerekli' },
        { status: 400 }
      )
    }

    // Get stored verification code
    const storedData = verificationCodes.get(phoneNumber)
    
    if (!storedData) {
      return NextResponse.json(
        { error: 'Doğrulama kodu bulunamadı veya süresi dolmuş' },
        { status: 400 }
      )
    }

    if (Date.now() > storedData.expires) {
      verificationCodes.delete(phoneNumber)
      return NextResponse.json(
        { error: 'Doğrulama kodu süresi dolmuş' },
        { status: 400 }
      )
    }

    if (storedData.code !== code) {
      return NextResponse.json(
        { error: 'Geçersiz doğrulama kodu' },
        { status: 400 }
      )
    }

    // Code is valid, remove it
    verificationCodes.delete(phoneNumber)

    return NextResponse.json({
      success: true,
      message: 'Doğrulama başarılı'
    })

  } catch (error) {
    console.error('Error verifying SMS code:', error)
    return NextResponse.json(
      { error: 'Doğrulama sırasında hata oluştu' },
      { status: 500 }
    )
  }
} 