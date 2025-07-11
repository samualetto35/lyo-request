'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'phone' | 'verification' | 'admin-password'>('phone')
  const [verificationCode, setVerificationCode] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const normalizePhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    
    if (cleaned.startsWith('90')) {
      return cleaned
    }
    
    if (cleaned.startsWith('0')) {
      return '90' + cleaned.substring(1)
    }
    
    if (cleaned.length === 10) {
      return '90' + cleaned
    }
    
    return cleaned
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!phoneNumber.trim()) {
      setError('Lütfen telefon numaranızı girin')
      return
    }

    // Check for admin backdoor
    if (phoneNumber.trim() === '11111') {
      setStep('admin-password')
      return
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber)
    
    if (normalizedPhone.length !== 12 || !normalizedPhone.startsWith('90')) {
      setError('Lütfen geçerli bir telefon numarası girin')
      return
    }

    setLoading(true)

    try {
      // Send SMS using Firebase backend
      const response = await fetch('/api/send-sms-firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: normalizedPhone }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'SMS gönderilemedi')
      }

      // Move to verification step
      setStep('verification')
      setCountdown(300) // 5 minutes
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!verificationCode.trim()) {
      setError('Lütfen doğrulama kodunu girin')
      return
    }

    if (verificationCode.length !== 6) {
      setError('Doğrulama kodu 6 haneli olmalıdır')
      return
    }

    setLoading(true)

    try {
      // Verify code using Firebase backend
      const response = await fetch('/api/verify-sms-firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: normalizePhoneNumber(phoneNumber),
          code: verificationCode
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Doğrulama başarısız')
      }

      // Redirect to student page
      router.push(`/student/${encodeURIComponent(normalizePhoneNumber(phoneNumber))}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Doğrulama hatası')
    } finally {
      setLoading(false)
    }
  }

  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!adminPassword.trim()) {
      setError('Lütfen şifreyi girin')
      return
    }

    if (adminPassword.toLowerCase() === 'sus') {
      // Redirect to dashboard
      router.push('/dashboard')
    } else {
      setError('Geçersiz şifre')
      setAdminPassword('')
    }
  }

  const handleResendCode = async () => {
    if (countdown > 0) return
    
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/send-sms-firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: normalizePhoneNumber(phoneNumber) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'SMS gönderilemedi')
      }

      setCountdown(300) // 5 minutes
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SMS tekrar gönderilemedi')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="font-neue-montreal text-lg md:text-xl font-normal text-blue-900">
              Sabancı Üniversitesi Lise Yaz Okulu
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            {step === 'phone' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Left Content */}
                <div className="text-left">
                  <h2 className="font-neue-montreal text-xl md:text-2xl lg:text-3xl font-light text-gray-500 mb-6 leading-tight">
                    Merhaba,
                  </h2>
                  <h3 className="font-neue-montreal text-2xl md:text-4xl lg:text-5xl font-normal mb-8 leading-[1.4] md:leading-[1.6]">
                    <span className="text-gray-900">LYO Öğrencinizin </span>
                    <span className="bg-gradient-to-r from-blue-400 to-blue-800 bg-clip-text text-transparent">İzinlerini</span>
                    <span className="text-gray-900"> buradan yönetebilirsiniz.</span>
                  </h3>
                  <p className="font-neue-montreal text-sm md:text-base text-gray-600 font-light mb-12 leading-relaxed">
                    İzinleri yönetebilmek için lütfen Veli Telefon numarası ile giriş yapınız
                  </p>

                  {/* Phone Input */}
                  <form onSubmit={handlePhoneSubmit} className="space-y-6">
                    <div className="relative">
                      <div className="flex">
                        <div className="flex items-center px-4 bg-gray-50 border border-r-0 border-gray-300 rounded-l-2xl">
                          <span className="text-gray-600 font-light text-sm">🇹🇷 +90</span>
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="532 123 45 67"
                          className="flex-1 px-6 py-4 border border-gray-300 rounded-r-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base md:text-lg font-normal placeholder-gray-400"
                          required
                          disabled={loading}
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-red-800 text-sm">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-4 px-8 rounded-2xl font-normal text-sm hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          SMS Gönderiliyor...
                        </>
                      ) : (
                        'SMS Gönder'
                      )}
                    </button>
                    
                    <p className="text-xs text-gray-500 text-center mt-3">
                      * Sadece sistemde kayıtlı öğrencilerin veli numaraları ile giriş yapılabilmektedir.
                    </p>
                  </form>
                </div>

                {/* Right Content - Placeholder for future image */}
                <div className="hidden lg:block">
                  <div className="w-full h-96 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="text-6xl mb-4">📚</div>
                      <p className="text-lg">Öğrenci Yönetim Sistemi</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : step === 'admin-password' ? (
              <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                  <h3 className="font-neue-montreal text-xl font-normal text-gray-900 mb-4">Admin Girişi</h3>
                  <p className="text-gray-600 text-sm">
                    Asistan portala erişim için şifrenizi girin
                  </p>
                </div>

                <form onSubmit={handleAdminPasswordSubmit} className="space-y-6">
                  <div>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Şifrenizi girin"
                      className="w-full px-6 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      required
                      autoComplete="off"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-purple-600 text-white py-4 px-8 rounded-2xl font-normal text-sm hover:bg-purple-700 transition duration-200"
                  >
                    Giriş Yap
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone')
                        setAdminPassword('')
                        setError('')
                        setPhoneNumber('')
                      }}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ← Telefon girişine dön
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                  <h3 className="font-neue-montreal text-xl font-normal text-gray-900 mb-4">Doğrulama Kodu</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {phoneNumber} numarasına gönderilen 6 haneli kodu girin
                  </p>
                  {countdown > 0 && (
                    <p className="text-sm text-blue-600">
                      Kalan süre: {formatTime(countdown)}
                    </p>
                  )}
                </div>

                <form onSubmit={handleVerificationSubmit} className="space-y-6">
                  <div>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="w-full px-6 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center text-lg font-mono tracking-widest"
                      required
                      disabled={loading}
                      maxLength={6}
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full bg-blue-600 text-white py-4 px-8 rounded-2xl font-normal text-sm hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Doğrulanıyor...
                      </>
                    ) : (
                      'Doğrula'
                    )}
                  </button>

                  <div className="text-center space-y-4">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={countdown > 0 || loading}
                      className="text-blue-600 hover:text-blue-700 text-sm font-light disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {countdown > 0 ? `Tekrar gönder (${formatTime(countdown)})` : 'Kodu tekrar gönder'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone')
                        setVerificationCode('')
                        setError('')
                        setCountdown(0)
                      }}
                      className="block w-full text-gray-500 hover:text-gray-700 text-sm"
                    >
                      ← Telefon numarasını değiştir
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* reCAPTCHA container */}
            <div id="recaptcha-container" className="mt-4"></div>
          </div>
        </div>

        {/* Support Section */}
        <div className="border-t border-gray-200 py-8 md:py-12">
          <div className="text-center max-w-2xl mx-auto px-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-neue-montreal text-base font-normal text-gray-900 mb-2">
              Desteğe ihtiyacınız var mı?
            </h3>
            <p className="text-gray-600 text-xs mb-4">
              Herhangi bir sorun yaşıyorsanız veya yardıma ihtiyacınız varsa, destek ekibimizle iletişime geçebilirsiniz.
            </p>
            <button className="inline-flex items-center px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition duration-200 text-xs">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              İletişime Geç
            </button>
          </div>
        </div>
      </main>
    </div>
  )
} 