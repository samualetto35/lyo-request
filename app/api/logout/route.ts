import { NextRequest, NextResponse } from 'next/server'
import { revokeSession } from '../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get session ID from cookie
    const sessionId = request.cookies.get('auth_session')?.value || null
    
    console.log('🚪 Logout request for session:', sessionId ? 'Present' : 'Missing')
    
    // Revoke session if exists
    if (sessionId) {
      revokeSession(sessionId)
    }
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Çıkış başarılı'
    })
    
    // Clear authentication cookie
    response.cookies.set('auth_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/'
    })
    
    return response
    
  } catch (error) {
    console.error('🚨 Logout error:', error)
    return NextResponse.json(
      { error: 'Çıkış yapılamadı' },
      { status: 500 }
    )
  }
} 