import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '../../lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get session ID from cookie
    const sessionId = request.cookies.get('auth_session')?.value || ''
    
    // Validate session
    const validation = validateSession(sessionId)
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          authenticated: false,
          error: 'Oturum geçersiz veya süresi dolmuş' 
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      authenticated: true,
      success: true,
      phone: validation.phone,
      message: 'Oturum geçerli'
    })
    
  } catch (error) {
    console.error('🚨 Auth check error:', error)
    return NextResponse.json(
      { 
        authenticated: false,
        error: 'Yetkilendirme kontrol edilemedi' 
      },
      { status: 500 }
    )
  }
} 