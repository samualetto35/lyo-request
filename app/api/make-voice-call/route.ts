import { NextResponse } from 'next/server'
import twilio from 'twilio'
import { callDataStorage } from '../../lib/call-storage'

function generateCallId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export async function POST(request: Request) {
  try {
    // Twilio credentials kontrolü
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: 'Twilio credentials eksik' },
        { status: 500 }
      )
    }

    const client = twilio(accountSid, authToken)
    const body = await request.json()
    const { phoneNumber, phone, studentName, startDate, endDate, dates } = body
    
    // phoneNumber veya phone parametresini kullan
    const rawPhone = phoneNumber || phone
    
    if (!rawPhone) {
      console.error('❌ Phone number missing in request body:', body)
      return NextResponse.json(
        { error: 'Telefon numarası gerekli' },
        { status: 400 }
      )
    }

    // Telefon numarasını düzelt - çift +90 prefix'ini önle
    let cleanPhoneNumber = rawPhone.toString()
    if (cleanPhoneNumber.startsWith('+90')) {
      cleanPhoneNumber = cleanPhoneNumber // Zaten doğru format
    } else if (cleanPhoneNumber.startsWith('90')) {
      cleanPhoneNumber = `+${cleanPhoneNumber}` // 90... -> +90...
    } else if (cleanPhoneNumber.startsWith('0')) {
      cleanPhoneNumber = `+90${cleanPhoneNumber.substring(1)}` // 0... -> +905...
    } else {
      cleanPhoneNumber = `+90${cleanPhoneNumber}` // 5... -> +905...
    }

    console.log(`📞 Making voice call to ${cleanPhoneNumber} for student ${studentName}`)

    // Generate short call ID and store data temporarily
    const callId = generateCallId()
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + 1) // 1 hour from now
    
    const callData = {
      studentName: studentName,
      parentPhone: cleanPhoneNumber,
      expiry: expiry
    }
    
    // Store data with 1 hour expiration
    callDataStorage.set(callId, callData)
    console.log(`💾 Stored call data with ID: ${callId}`)

    // Clean up expired entries
    callDataStorage.cleanup()

    // TwiML URL'i - webhook endpoint'imiz (çok daha kısa URL)
    const twimlUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/voice-webhook?id=${callId}`

    console.log(`🔗 Generated webhook URL: ${twimlUrl}`)

    const call = await client.calls.create({
      to: cleanPhoneNumber,
      from: fromNumber,
      url: twimlUrl,
      method: 'POST'
    })

    console.log(`✅ Voice call initiated: ${call.sid}`)

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      callId: callId,
      message: 'Arama başlatıldı'
    })

  } catch (error) {
    console.error('❌ Voice call error:', error)
    return NextResponse.json(
      { error: 'Arama başlatılamadı' },
      { status: 500 }
    )
  }
} 