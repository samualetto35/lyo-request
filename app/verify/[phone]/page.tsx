'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function VerifyPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const router = useRouter()
  const params = useParams()
  const phoneNumber = decodeURIComponent(params.phone as string)

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Resend cooldown timer
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resendCooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (code.length !== 6) {
      setError('Lütfen 6 haneli kodu girin')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/verify-sms-firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          code,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Doğrulama başarısız')
      }

      // Successful verification - redirect to student page using normalized phone
      const redirectPhone = data.redirectPhone || phoneNumber
      console.log(`📱 Redirecting to student page with phone: ${redirectPhone}`)
      router.push(`/student/${encodeURIComponent(redirectPhone)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return

    setResendLoading(true)
    setError('')

    try {
      const response = await fetch('/api/send-sms-firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'SMS gönderilemedi')
      }

      // Reset timers
      setTimeLeft(300)
      setResendCooldown(60) // 1 minute cooldown
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SMS gönderilemedi')
    } finally {
      setResendLoading(false)
    }
  }

  const goBack = () => {
    router.push('/')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPhone = (phone: string) => {
    // Format phone number for display
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('90')) {
      const number = cleaned.substring(2)
      return `+90 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6, 8)} ${number.substring(8)}`
    }
    return phone
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded mr-3 flex items-center justify-center">
                <span className="text-white font-bold">🎓</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">LYO Request</h1>
            </div>
            <button
              onClick={goBack}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-primary-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-white text-2xl">📱</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Doğrulama Kodu</h2>
            <p className="text-gray-600">
              {formatPhone(phoneNumber)} numarasına gönderilen 6 haneli kodu girin
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Doğrulama Kodu
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setCode(value)
                }}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent tracking-widest"
                maxLength={6}
                required
                disabled={loading}
              />
            </div>

            {/* Timer */}
            <div className="text-center">
              {timeLeft > 0 ? (
                <p className="text-sm text-gray-500">
                  Kod süresi: <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
                </p>
              ) : (
                <p className="text-sm text-red-600">
                  Kod süresi dolmuş. Yeni kod talep edin.
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-red-600 mr-2">❌</span>
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Doğrulanıyor...
                </>
              ) : (
                'Doğrula'
              )}
            </button>

            {/* Resend Button */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || resendCooldown > 0}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
              >
                {resendLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600 mr-2"></div>
                    Gönderiliyor...
                  </>
                ) : resendCooldown > 0 ? (
                  `Tekrar gönder (${resendCooldown}s)`
                ) : (
                  'Kodu tekrar gönder'
                )}
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              SMS almadıysanız spam klasörünüzü kontrol edin veya birkaç dakika bekleyin.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
} 