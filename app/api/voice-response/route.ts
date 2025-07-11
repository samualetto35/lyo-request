import { NextResponse } from 'next/server'
import { callDataStorage } from '../../lib/call-storage'
import { google } from 'googleapis'

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID

export async function POST(request: Request) {
  try {
    console.log('🔍 Voice response processing started')
    
    const formData = await request.formData()
    const digit = formData.get('Digits') as string
    
    console.log(`📱 Received digit: ${digit}`)
    
    const url = new URL(request.url)
    const callId = url.searchParams.get('id')
    
    console.log(`🆔 Call ID: ${callId}`)
    
    if (!callId) {
      console.error('❌ No call ID parameter found')
      throw new Error('No call ID parameter found')
    }

    // Retrieve call data from storage
    const callData = callDataStorage.get(callId)
    
    console.log(`💾 Call data found:`, callData)
    
    if (!callData) {
      console.error(`❌ Call data not found for ID: ${callId}`)
      throw new Error(`Call data not found for ID: ${callId}`)
    }

    const { studentName, parentPhone } = callData

    console.log(`🔢 Voice response: ${digit} for student ${studentName} (ID: ${callId})`)

    let responseMessage = ''
    let permissionStatus = ''
    const currentDateTime = new Date().toLocaleString('tr-TR')

    switch (digit) {
      case '1':
        responseMessage = 'İzin talebiniz onaylandı. Teşekkür ederiz.'
        permissionStatus = `✅ [ONAYLANDI] / [Telefon: ${currentDateTime}]`
        console.log('✅ Permission approved')
        break
      case '2':
        responseMessage = 'İzin talebiniz reddedildi. Teşekkür ederiz.'
        permissionStatus = `❌ [REDDEDİLDİ] / [Telefon: ${currentDateTime}]`
        console.log('❌ Permission rejected')
        break
      case '3':
        responseMessage = 'Mesaj tekrarlanıyor.'
        console.log('🔄 Repeating message')
        // Tekrar dinleme için önceki webhook'a yönlendir - aynı call ID kullan
        const repeatTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>/api/voice-webhook?id=${callId}</Redirect>
</Response>`
        
        return new Response(repeatTwiml, {
          status: 200,
          headers: { 'Content-Type': 'text/xml' }
        })
      default:
        responseMessage = 'Geçersiz seçim. Arama sonlandırılıyor.'
        permissionStatus = `❌ [GEÇERSİZ SEÇIM] / [Telefon: ${currentDateTime}]`
        console.log('🚫 Invalid choice')
    }

    // Google Sheets'e izin durumunu kaydet (sadece 1 veya 2 için)
    if (digit === '1' || digit === '2') {
      try {
        console.log('📝 Attempting to save to Google Sheets...')
        
        // Skip Google Sheets if credentials not available - test mode
        if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEETS_ID) {
          console.log('⚠️ Google Sheets credentials not available - skipping save (TEST MODE)')
        } else {
          // Önce öğrenciyi bul
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'A:Z',
          })

          const rows = response.data.values || []
          let targetRowIndex = -1

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i]
            if (row[2] === studentName) { // Öğrenci adı C sütununda
              targetRowIndex = i + 1 // 1-based index
              break
            }
          }

          if (targetRowIndex > 0) {
            // Boş sütun bul (J'den başlayarak)
            const headerRow = rows[0] || []
            let targetColumn = 'J'
            
            for (let col = 9; col < 26; col++) { // J'den Z'ye
              if (!headerRow[col] || headerRow[col].trim() === '') {
                targetColumn = String.fromCharCode(65 + col) // A=65
                break
              }
            }

            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `${targetColumn}${targetRowIndex}`,
              valueInputOption: 'RAW',
              requestBody: {
                values: [[permissionStatus]]
              }
            })

            console.log(`✅ Permission saved to ${targetColumn}${targetRowIndex}: ${permissionStatus}`)
          }
        }
      } catch (error) {
        console.error('❌ Error saving to sheets:', error)
      }
    }

    // Clean up call data from storage after processing (unless it's a repeat)
    if (digit !== '3') {
      callDataStorage.delete(callId)
      console.log(`🗑️ Cleaned up call data for ID: ${callId}`)
    }

    // TwiML response
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Filiz" language="tr-TR">${responseMessage}</Say>
  <Hangup/>
</Response>`

    console.log('✅ Voice response completed successfully')
    return new Response(twimlResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    })

  } catch (error) {
    console.error('❌ Voice response error:', error)
    console.error('🔍 Error stack:', error instanceof Error ? error.stack : 'No stack trace available')
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Filiz" language="tr-TR">Sistem hatası oluştu. Arama sonlandırılıyor.</Say>
  <Hangup/>
</Response>`

    return new Response(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    })
  }
} 