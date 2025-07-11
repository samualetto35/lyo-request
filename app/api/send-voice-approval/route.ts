import { NextRequest, NextResponse } from 'next/server'
import { voiceApprovalStorage } from '../../lib/voice-approval-storage'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, studentName, startDate, endDate, studentRowIndex } = await request.json()

    if (!phoneNumber || !studentName || !startDate || !endDate || !studentRowIndex) {
      return NextResponse.json(
        { error: 'Telefon numarası, öğrenci adı, tarihler ve satır indeksi gerekli' },
        { status: 400 }
      )
    }

    console.log(`📞 Initiating voice approval for ${studentName} to ${phoneNumber}`)

    // Generate unique ID for voice approval tracking
    const approvalId = Math.random().toString(36).substring(2, 15)
    
    // Store voice approval data (expires in 1 hour)
    const expiryTime = new Date()
    expiryTime.setHours(expiryTime.getHours() + 1)
    
    voiceApprovalStorage.set(approvalId, {
      studentName,
      startDate,
      endDate,
      studentRowIndex,
      parentPhone: phoneNumber,
      expiry: expiryTime
    })

    console.log(`💾 Stored voice approval data with ID: ${approvalId}`)

    // Make the voice call using existing system
    const voiceCallResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/make-voice-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        studentName,
        startDate,
        endDate,
        approvalId // Pass the approval ID to link voice response
      })
    })

    const voiceCallData = await voiceCallResponse.json()

    if (!voiceCallData.success) {
      throw new Error(voiceCallData.error || 'Sesli arama başlatılamadı')
    }

    return NextResponse.json({
      success: true,
      message: 'Sesli arama başlatıldı',
      callSid: voiceCallData.callSid,
      approvalId,
      phoneNumber,
      expiresAt: expiryTime.toISOString()
    })

  } catch (error) {
    console.error('❌ Voice approval error:', error)
    return NextResponse.json(
      { error: 'Sesli arama başlatılamadı' },
      { status: 500 }
    )
  }
} 