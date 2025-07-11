import fs from 'fs'
import path from 'path'

interface CallData {
  studentName: string
  parentPhone: string
  expiry: Date
}

class CallStorage {
  private storage = new Map<string, CallData>()
  private storageFile: string

  constructor() {
    this.storageFile = path.join(process.cwd(), '.next', 'auth-storage', 'call-data.json')
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
        console.log(`📂 Loaded ${this.storage.size} call data entries from file`)
      }
    } catch (error) {
      console.log('📂 No existing call data file found, starting fresh')
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
      console.error('💾 Failed to save call data:', error)
    }
  }

  set(id: string, data: CallData) {
    this.storage.set(id, data)
    this.saveToFile()
  }

  get(id: string): CallData | undefined {
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
      console.log(`🧹 Cleaned up ${cleaned} expired call data entries`)
    }
  }
}

export const callDataStorage = new CallStorage() 