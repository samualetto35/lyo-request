import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// Force dynamic behavior and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log(`📊 Students API called at ${new Date().toISOString()}`)
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID

    console.log(`🔍 Fetching data from Google Sheets: ${spreadsheetId}`)
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:Z', // Extended range to include permission columns
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      console.log('📭 No data found in sheets')
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Fresh-Data': 'true',
          'X-Fetch-Time': startTime.toString(),
        },
      })
    }

    // Skip header row and map data
    const students = rows.slice(1).map((row) => {
      // Extract permission data from columns J onwards (index 9+)
      const izinler: string[] = []
      for (let i = 9; i < row.length; i++) {
        if (row[i] && row[i].trim()) {
          izinler.push(row[i].trim())
        }
      }

      return {
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

    const fetchTime = Date.now() - startTime
    console.log(`✅ Students data fetched successfully: ${students.length} students in ${fetchTime}ms`)
    
    // Count total permissions for logging
    const totalPermissions = students.reduce((total, student) => total + student.izinler.length, 0)
    console.log(`📋 Total permissions found: ${totalPermissions}`)

    return NextResponse.json(students, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Fresh-Data': 'true',
        'X-Fetch-Time': startTime.toString(),
        'X-Students-Count': students.length.toString(),
        'X-Permissions-Count': totalPermissions.toString(),
      },
    })
  } catch (error) {
    console.error('❌ Error fetching students:', error)
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
    
    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    errorResponse.headers.set('Pragma', 'no-cache')
    errorResponse.headers.set('Expires', '0')
    errorResponse.headers.set('X-Fresh-Data', 'true')
    errorResponse.headers.set('X-Fetch-Time', startTime.toString())
    
    return errorResponse
  }
} 