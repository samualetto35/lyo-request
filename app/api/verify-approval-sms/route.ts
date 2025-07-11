import { NextRequest, NextResponse } from 'next/server'
import { verifyApprovalCode, deleteApprovalCode } from '../../lib/approval-storage'
import { google } from 'googleapis'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Doğrulama kodu gerekli' },
        { status: 400 }
      )
    }

    // Verify the approval code
    const approvalData = verifyApprovalCode(code)

    if (!approvalData) {
      return NextResponse.json(
        { error: 'Geçersiz veya süresi dolmuş kod' },
        { status: 400 }
      )
    }

    // Check attempt limit
    if (approvalData.attempts >= 3) {
      deleteApprovalCode(code)
      console.log(`🚫 Too many attempts for code: ${code}`)
      return NextResponse.json(
        { error: 'Çok fazla hatalı deneme. Yeni kod talep edin.' },
        { status: 400 }
      )
    }

    console.log(`✅ Valid approval code found for ${approvalData.studentName}`)

    // Update Google Sheets with approval
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })

      const sheets = google.sheets({ version: 'v4', auth })
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID

      // Find the permission to update by looking for [BEKLEMEDE] status
      const rowResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${approvalData.studentRowIndex}:${approvalData.studentRowIndex}`,
      })

      const rowData = rowResponse.data.values?.[0] || []
      
      // Find the column with the pending permission
      let targetColumnIndex = -1
      const pendingText = `${approvalData.startDate} - ${approvalData.endDate} [BEKLEMEDE]`
      
      for (let i = 9; i < rowData.length; i++) { // Start from column J (index 9)
        if (rowData[i] === pendingText) {
          targetColumnIndex = i
          break
        }
      }

      if (targetColumnIndex === -1) {
        throw new Error('Bekleyen izin bulunamadı')
      }

      // Update with approval status
      const columnLetter = String.fromCharCode(65 + targetColumnIndex)
      const timestamp = new Date().toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      const approvedText = `ONAYLANDI (${approvalData.startDate} - ${approvalData.endDate}) [SMS: ${timestamp}]`
      
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${columnLetter}${approvalData.studentRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[approvedText]]
        }
      })

      console.log(`✅ Permission saved to ${columnLetter}${approvalData.studentRowIndex}: ONAYLANDI (${approvalData.startDate} - ${approvalData.endDate}) [SMS: ${timestamp}]`)

      // Clean up the approval code
      deleteApprovalCode(code)

      return NextResponse.json({
        success: true,
        message: 'İzin başarıyla onaylandı',
        studentName: approvalData.studentName,
        dateRange: `${approvalData.startDate} - ${approvalData.endDate}`,
        updatedCell: `${columnLetter}${approvalData.studentRowIndex}`,
        approvalText: approvedText
      })

    } catch (sheetsError) {
      console.error('❌ Google Sheets update error:', sheetsError)
      return NextResponse.json(
        { error: 'Onay başarılı ancak sheets güncellenemedi' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ SMS approval verification error:', error)
    return NextResponse.json(
      { error: 'Kod doğrulama başarısız' },
      { status: 500 }
    )
  }
} 