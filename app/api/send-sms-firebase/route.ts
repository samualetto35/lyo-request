import { NextRequest, NextResponse } from 'next/server'
import { codeStorage, rateLimitMap, generateCode, checkRateLimit } from '../../lib/sms-storage'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()
    
    console.log(`📞 SMS Request for phone: ${phoneNumber}`)
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Telefon numarası gerekli' },
        { status: 400 }
      )
    }

    // Check rate limiting
    const rateLimit = checkRateLimit(phoneNumber, 3, 60)
    
    if (!rateLimit.allowed) {
      console.log(`⏰ Rate limit exceeded for ${phoneNumber}`)
      return NextResponse.json(
        { error: `Çok fazla deneme yapıldı. ${rateLimit.remainingTime} dakika sonra tekrar deneyin.` },
        { status: 429 }
      )
    }

    // First check if phone number exists in Google Sheets
    // Get the current host from the request
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`
    
    console.log(`🔍 Checking phone number in Google Sheets: ${phoneNumber}`)
    
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
        { error: 'Telefon numarası kontrol edilemedi' },
        { status: 500 }
      )
    }

    if (!phoneCheckResponse.ok) {
      console.log(`❌ Phone number not found in sheets: ${phoneNumber}`)
      return NextResponse.json(
        { error: phoneCheckData.error || 'Kayıt kontrol edilemedi' },
        { status: phoneCheckResponse.status }
      )
    }

    console.log(`✅ Phone number found in sheets: ${phoneNumber}`)

    // Generate verification code
    const code = generateCode()
    const expiry = Date.now() + (5 * 60 * 1000) // 5 minutes

    // Store code
    codeStorage.set(phoneNumber, {
      code,
      expiry,
      attempts: 0
    })

    console.log(`🔑 Generated SMS code for ${phoneNumber}: ${code} (expires: ${new Date(expiry).toISOString()})`)
    console.log(`💾 Stored in codeStorage. Total entries: ${codeStorage.size}`)

    // Format phone number for international format
    let formattedPhone = phoneNumber.replace(/\D/g, '')
    if (formattedPhone.startsWith('90')) {
      formattedPhone = '+' + formattedPhone
    } else if (formattedPhone.startsWith('0')) {
      formattedPhone = '+90' + formattedPhone.substring(1)
    } else {
      formattedPhone = '+90' + formattedPhone
    }

    // In development mode, just log the code
    console.log(`🔥 Firebase SMS Code for ${formattedPhone}: ${code}`)
    
    return NextResponse.json({
      success: true,
      message: 'SMS gönderildi',
      remainingAttempts: rateLimit.remainingAttempts,
      ...(process.env.NODE_ENV === 'development' && {
        devCode: code,
        devNote: 'Development mode - Console\'da SMS kodunu kontrol edin'
      })
    })

  } catch (error) {
    console.error('Error in Firebase SMS:', error)
    return NextResponse.json(
      { error: 'Sistem hatası oluştu' },
      { status: 500 }
    )
  }
} 