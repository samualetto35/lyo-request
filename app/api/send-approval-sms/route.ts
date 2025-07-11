import { NextRequest, NextResponse } from 'next/server'
import { storeApprovalCode, type ApprovalData } from '../../lib/approval-storage'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, studentName, startDate, endDate, studentRowIndex } = await request.json()

    if (!phoneNumber || !studentName || !startDate || !endDate || !studentRowIndex) {
      return NextResponse.json(
        { error: 'Telefon numarası, öğrenci adı, tarihler ve satır indeksi gerekli' },
        { status: 400 }
      )
    }

    console.log(`📱 Sending SMS approval for ${studentName} to ${phoneNumber}`)

    // Generate 6-digit approval code
    const approvalCode = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store approval data (expires in 30 minutes)
    const expiryTime = new Date()
    expiryTime.setMinutes(expiryTime.getMinutes() + 30)
    
    const approvalData: ApprovalData = {
      studentName,
      startDate,
      endDate,
      studentRowIndex,
      parentPhone: phoneNumber,
      expiry: expiryTime,
      attempts: 0
    }

    storeApprovalCode(approvalCode, approvalData)

    // Format phone number for international format
    let formattedPhone = phoneNumber.replace(/\D/g, '')
    if (formattedPhone.startsWith('90')) {
      formattedPhone = '+' + formattedPhone
    } else if (formattedPhone.startsWith('0')) {
      formattedPhone = '+90' + formattedPhone.substring(1)
    } else {
      formattedPhone = '+90' + formattedPhone
    }

    // SMS message content
    const smsMessage = `LYO Request: ${studentName} için ${startDate} - ${endDate} tarihleri arasında izin talebini onaylamak için kodu giriniz: ${approvalCode}\nBu kod 30 dakika geçerlidir.`

    console.log(`📨 SMS Message to ${formattedPhone}:\n${smsMessage}`)

    // In development mode, just log the code - SMS would be sent in production
    console.log(`🔥 SMS Approval Code for ${formattedPhone}: ${approvalCode}`)

    return NextResponse.json({
      success: true,
      message: 'SMS onay kodu gönderildi',
      phoneNumber: formattedPhone,
      expiresAt: expiryTime.toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        devCode: approvalCode,
        devNote: 'Development mode - Console\'da SMS kodunu kontrol edin'
      })
    })

  } catch (error) {
    console.error('❌ SMS approval error:', error)
    return NextResponse.json(
      { error: 'SMS onay kodu gönderilemedi' },
      { status: 500 }
    )
  }
} 