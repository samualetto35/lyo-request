import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(request: NextRequest) {
  try {
    const { studentRowIndex, startDate, endDate, studentName, parentPhone, skipVoiceCall } = await request.json()
    
    if (!studentRowIndex || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Öğrenci, başlangıç tarihi ve bitiş tarihi gerekli' },
        { status: 400 }
      )
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID

    // First, get the current row data to find the first available column
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${studentRowIndex}:${studentRowIndex}`,
    })

    const rowData = response.data.values?.[0] || []
    
    // Find first available column starting from J (index 9)
    let availableColumnIndex = 9
    while (availableColumnIndex < rowData.length && rowData[availableColumnIndex]) {
      availableColumnIndex++
    }

    // Convert column index to letter (A=0, B=1, ..., J=9, K=10, etc.)
    const columnLetter = String.fromCharCode(65 + availableColumnIndex)
    
    // Format the permission string
    const permissionText = `${startDate} - ${endDate} [BEKLEMEDE]`
    
    // Update the cell
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${columnLetter}${studentRowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[permissionText]]
      }
    })

    console.log(`✅ Permission added to sheet: ${permissionText}`)

    // 🚀 OTOMATIK VOICE CALL BAŞLAT (sadece skipVoiceCall false ise)
    if (studentName && parentPhone && !skipVoiceCall) {
      try {
        console.log(`📞 Making voice call for ${studentName} to ${parentPhone}`)
        
        // Telefon numarasını düzelt - çift +90 prefix'ini önle
        let cleanPhoneNumber = parentPhone
        if (cleanPhoneNumber.startsWith('+90')) {
          cleanPhoneNumber = cleanPhoneNumber // Zaten doğru format
        } else if (cleanPhoneNumber.startsWith('90')) {
          cleanPhoneNumber = `+${cleanPhoneNumber}` // 90... -> +90...
        } else if (cleanPhoneNumber.startsWith('0')) {
          cleanPhoneNumber = `+90${cleanPhoneNumber.substring(1)}` // 0... -> +90...
        } else {
          cleanPhoneNumber = `+90${cleanPhoneNumber}` // 5... -> +905...
        }
        
        const voiceCallResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/make-voice-call`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: cleanPhoneNumber,
            studentName,
            startDate,
            endDate
          })
        })

        const voiceCallData = await voiceCallResponse.json()
        
        if (voiceCallData.success) {
          console.log(`✅ Voice call initiated: ${voiceCallData.callSid}`)
        } else {
          console.error(`❌ Voice call failed:`, voiceCallData.error)
        }
      } catch (voiceError) {
        console.error('❌ Voice call error:', voiceError)
        // Voice call hatası olsa bile permission eklendi
      }
    }

    return NextResponse.json({
      success: true,
      message: skipVoiceCall ? 'İzin eklendi' : 'İzin eklendi ve onay araması başlatıldı',
      permission: permissionText,
      column: columnLetter,
      row: studentRowIndex
    })

  } catch (error) {
    console.error('Error adding permission:', error)
    return NextResponse.json(
      { error: 'İzin eklenirken hata oluştu' },
      { status: 500 }
    )
  }
} 