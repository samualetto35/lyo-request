// Authentication utilities for phone verification
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

interface AuthSession {
  phone: string
  verifiedAt: number
  expiresAt: number
}

// Store verified sessions (in production, use Redis or database)
let verifiedSessions = new Map<string, AuthSession>()

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000

// Persistent storage path for development only
const STORAGE_DIR = join(process.cwd(), '.next', 'auth-storage')
const SESSIONS_FILE = join(STORAGE_DIR, 'sessions.json')

// Initialize storage directory only in development
if (process.env.NODE_ENV === 'development') {
  try {
    if (!existsSync(STORAGE_DIR)) {
      mkdirSync(STORAGE_DIR, { recursive: true })
    }
  } catch (error) {
    console.log('⚠️ Could not create storage directory, using memory only')
  }
}

// Load existing sessions from file (for development persistence only)
function loadSessions() {
  if (process.env.NODE_ENV !== 'development') {
    return // Skip file operations in production
  }
  
  try {
    if (existsSync(SESSIONS_FILE)) {
      const data = readFileSync(SESSIONS_FILE, 'utf-8')
      const sessionData = JSON.parse(data)
      verifiedSessions = new Map(Object.entries(sessionData))
      console.log(`📂 Loaded ${verifiedSessions.size} existing sessions`)
    }
  } catch (error) {
    console.log('📂 No existing sessions found, starting fresh')
    verifiedSessions.clear()
  }
}

// Save sessions to file (for development persistence only)
function saveSessions() {
  if (process.env.NODE_ENV !== 'development') {
    return // Skip file operations in production
  }
  
  try {
    const sessionData = Object.fromEntries(verifiedSessions)
    writeFileSync(SESSIONS_FILE, JSON.stringify(sessionData, null, 2))
  } catch (error) {
    console.error('❌ Failed to save sessions:', error)
  }
}

// Initialize sessions on module load
loadSessions()

// Clean up expired sessions every 10 minutes - only in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [sessionId, session] of verifiedSessions.entries()) {
      if (now > session.expiresAt) {
        verifiedSessions.delete(sessionId)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`)
      saveSessions()
    }
  }, 10 * 60 * 1000)
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

export function createSession(phone: string): string {
  const sessionId = generateSessionId()
  const now = Date.now()
  
  const session: AuthSession = {
    phone,
    verifiedAt: now,
    expiresAt: now + SESSION_DURATION
  }
  
  verifiedSessions.set(sessionId, session)
  saveSessions()
  
  console.log(`🔐 Created auth session for ${phone}: ${sessionId}`)
  return sessionId
}

export function validateSession(sessionId: string): { valid: boolean; phone?: string } {
  if (!sessionId) {
    console.log('🔍 Checking auth session: Missing')
    console.log('❌ No session ID provided')
    return { valid: false }
  }

  console.log('🔍 Checking auth session: Present')
  
  const session = verifiedSessions.get(sessionId)
  
  if (!session) {
    console.log(`❌ Session not found: ${sessionId}`)
    // Try to reload sessions from file in case of hot reload (development only)
    if (process.env.NODE_ENV === 'development') {
      loadSessions()
      const reloadedSession = verifiedSessions.get(sessionId)
      
      if (!reloadedSession) {
        console.log(`❌ Session still not found after reload: ${sessionId}`)
        return { valid: false }
      }
      
      // Session found after reload, check if it's still valid
      if (Date.now() > reloadedSession.expiresAt) {
        verifiedSessions.delete(sessionId)
        saveSessions()
        console.log(`❌ Session expired: ${sessionId}`)
        return { valid: false }
      }
      
      console.log(`✅ Session recovered after reload for ${reloadedSession.phone}: ${sessionId}`)
      return { valid: true, phone: reloadedSession.phone }
    }
    
    return { valid: false }
  }
  
  // Check if session is expired
  if (Date.now() > session.expiresAt) {
    verifiedSessions.delete(sessionId)
    saveSessions()
    console.log(`❌ Session expired: ${sessionId}`)
    return { valid: false }
  }
  
  console.log(`✅ Valid session for ${session.phone}: ${sessionId}`)
  return { valid: true, phone: session.phone }
}

export function revokeSession(sessionId: string): boolean {
  const deleted = verifiedSessions.delete(sessionId)
  if (deleted) {
    saveSessions()
    console.log(`🗑️ Revoked session: ${sessionId}`)
  }
  return deleted
} 