import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// Helper function to normalize phone numbers
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
    const { phoneNumber } = await request.json()
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Telefon numarası gerekli' },
        { status: 400 }
      )
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:Z',
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'Kayıt bulunamadı' },
        { status: 404 }
      )
    }

    // Normalize input phone number
    const normalizedInputPhone = normalizePhone(phoneNumber)

    // Search for all matching students
    const allStudents = rows.slice(1).map((row, index) => {
      // Extract permission data from columns J onwards (index 9+)
      const izinler: string[] = []
      for (let i = 9; i < row.length; i++) {
        if (row[i] && row[i].trim()) {
          izinler.push(row[i].trim())
        }
      }

      return {
        rowIndex: index + 2, // +2 because we skip header and array is 0-indexed
        veliAdi: row[0] || '',
        veliTel: row[1] || '',
        veliBabaAdi: row[2] || '',
        veliBabaTel: row[3] || '',
        ogrenciAdi: row[4] || '',
        ogrenciTel: row[5] || '',
        ogrenciDogumTarihi: row[6] || '',
        ogrenciProgram: row[7] || '',
        ogrenciDonem: row[8] || '',
        izinler: izinler,
      }
    })

    // Find all students that belong to this parent
    const matchingStudents = allStudents.filter(student => {
      const normalizedVeliTel = normalizePhone(student.veliTel)
      const normalizedVeliBabaTel = normalizePhone(student.veliBabaTel)
      
      return normalizedVeliTel === normalizedInputPhone || normalizedVeliBabaTel === normalizedInputPhone
    })

    if (matchingStudents.length === 0) {
      return NextResponse.json(
        { error: 'Kayıt bulunamadı. Lütfen telefon numaranızı kontrol edin.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      students: matchingStudents,
      count: matchingStudents.length
    })

  } catch (error) {
    console.error('Error in phone login:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
} 