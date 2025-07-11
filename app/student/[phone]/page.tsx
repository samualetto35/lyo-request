'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Calendar from '../../components/Calendar'

interface Student {
  rowIndex: number
  veliAdi: string
  veliTel: string
  veliBabaAdi: string
  veliBabaTel: string
  ogrenciAdi: string
  ogrenciTel: string
  ogrenciDogumTarihi: string
  ogrenciProgram: string
  ogrenciDonem: string
  izinler: string[]
}

// Helper function to normalize phone numbers (same as in APIs)
function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Handle Turkish phone numbers
  if (digits.startsWith('90')) {
    return digits.substring(2) // Remove country code
  }
  if (digits.startsWith('0')) {
    return digits.substring(1) // Remove leading 0
  }
  
  return digits
}

export default function StudentDetail() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectingStartDate, setSelectingStartDate] = useState(true)
  const [permissionLoading, setPermissionLoading] = useState(false)
  const [permissionError, setPermissionError] = useState('')
  const [permissionSuccess, setPermissionSuccess] = useState('')
  
  // YENİ: Onay yöntemi seçimi için state'ler
  const [showApprovalMethodSelection, setShowApprovalMethodSelection] = useState(false)
  const [selectedApprovalMethod, setSelectedApprovalMethod] = useState<'sms' | 'voice' | null>(null)
  const [smsApprovalCode, setSmsApprovalCode] = useState('')
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [approvalError, setApprovalError] = useState('')
  const [approvalSuccess, setApprovalSuccess] = useState('')
  const [showSmsCodeInput, setShowSmsCodeInput] = useState(false)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    checkAuthentication()
  }, [])

  useEffect(() => {
    if (isAuthenticated && params.phone) {
      fetchStudentData(params.phone as string)
    }
  }, [params.phone, isAuthenticated])

  const checkAuthentication = async () => {
    try {
      console.log('🔐 Checking authentication...')
      
      const response = await fetch('/api/check-auth', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Authentication valid:', data)
        setIsAuthenticated(true)
      } else {
        console.log('❌ Authentication failed, redirecting to login')
        router.push('/')
        return
      }
    } catch (error) {
      console.error('🚨 Auth check error:', error)
      router.push('/')
      return
    } finally {
      setAuthChecking(false)
    }
  }

  const fetchStudentData = async (phoneNumber: string) => {
    try {
      // Try with the original phone number first
      console.log(`🔍 Fetching student data for phone: ${phoneNumber}`)
      
      const response = await fetch('/api/phone-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If original fails and it looks like a full number, try normalized
        if (phoneNumber.length > 10) {
          const normalizedPhone = normalizePhone(phoneNumber)
          console.log(`🔄 Trying with normalized phone: ${normalizedPhone}`)
          
          const normalizedResponse = await fetch('/api/phone-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumber: normalizedPhone }),
          })

          const normalizedData = await normalizedResponse.json()
          
          if (!normalizedResponse.ok) {
            throw new Error(normalizedData.error || 'Veri alınamadı')
          }
          
          setStudents(normalizedData.students)
          return
        }
        
        throw new Error(data.error || 'Veri alınamadı')
      }

      setStudents(data.students)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPermission = (student: Student) => {
    setSelectedStudent(student)
    setShowPermissionModal(true)
    setPermissionError('')
    setPermissionSuccess('')
    setStartDate(null)
    setEndDate(null)
    setSelectingStartDate(true)
  }

  const handleDateSelect = (date: Date) => {
    if (selectingStartDate) {
      setStartDate(date)
      setSelectingStartDate(false)
      // Clear any previous error when starting date selection
      setPermissionError('')
    } else {
      setEndDate(date)
      // Don't automatically submit - user must click the button
      // Clear any previous error when ending date selection
      setPermissionError('')
    }
  }

  const handlePermissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPermissionError('')
    setPermissionSuccess('')

    if (!selectedStudent || !startDate || !endDate) {
      setPermissionError('Lütfen tüm alanları doldurun')
      return
    }

    if (startDate > endDate) {
      setPermissionError('Başlangıç tarihi bitiş tarihinden sonra olamaz')
      return
    }

    setPermissionLoading(true)

    try {
      // Format dates as dd.mm.yyyy
      const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}.${month}.${year}`
      }

      const formattedStartDate = formatDate(startDate)
      const formattedEndDate = formatDate(endDate)

      const response = await fetch('/api/add-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentRowIndex: selectedStudent.rowIndex,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          studentName: selectedStudent.ogrenciAdi,
          parentPhone: selectedStudent.veliTel, // Ana veli telefonu
          skipVoiceCall: true, // YENİ: Otomatik arama yapmasın
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'İzin eklenemedi')
      }

      // Update the student's permissions in the local state
      const updatedStudents = students.map(student => 
        student.rowIndex === selectedStudent.rowIndex
          ? { ...student, izinler: [...student.izinler, data.permission] }
          : student
      )
      setStudents(updatedStudents)

      // YENİ: İzin eklendikten sonra onay yöntemi seçim ekranını göster
      setPermissionSuccess('İzin başarıyla eklendi! Şimdi onay yöntemini seçin.')
      setShowApprovalMethodSelection(true)

    } catch (err) {
      setPermissionError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setPermissionLoading(false)
    }
  }

  // YENİ: Onay yöntemi seçimi
  const handleApprovalMethodSelect = async (method: 'sms' | 'voice') => {
    setSelectedApprovalMethod(method)
    setApprovalError('')
    setApprovalLoading(true)

    if (!selectedStudent || !startDate || !endDate) {
      setApprovalError('Öğrenci ve tarih bilgileri eksik')
      setApprovalLoading(false)
      return
    }

    try {
      if (method === 'sms') {
        // SMS onay kodu gönder
        const formatDate = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0')
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const year = date.getFullYear()
          return `${day}.${month}.${year}`
        }

        const formattedStartDate = formatDate(startDate)
        const formattedEndDate = formatDate(endDate)

        const response = await fetch('/api/send-approval-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: selectedStudent.veliTel,
            studentName: selectedStudent.ogrenciAdi,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            studentRowIndex: selectedStudent.rowIndex,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'SMS gönderilemedi')
        }

        setApprovalSuccess('SMS onay kodu gönderildi! Lütfen kodu girin.')
        setShowSmsCodeInput(true)
        setShowApprovalMethodSelection(false)

      } else if (method === 'voice') {
        // Sesli arama başlat
        const formatDate = (date: Date) => {
          const day = date.getDate().toString().padStart(2, '0')
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const year = date.getFullYear()
          return `${day}.${month}.${year}`
        }

        const formattedStartDate = formatDate(startDate)
        const formattedEndDate = formatDate(endDate)

        const response = await fetch('/api/send-voice-approval', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: selectedStudent.veliTel,
            studentName: selectedStudent.ogrenciAdi,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            studentRowIndex: selectedStudent.rowIndex,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Sesli arama başlatılamadı')
        }

        setApprovalSuccess('Sesli arama başlatıldı! Telefonu bekleyin ve 1 (onay) veya 2 (ret) tuşlayın.')
        
        // Sesli aramadan sonra modal'ı kapat
        setTimeout(() => {
          setShowPermissionModal(false)
          resetPermissionModal()
        }, 3000)
      }

    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setApprovalLoading(false)
    }
  }

  // YENİ: SMS kod doğrulama
  const handleSmsCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApprovalError('')
    setApprovalLoading(true)

    if (!smsApprovalCode.trim()) {
      setApprovalError('Lütfen SMS kodunu girin')
      setApprovalLoading(false)
      return
    }

    try {
      const response = await fetch('/api/verify-approval-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: smsApprovalCode.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kod doğrulama başarısız')
      }

      setApprovalSuccess('İzin başarıyla onaylandı! Google Sheets güncellendi.')
      
      // Başarılı onaydan sonra modal'ı kapat
      setTimeout(() => {
        setShowPermissionModal(false)
        resetPermissionModal()
        // Sayfa yenilenmesi için student verisini tekrar yükle
        window.location.reload()
      }, 2000)

    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setApprovalLoading(false)
    }
  }

  // YENİ: Modal sıfırlama fonksiyonu
  const resetPermissionModal = () => {
    setStartDate(null)
    setEndDate(null)
    setSelectingStartDate(true)
    setPermissionError('')
    setPermissionSuccess('')
    setShowApprovalMethodSelection(false)
    setSelectedApprovalMethod(null)
    setSmsApprovalCode('')
    setApprovalError('')
    setApprovalSuccess('')
    setShowSmsCodeInput(false)
  }

  // Permission status color determination
  const getPermissionColor = (permission: string) => {
    const permissionLower = permission.toLowerCase()
    if (permissionLower.includes('✅') || permissionLower.includes('[onaylandi]') || permissionLower.includes('sistem onay')) {
      return 'bg-green-50 border-green-200 text-green-800' // Approved permissions - green
    } else if (permissionLower.includes('[reddedildi]') || permissionLower.includes('❌')) {
      return 'bg-red-50 border-red-200 text-red-800' // Rejected permissions - red
    } else if (permissionLower.includes('[beklemede]')) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800' // Pending permissions - yellow
    } else {
      return 'bg-gray-50 border-gray-200 text-gray-800' // Default/other - gray
    }
  }

  // Permission icon determination
  const getPermissionIcon = (permission: string) => {
    if (permission.includes('✅') || permission.includes('[ONAYLANDI]')) {
      return '✅' // Approved permissions
    } else if (permission.includes('[REDDEDİLDİ]') || permission.includes('❌')) {
      return '❌' // Rejected permissions
    } else if (permission.includes('[BEKLEMEDE]')) {
      return '⏳' // Pending permissions
    } else {
      return '📝' // Default/other
    }
  }

  const goBack = () => {
    router.push('/')
  }

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...')
      
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        console.log('✅ Logout successful')
        router.push('/')
      } else {
        console.error('❌ Logout failed')
        // Force redirect anyway
        router.push('/')
      }
    } catch (error) {
      console.error('🚨 Logout error:', error)
      // Force redirect anyway
      router.push('/')
    }
  }

  const resetDateSelection = () => {
    setStartDate(null)
    setEndDate(null)
    setSelectingStartDate(true)
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yetkilendirme kontrol ediliyor...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <span className="text-red-600 text-xl">🔒</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erişim Reddedildi</h2>
          <p className="text-gray-600 mb-4">Bu sayfaya erişebilmek için giriş yapmalısınız.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Öğrenci bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <span className="text-red-600 text-xl">❌</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Kayıt Bulunamadı</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={goBack}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    )
  }

  if (students.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded mr-3 flex items-center justify-center">
                <span className="text-white font-bold">🎓</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">LYO Request - Öğrenci Bilgileri</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPermissionModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <span className="mr-2">📝</span>
                Yeni İzin Ekle
              </button>
              <button
                onClick={goBack}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Ana Sayfaya Dön
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
              >
                <span className="mr-2">🚪</span>
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <div className="bg-primary-100 rounded-full p-3 mr-4">
              <span className="text-primary-600 text-xl">👋</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-primary-900">
                Hoş geldiniz!
              </h2>
              <p className="text-primary-700">
                {students.length} öğrenci kaydı bulundu
              </p>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="space-y-8">
          {students.map((student, index) => (
            <div key={student.rowIndex} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Student Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {student.ogrenciAdi}
                  </h3>
                  <button
                    onClick={() => handleAddPermission(student)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center"
                  >
                    <span className="mr-1">📝</span>
                    İzin Ekle
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Student Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Student Info Card */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="bg-blue-100 rounded-full p-2 mr-3">
                        <span className="text-blue-600 text-lg">👨‍🎓</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Öğrenci Bilgileri</h4>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Ad Soyad</p>
                        <p className="text-gray-900">{student.ogrenciAdi}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Doğum Tarihi</p>
                        <p className="text-gray-900">{student.ogrenciDogumTarihi}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Telefon</p>
                        <p className="text-gray-900">{student.ogrenciTel}</p>
                      </div>
                    </div>
                  </div>

                  {/* Program Info Card */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="bg-green-100 rounded-full p-2 mr-3">
                        <span className="text-green-600 text-lg">📚</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Program Bilgileri</h4>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Program</p>
                        <p className="text-gray-900">{student.ogrenciProgram}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Dönem</p>
                        <p className="text-gray-900">{student.ogrenciDonem}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parent Information */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-3">
                    <div className="bg-purple-100 rounded-full p-2 mr-3">
                      <span className="text-purple-600 text-lg">👨‍👩‍👧‍👦</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Veli Bilgileri</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Anne Bilgileri</h5>
                      <div className="space-y-1">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Ad Soyad</p>
                          <p className="text-gray-900">{student.veliAdi}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Telefon</p>
                          <p className="text-gray-900">{student.veliTel}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Baba Bilgileri</h5>
                      <div className="space-y-1">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Ad Soyad</p>
                          <p className="text-gray-900">{student.veliBabaAdi}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Telefon</p>
                          <p className="text-gray-900">{student.veliBabaTel}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="bg-orange-100 rounded-full p-2 mr-3">
                      <span className="text-orange-600 text-lg">📋</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">İzin Durumu</h4>
                  </div>
                  <div>
                    {student.izinler && student.izinler.length > 0 ? (
                      <div className="space-y-2">
                        {student.izinler.map((izin, izinIndex) => (
                          <div key={izinIndex} className={`flex items-center p-3 rounded-lg ${getPermissionColor(izin)}`}>
                            <span className="text-gray-900 mr-3">{getPermissionIcon(izin)}</span>
                            <span className="text-gray-900">{izin}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="text-gray-400 text-3xl mb-2">✅</div>
                        <p className="text-gray-600">Herhangi bir izin kaydı bulunmamaktadır.</p>
                        <p className="text-sm text-gray-500 mt-1">Tüm dersler için devam durumu normal.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Yeni İzin Ekle</h3>
            
            <form onSubmit={handlePermissionSubmit} className="space-y-6">
              {/* Student Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Öğrenci Seçin
                </label>
                <select
                  value={selectedStudent?.rowIndex || ''}
                  onChange={(e) => {
                    const student = students.find(s => s.rowIndex === parseInt(e.target.value))
                    setSelectedStudent(student || null)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Öğrenci seçin...</option>
                  {students.map((student) => (
                    <option key={student.rowIndex} value={student.rowIndex}>
                      {student.ogrenciAdi}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-100 rounded-full p-2 mr-3">
                    <span className="text-blue-600 text-lg">📅</span>
                  </div>
                  <h4 className="text-lg font-semibold text-blue-900">Tarih Seçimi</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-sm font-medium text-gray-500 mb-1">Başlangıç Tarihi</p>
                    <p className={`text-lg font-semibold ${startDate ? 'text-green-600' : 'text-gray-400'}`}>
                      {startDate ? startDate.toLocaleDateString('tr-TR') : 'Seçilmedi'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-sm font-medium text-gray-500 mb-1">Bitiş Tarihi</p>
                    <p className={`text-lg font-semibold ${endDate ? 'text-green-600' : 'text-gray-400'}`}>
                      {endDate ? endDate.toLocaleDateString('tr-TR') : 'Seçilmedi'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-blue-700">
                    {selectingStartDate ? 
                      '🔵 Başlangıç tarihi seçiyorsunuz' : 
                      '🟢 Bitiş tarihi seçiyorsunuz'
                    }
                  </p>
                  <button
                    type="button"
                    onClick={resetDateSelection}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Tarihleri Sıfırla
                  </button>
                </div>
              </div>

              {/* Calendar */}
              <div className="flex justify-center">
                <Calendar
                  selectedDate={selectingStartDate ? startDate : endDate}
                  onDateSelect={handleDateSelect}
                  minDate={selectingStartDate ? new Date() : startDate || new Date()}
                  className="shadow-md"
                />
              </div>

              {/* Confirmation Section - Shows when both dates are selected */}
              {startDate && endDate && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="bg-green-100 rounded-full p-2 mr-3">
                      <span className="text-green-600 text-lg">✅</span>
                    </div>
                    <h4 className="text-lg font-semibold text-green-900">Tarih Seçimi Tamamlandı</h4>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Seçili İzin Dönemi:</strong>
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {startDate.toLocaleDateString('tr-TR')} - {endDate.toLocaleDateString('tr-TR')}
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      👆 Tarihleri onaylamak için aşağıdaki "Kabul Ediyorum" butonuna tıklayın.
                    </p>
                  </div>
                </div>
              )}

              {/* Error/Success Messages */}
              {permissionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-red-600 mr-2">❌</span>
                    <p className="text-red-800 text-sm">{permissionError}</p>
                  </div>
                </div>
              )}

              {permissionSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✅</span>
                    <p className="text-green-800 text-sm">{permissionSuccess}</p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionModal(false)
                    resetPermissionModal()
                  }}
                  className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={permissionLoading || approvalLoading}
                >
                  İptal
                </button>
                
                {!showApprovalMethodSelection && !showSmsCodeInput && (
                  <button
                    type="submit"
                    disabled={permissionLoading || !startDate || !endDate}
                    className={`px-6 py-2 rounded-lg flex items-center transition-all duration-300 font-medium ${
                      startDate && endDate && !permissionLoading
                        ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg hover:scale-105 animate-pulse'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {permissionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Ekleniyor...
                      </>
                    ) : startDate && endDate ? (
                      <>
                        <span className="mr-2">🎯</span>
                        İzin Ekle
                      </>
                    ) : (
                      <>
                        <span className="mr-2">📅</span>
                        Tarihleri Seçin
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>

            {/* YENİ: Onay Yöntemi Seçimi */}
            {showApprovalMethodSelection && (
              <div className="mt-6 border-t pt-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-3">
                    <div className="bg-blue-100 rounded-full p-2 mr-3">
                      <span className="text-blue-600 text-lg">🎯</span>
                    </div>
                    <h4 className="text-lg font-semibold text-blue-900">İzin Onay Yöntemi Seçin</h4>
                  </div>
                  <p className="text-blue-700 text-sm mb-4">
                    {selectedStudent?.ogrenciAdi} için {startDate?.toLocaleDateString('tr-TR')} - {endDate?.toLocaleDateString('tr-TR')} 
                    tarihleri arasındaki izni nasıl onaylamak istiyorsunuz?
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SMS Onay */}
                    <button
                      onClick={() => handleApprovalMethodSelect('sms')}
                      disabled={approvalLoading}
                      className="bg-white border-2 border-green-200 rounded-lg p-4 hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="text-center">
                        <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                          <span className="text-green-600 text-2xl">📱</span>
                        </div>
                        <h5 className="font-semibold text-gray-900 mb-2">SMS ile Onay</h5>
                        <p className="text-sm text-gray-600">
                          Telefonunuza SMS kodu gönderilir, kodu girerek onaylarsınız
                        </p>
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          ✅ Hızlı ve kolay
                        </div>
                      </div>
                    </button>

                    {/* Sesli Arama Onay */}
                    <button
                      onClick={() => handleApprovalMethodSelect('voice')}
                      disabled={approvalLoading}
                      className="bg-white border-2 border-purple-200 rounded-lg p-4 hover:border-purple-400 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="text-center">
                        <div className="bg-purple-100 rounded-full p-3 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                          <span className="text-purple-600 text-2xl">📞</span>
                        </div>
                        <h5 className="font-semibold text-gray-900 mb-2">Sesli Arama ile Onay</h5>
                        <p className="text-sm text-gray-600">
                          Otomatik arama gelir, 1'e basarak onay, 2'ye basarak ret
                        </p>
                        <div className="mt-2 text-xs text-purple-600 font-medium">
                          🎤 Ses tanıma ile
                        </div>
                      </div>
                    </button>
                  </div>

                  {approvalLoading && (
                    <div className="mt-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-blue-600">
                        {selectedApprovalMethod === 'sms' ? 'SMS gönderiliyor...' : 'Arama başlatılıyor...'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* YENİ: SMS Kod Girişi */}
            {showSmsCodeInput && (
              <div className="mt-6 border-t pt-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="bg-green-100 rounded-full p-2 mr-3">
                      <span className="text-green-600 text-lg">📱</span>
                    </div>
                    <h4 className="text-lg font-semibold text-green-900">SMS Onay Kodu</h4>
                  </div>
                  
                  <p className="text-green-700 text-sm mb-4">
                    {selectedStudent?.veliTel} numaralı telefona onay kodu gönderildi. 
                    Lütfen gelen kodu aşağıya girin:
                  </p>

                  <form onSubmit={handleSmsCodeSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SMS Onay Kodu
                      </label>
                      <input
                        type="text"
                        value={smsApprovalCode}
                        onChange={(e) => setSmsApprovalCode(e.target.value)}
                        placeholder="6 haneli kodu girin"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-mono"
                        maxLength={6}
                        disabled={approvalLoading}
                        autoFocus
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSmsCodeInput(false)
                          setShowApprovalMethodSelection(true)
                          setSmsApprovalCode('')
                          setApprovalError('')
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                        disabled={approvalLoading}
                      >
                        Geri
                      </button>
                      <button
                        type="submit"
                        disabled={approvalLoading || !smsApprovalCode.trim()}
                        className={`px-6 py-2 rounded-lg flex items-center transition-all font-medium ${
                          smsApprovalCode.trim() && !approvalLoading
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {approvalLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Doğrulanıyor...
                          </>
                        ) : (
                          <>
                            <span className="mr-2">✅</span>
                            Kodu Onayla
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Hata/Başarı Mesajları */}
            {approvalError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center">
                  <span className="text-red-600 mr-2">❌</span>
                  <p className="text-red-800 text-sm">{approvalError}</p>
                </div>
              </div>
            )}

            {approvalSuccess && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <p className="text-green-800 text-sm">{approvalSuccess}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 