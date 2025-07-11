import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface ApprovalData {
  studentName: string
  startDate: string
  endDate: string
  studentRowIndex: number
  parentPhone: string
  expiry: Date
  attempts: number
}

// In-memory storage for approval codes (same as SMS verification)
let approvalCodeStorage = new Map<string, ApprovalData>()

// Persistent storage path for development only
const STORAGE_DIR = join(process.cwd(), '.next', 'auth-storage')
const APPROVAL_FILE = join(STORAGE_DIR, 'approval-codes.json')

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

// Load existing approval codes from file (for development persistence only)
function loadApprovalCodes() {
  if (process.env.NODE_ENV !== 'development') {
    return // Skip file operations in production
  }
  
  try {
    if (existsSync(APPROVAL_FILE)) {
      const data = readFileSync(APPROVAL_FILE, 'utf-8')
      const approvalData = JSON.parse(data)
      
      // Convert expiry strings back to Date objects
      const processedData: [string, ApprovalData][] = Object.entries(approvalData).map(([code, data]: [string, any]) => [
        code,
        {
          ...data,
          expiry: new Date(data.expiry)
        } as ApprovalData
      ])
      
      approvalCodeStorage = new Map(processedData)
      console.log(`📂 Loaded ${approvalCodeStorage.size} existing approval codes`)
    }
  } catch (error) {
    console.log('📂 No existing approval codes found, starting fresh')
    approvalCodeStorage = new Map()
  }
}

// Save approval codes to file (for development persistence only)
function saveApprovalCodes() {
  if (process.env.NODE_ENV !== 'development') {
    return // Skip file operations in production
  }
  
  try {
    const approvalData = Object.fromEntries(approvalCodeStorage)
    writeFileSync(APPROVAL_FILE, JSON.stringify(approvalData, null, 2))
  } catch (error) {
    console.error('❌ Failed to save approval codes:', error)
  }
}

// Load approval codes on module initialization
loadApprovalCodes()

// Clean up expired codes every hour - only in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const now = new Date()
    let cleanedCount = 0
    for (const [code, data] of approvalCodeStorage.entries()) {
      if (now > data.expiry) {
        approvalCodeStorage.delete(code)
        cleanedCount++
      }
    }
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired approval codes`)
      saveApprovalCodes()
    }
  }, 60 * 60 * 1000)
}

export function storeApprovalCode(code: string, data: ApprovalData) {
  approvalCodeStorage.set(code, data)
  saveApprovalCodes()
  console.log(`💾 Stored SMS approval code: ${code} for ${data.studentName}`)
  console.log(`📊 Total stored codes: ${approvalCodeStorage.size}`)
}

export function verifyApprovalCode(code: string): ApprovalData | null {
  console.log(`🔍 SMS Approval verification attempt with code: ${code}`)
  console.log(`📊 Storage has ${approvalCodeStorage.size} codes available`)
  console.log(`📋 Available codes: ${JSON.stringify(Array.from(approvalCodeStorage.keys()))}`)
  
  const data = approvalCodeStorage.get(code)
  if (!data) {
    console.log(`❌ No approval data found for code: ${code}`)
    return null
  }
  
  // Check if expired
  if (new Date() > data.expiry) {
    approvalCodeStorage.delete(code)
    saveApprovalCodes()
    console.log(`❌ Approval code expired: ${code}`)
    return null
  }
  
  console.log(`✅ Valid approval code found for ${data.studentName}`)
  return data
}

export function deleteApprovalCode(code: string) {
  approvalCodeStorage.delete(code)
  saveApprovalCodes()
  console.log(`🗑️ Cleaned up approval code: ${code}`)
} 