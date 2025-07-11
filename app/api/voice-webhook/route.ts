import { NextResponse } from 'next/server'
import { callDataStorage } from '../../lib/call-storage'

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const callId = url.searchParams.get('id')
    
    if (!callId) {
      throw new Error('No call ID parameter found')
    }

    // Retrieve call data from storage
    const callData = callDataStorage.get(callId)
    
    if (!callData) {
      throw new Error(`Call data not found for ID: ${callId}`)
    }

    const { studentName, parentPhone } = callData

    console.log(`🎤 Voice webhook called for ${studentName} (ID: ${callId})`)

    // Türkçe mesaj
    const message = `Merhaba, LYO Request sisteminden arıyoruz. Öğrenciniz ${studentName} için izin talebi geldi. Onaylamak için 1, reddetmek için 2, tekrar dinlemek için 3'e basın.`

    // TwiML response - use same call ID for response
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/api/voice-response?id=${callId}" method="POST">
    <Say voice="Polly.Filiz" language="tr-TR">${message}</Say>
  </Gather>
  <Say voice="Polly.Filiz" language="tr-TR">Tuş girişi alınamadı. Arama sonlandırılıyor.</Say>
  <Hangup/>
</Response>`

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    })

  } catch (error) {
    console.error('❌ Voice webhook error:', error)
    
    // Hata durumunda basit TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Filiz" language="tr-TR">Sistem hatası oluştu. Arama sonlandırılıyor.</Say>
  <Hangup/>
</Response>`

    return new Response(errorTwiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  }
} 