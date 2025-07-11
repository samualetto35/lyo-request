import { NextRequest, NextResponse } from 'next/server'
import { codeStorage } from '../../lib/sms-storage'
import { createSession } from '../../lib/auth'

// Helper function to normalize phone numbers (same as in phone-login)
function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Handle Turkish phone numbers
  if (digits.startsWith('90')) {
    return digits.substring(2) // Remove country code
  }
  if (digits.startsWith('0')) {
    return digits.substring(1) // Remove leading 0
  }
  
  return digits
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, code } = await request.json()
    
    console.log(`🔍 SMS Verification attempt for ${phoneNumber} with code: ${code}`)
    console.log(`💾 CodeStorage has ${codeStorage.size} entries`)
    
    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: 'Telefon numarası ve kod gerekli' },
        { status: 400 }
      )
    }

    const storedData = codeStorage.get(phoneNumber)
    
    console.log(`📱 Stored data for ${phoneNumber}:`, storedData ? {
      storedCode: storedData.code,
      expiry: new Date(storedData.expiry).toISOString(),
      attempts: storedData.attempts,
      isExpired: Date.now() > storedData.expiry
    } : 'No data found')
    
    if (!storedData) {
      console.log(`❌ No verification code found for ${phoneNumber}`)
      // Debug: List all stored phone numbers
      const allKeys = Array.from(codeStorage.keys())
      console.log(`🔍 All stored phone numbers: [${allKeys.join(', ')}]`)
      return NextResponse.json(
        { error: 'Doğrulama kodu bulunamadı' },
        { status: 400 }
      )
    }

    if (Date.now() > storedData.expiry) {
      console.log(`⏰ Verification code expired for ${phoneNumber}`)
      codeStorage.delete(phoneNumber)
      return NextResponse.json(
        { error: 'Doğrulama kodu süresi dolmuş' },
        { status: 400 }
      )
    }

    if (storedData.attempts >= 3) {
      console.log(`🚫 Too many attempts for ${phoneNumber}`)
      codeStorage.delete(phoneNumber)
      return NextResponse.json(
        { error: 'Çok fazla yanlış deneme yapıldı' },
        { status: 429 }
      )
    }

    if (storedData.code !== code) {
      storedData.attempts++
      console.log(`🔥 Invalid code for ${phoneNumber}. Expected: ${storedData.code}, Got: ${code}, Attempts: ${storedData.attempts}`)
      return NextResponse.json(
        { error: 'Geçersiz doğrulama kodu' },
        { status: 400 }
      )
    }

    // Code is correct, clean up
    console.log('✅ Verification successful for', phoneNumber)
    codeStorage.delete(phoneNumber)

    // Get student data
    // Get the current host from the request
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`
    
    const phoneCheckResponse = await fetch(`${baseUrl}/api/phone-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber }),
    })

    let phoneCheckData
    try {
      phoneCheckData = await phoneCheckResponse.json()
    } catch (jsonError) {
      console.error('Error parsing phone check response:', jsonError)
      return NextResponse.json(
        { error: 'Kullanıcı bilgileri alınamadı' },
        { status: 500 }
      )
    }

    if (!phoneCheckResponse.ok) {
      return NextResponse.json(
        { error: phoneCheckData.error || 'Kullanıcı bulunamadı' },
        { status: phoneCheckResponse.status }
      )
    }

    // Normalize phone number for the redirect URL (same format as used in sheets)
    const normalizedPhone = normalizePhone(phoneNumber)
    console.log(`📱 Normalized phone for redirect: ${phoneNumber} → ${normalizedPhone}`)

    // Create authentication session
    const sessionId = createSession(phoneNumber)
    
    // Create response with success and redirect info
    const response = NextResponse.json({
      success: true,
      message: 'SMS kodu doğrulandı',
      redirectPhone: normalizedPhone
    })
    
    // Set secure session cookie
    response.cookies.set('auth_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    })
    
    return response

  } catch (error) {
    console.error('Error verifying Firebase SMS code:', error)
    return NextResponse.json(
      { error: 'Doğrulama sırasında hata oluştu' },
      { status: 500 }
    )
  }
} 