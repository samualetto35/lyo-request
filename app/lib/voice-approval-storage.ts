import fs from 'fs'
import path from 'path'

interface VoiceApprovalData {
  studentName: string
  startDate: string
  endDate: string
  studentRowIndex: number
  parentPhone: string
  expiry: Date
}

class VoiceApprovalStorage {
  private storage = new Map<string, VoiceApprovalData>()
  private storageFile: string

  constructor() {
    this.storageFile = path.join(process.cwd(), '.next', 'auth-storage', 'voice-approval-data.json')
    this.loadFromFile()
  }

  private loadFromFile() {
    if (process.env.NODE_ENV !== 'development') {
      return // Skip file operations in production
    }
    
    try {
      // Ensure directory exists only in development
      const dir = path.dirname(this.storageFile)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      if (fs.existsSync(this.storageFile)) {
        const data = JSON.parse(fs.readFileSync(this.storageFile, 'utf-8'))
        this.storage = new Map(
          Object.entries(data).map(([id, item]: [string, any]) => [
            id,
            { ...item, expiry: new Date(item.expiry) }
          ])
        )
        console.log(`📂 Loaded ${this.storage.size} voice approval data entries from file`)
      }
    } catch (error) {
      console.log('📂 No existing voice approval data file found, starting fresh')
    }
  }

  private saveToFile() {
    if (process.env.NODE_ENV !== 'development') {
      return // Skip file operations in production
    }
    
    try {
      const data = Object.fromEntries(
        Array.from(this.storage.entries()).map(([id, item]) => [
          id,
          { ...item, expiry: item.expiry.toISOString() }
        ])
      )
      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('💾 Failed to save voice approval data:', error)
    }
  }

  set(id: string, data: VoiceApprovalData) {
    this.storage.set(id, data)
    this.saveToFile()
  }

  get(id: string): VoiceApprovalData | undefined {
    this.cleanup()
    return this.storage.get(id)
  }

  has(id: string): boolean {
    this.cleanup()
    return this.storage.has(id)
  }

  delete(id: string) {
    this.storage.delete(id)
    this.saveToFile()
  }

  cleanup() {
    const now = new Date()
    let cleaned = 0
    for (const [id, data] of this.storage.entries()) {
      if (now > data.expiry) {
        this.storage.delete(id)
        cleaned++
      }
    }
    if (cleaned > 0) {
      this.saveToFile()
      console.log(`🧹 Cleaned up ${cleaned} expired voice approval data entries`)
    }
  }
}

export const voiceApprovalStorage = new VoiceApprovalStorage() 