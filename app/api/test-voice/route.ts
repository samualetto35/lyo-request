import { NextResponse } from 'next/server'
import { callDataStorage } from '../../lib/call-storage'

function generateCallId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export async function POST(request: Request) {
  try {
    const { studentName = "Test Öğrenci", startDate = "19.07.2025", endDate = "26.07.2025" } = await request.json()

    // Generate test call ID and store data
    const callId = generateCallId()
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + 1) // 1 hour from now
    
    const callData = {
      studentName: studentName,
      parentPhone: "+905078951725",
      expiry: expiry
    }
    
    // Store data with 1 hour expiration
    callDataStorage.set(callId, callData)
    console.log(`🧪 Created test call data with ID: ${callId}`)

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/voice-webhook?id=${callId}`
    const responseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/voice-response?id=${callId}`

    return NextResponse.json({
      success: true,
      callId: callId,
      webhookUrl: webhookUrl,
      responseUrl: responseUrl,
      testInstructions: {
        step1: `Webhook test: curl -X POST "${webhookUrl}"`,
        step2: `Response test (1=onay): curl -X POST "${responseUrl}" -d "Digits=1"`,
        step3: `Response test (2=red): curl -X POST "${responseUrl}" -d "Digits=2"`,
        step4: `Response test (3=tekrar): curl -X POST "${responseUrl}" -d "Digits=3"`
      },
      callData: callData
    })

  } catch (error) {
    console.error('❌ Test voice error:', error)
    return NextResponse.json(
      { error: 'Test oluşturulamadı' },
      { status: 500 }
    )
  }
} 