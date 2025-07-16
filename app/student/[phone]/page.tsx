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
  ogrenciCinsiyet?: string // Added for gender
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

  // Add state for selected tab
  const [selectedTab, setSelectedTab] = useState<'cocuklarim' | 'gecmis' | 'yardim'>('cocuklarim');
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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

      // Otomatik olarak SMS gönder
      const smsResponse = await fetch('/api/send-approval-sms', {
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
      const smsData = await smsResponse.json()
      if (!smsResponse.ok) {
        throw new Error(smsData.error || 'SMS gönderilemedi')
      }

      setPermissionSuccess('İzin başarıyla eklendi! Şimdi SMS ile onaylayın.')
      setShowSmsCodeInput(true)

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
      // Başarılı onaydan sonra success overlay göster
      setShowSuccessOverlay(true)
      setTimeout(() => {
        setShowSuccessOverlay(false)
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

  // Calendar highlight logic
  const highlightedDays: { date: Date, label: string, isSelectedStudent?: boolean }[] = [];
  if (selectedStudent) {
    // Sadece seçili öğrencinin izinli günleri
    selectedStudent.izinler?.forEach(izin => {
      if (!izin.toLowerCase().includes('beklemede')) {
        const dateRangeRegex = /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/g;
        let match;
        while ((match = dateRangeRegex.exec(izin)) !== null) {
          const [_, startStr, endStr] = match;
          const [startDay, startMonth, startYear] = startStr.split('.').map(Number);
          const [endDay, endMonth, endYear] = endStr.split('.').map(Number);
          const startDate = new Date(startYear, startMonth - 1, startDay);
          const endDate = new Date(endYear, endMonth - 1, endDay);
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const names = selectedStudent.ogrenciAdi.split(' ');
            const label = names[0] + (names[1] ? ' ' + names[1][0] + '.' : '');
            highlightedDays.push({ date: new Date(d), label, isSelectedStudent: true });
          }
        }
      }
    });
    // Diğer öğrenciler
    students.forEach(student => {
      if (student.rowIndex !== selectedStudent.rowIndex && student.izinler && student.izinler.length > 0) {
        student.izinler.forEach(izin => {
          if (!izin.toLowerCase().includes('beklemede')) {
            const dateRangeRegex = /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/g;
            let match;
            while ((match = dateRangeRegex.exec(izin)) !== null) {
              const [_, startStr, endStr] = match;
              const [startDay, startMonth, startYear] = startStr.split('.').map(Number);
              const [endDay, endMonth, endYear] = endStr.split('.').map(Number);
              const startDate = new Date(startYear, startMonth - 1, startDay);
              const endDate = new Date(endYear, endMonth - 1, endDay);
              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const names = student.ogrenciAdi.split(' ');
                const label = names[0] + (names[1] ? ' ' + names[1][0] + '.' : '');
                highlightedDays.push({ date: new Date(d), label, isSelectedStudent: false });
              }
            }
          }
        });
      }
    });
  } else {
    // Seçili öğrenci yoksa, tüm izinli günleri göster
    students.forEach(student => {
      if (student.izinler && student.izinler.length > 0) {
        student.izinler.forEach(izin => {
          if (!izin.toLowerCase().includes('beklemede')) {
            const dateRangeRegex = /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/g;
            let match;
            while ((match = dateRangeRegex.exec(izin)) !== null) {
              const [_, startStr, endStr] = match;
              const [startDay, startMonth, startYear] = startStr.split('.').map(Number);
              const [endDay, endMonth, endYear] = endStr.split('.').map(Number);
              const startDate = new Date(startYear, startMonth - 1, startDay);
              const endDate = new Date(endYear, endMonth - 1, endDay);
              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const names = student.ogrenciAdi.split(' ');
                const label = names[0] + (names[1] ? ' ' + names[1][0] + '.' : '');
                highlightedDays.push({ date: new Date(d), label });
              }
            }
          }
        });
      }
    });
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
    <div className="min-h-screen bg-white">
      {/* 1. Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-4">
          <span className="text-xl font-medium text-orange-500">Sabancı Lise Yaz Okulu</span>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-3 py-1 rounded-full font-medium border border-red-500 text-red-600 bg-white hover:bg-red-50 transition text-xs md:text-base md:px-5 md:py-2 md:rounded-xl"
          >
            Çıkış Yapın
          </button>
        </div>
        {/* Tab Bar */}
        <div className="max-w-3xl mx-auto flex border-b border-gray-100 px-4">
          <button onClick={() => setSelectedTab('cocuklarim')} className={`flex-1 py-2 text-center text-sm relative ${selectedTab === 'cocuklarim' ? 'font-semibold text-gray-900' : 'font-normal text-gray-400'}`}>
            Çocuklarım
            {selectedTab === 'cocuklarim' && (
              <span className="block mx-auto mt-1 bg-orange-500 rounded-full" style={{height:'3px',width:'32px'}}></span>
            )}
          </button>
          <button onClick={() => setSelectedTab('gecmis')} className={`flex-1 py-2 text-center text-sm relative ${selectedTab === 'gecmis' ? 'font-semibold text-gray-900' : 'font-normal text-gray-400'}`}>
            İzin Geçmişi
            {selectedTab === 'gecmis' && (
              <span className="block mx-auto mt-1 bg-orange-500 rounded-full" style={{height:'3px',width:'32px'}}></span>
            )}
          </button>
          <button onClick={() => setSelectedTab('yardim')} className={`flex-1 py-2 text-center text-sm relative ${selectedTab === 'yardim' ? 'font-semibold text-gray-900' : 'font-normal text-gray-400'}`}>
            Yardım
            {selectedTab === 'yardim' && (
              <span className="block mx-auto mt-1 bg-orange-500 rounded-full" style={{height:'3px',width:'32px'}}></span>
            )}
          </button>
        </div>
      </div>

      {/* Change main container width and padding */}
      <div className="max-w-5xl mx-auto px-2 md:px-8 pb-8">
        {/* Greeting and Tab Content */}
        {selectedTab === 'cocuklarim' && (
          <>
            <h2 className="text-xl md:text-2xl font-light text-gray-700 mt-6 mb-4 md:mt-8 md:mb-6 flex items-center gap-2 pl-4 md:pl-0">Merhaba {students[0]?.veliAdi || students[0]?.veliBabaAdi || 'Veli'}, <span className="text-xl md:text-2xl">👋</span></h2>
            {students.map((student, idx) => (
              <div key={student.rowIndex} className="rounded-2xl border border-gray-200 bg-gray-50 mb-4 md:mb-6 p-3 md:p-5 flex flex-col md:flex-row md:items-center relative w-full">
                <div className="flex-1 px-4 md:px-0">
                  <div className="text-base md:text-xl font-normal text-gray-900 mb-1">{student.ogrenciAdi}</div>
                  <div className="text-xs md:text-sm text-gray-500 mb-1">{student.ogrenciDogumTarihi}</div>
                  <div className="text-xs md:text-sm text-gray-500 mb-1">{student.ogrenciProgram}</div>
                  <div className="text-xs md:text-sm text-gray-500 mb-1">{student.ogrenciCinsiyet ? (student.ogrenciCinsiyet.toLowerCase() === 'erkek' ? 'oğlu' : 'kızı') : 'oğlu'}</div>
                </div>
                <span className="absolute top-3 right-3 md:static md:ml-4 bg-green-100 text-green-700 text-xs font-medium px-4 py-1 rounded-full whitespace-nowrap">{student.ogrenciDonem ? `${student.ogrenciDonem}. Dönem` : ''}</span>
              </div>
            ))}
            <button
              onClick={() => setShowPermissionModal(true)}
              className="block w-full text-center border border-blue-400 text-blue-500 font-semibold rounded-2xl py-3 md:py-4 mb-6 md:mb-8 hover:bg-blue-50 transition text-base md:text-lg"
            >
              Yeni İzin Oluştur
            </button>
            {/* Calendar Section */}
            <div className="mb-8 md:mb-10">
              <h3 className="text-2xl md:text-3xl font-light text-gray-900 mb-4 md:mb-6 pl-4 md:pl-0">İzin Takvimi</h3>
              <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm overflow-x-auto md:min-w-[700px]">
                <Calendar
                  selectedDate={null}
                  onDateSelect={() => {}}
                  minDate={undefined}
                  className="w-full"
                  highlightedDays={highlightedDays}
                />
                <div className="flex items-center space-x-4 md:space-x-6 mt-4 md:mt-6">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-900"></span>
                    <span className="text-xs md:text-sm text-gray-700">Onaylanmış İzinler</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-200"></span>
                    <span className="text-xs md:text-sm text-gray-500">Completed Interview</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {selectedTab === 'gecmis' && (
          <>
            <h2 className="text-2xl font-light text-gray-700 mt-8 mb-2 flex items-center gap-2 pl-4 md:pl-0">İzin Geçmişi</h2>
            <div className="pl-4 md:pl-0 mb-4 text-xs text-gray-500">
              Herhangi bir sorun veya izin silme işleminiz için <a href="mailto:liseyazokulu@sabanciuniv.edu" className="underline">liseyazokulu@sabanciuniv.edu</a> adresine mail atabilir veya <a href="tel:+905551234567" className="underline">+90 555 123 45 67</a> telefon numarasından ulaşabilirsiniz.
            </div>
            <button
              onClick={() => setShowPermissionModal(true)}
              className="block w-full text-center border border-blue-400 text-blue-500 font-semibold rounded-2xl py-4 mb-8 hover:bg-blue-50 transition"
            >
              Yeni İzin Oluştur
            </button>
            <div className="space-y-4">
              {students.map((student) => (
                <div key={student.rowIndex} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="font-medium text-gray-900 mb-2">{student.ogrenciAdi}</div>
                  {student.izinler && student.izinler.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {student.izinler.map((izin, idx) => {
                        const isBeklemede = izin.toLowerCase().includes('beklemede');
                        const boxClass = isBeklemede
                          ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                          : 'bg-green-50 text-green-800 border border-green-200';
                        return (
                          <div key={idx} className={`w-full rounded-xl px-4 py-2 text-sm font-medium ${boxClass}`}>
                            {izin}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">Geçmiş izin bulunamadı.</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        {selectedTab === 'yardim' && (
          <>
            <h2 className="text-2xl font-light text-gray-700 mt-8 mb-6 flex items-center gap-2 pl-4 md:pl-0">Yardım</h2>
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Adım Adım: Nasıl İzin Alınır?</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-700 text-base">
                <li>Giriş yaptıktan sonra <b>Çocuklarım</b> sekmesinde ilgili öğrenciyi seçin.</li>
                <li>"Yeni İzin Oluştur" butonuna tıklayın.</li>
                <li>Açılan ekranda izin almak istediğiniz öğrenciyi seçin.</li>
                <li>Takvimden izinli olmak istediğiniz tarih aralığını seçin. Önceden izinli günler gri ve mavi çerçeveli olarak görünür, tekrar seçilemez.</li>
                <li>Devam Et butonuna tıklayın.</li>
                <li>Telefonunuza gelen SMS onay kodunu girin ve "Kodu Onayla"ya basın.</li>
                <li>İzniniz sisteme kaydedildiğinde ekranda onay mesajı göreceksiniz.</li>
                <li>Herhangi bir sorun yaşarsanız <a href="mailto:liseyazokulu@sabanciuniv.edu" className="underline">liseyazokulu@sabanciuniv.edu</a> adresine mail atabilir veya <a href="tel:+905551234567" className="underline">+90 555 123 45 67</a> numarasını arayabilirsiniz.</li>
              </ol>
              <div className="mt-8 flex justify-center">
                <a
                  href="mailto:liseyazokulu@sabanciuniv.edu"
                  className="px-8 py-3 rounded-full border border-gray-300 bg-white text-gray-700 font-medium inline-block"
                >
                  İletişime Geçin
                </a>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-0 w-full max-w-lg md:max-w-4xl mx-4 max-h-[90vh] overflow-y-auto relative shadow-xl">
            {/* Loading overlay for SMS approval or permission creation */}
            {(approvalLoading || permissionLoading) && (
              <div className="absolute inset-0 bg-white bg-opacity-80 z-50 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <div className="text-blue-700 text-lg font-semibold">Lütfen bekleyin...</div>
              </div>
            )}
            {/* Success overlay */}
            {showSuccessOverlay && (
              <div className="absolute inset-0 bg-white bg-opacity-90 z-50 flex flex-col items-center justify-center">
                <div className="text-green-600 text-4xl mb-4">✅</div>
                <div className="text-green-800 text-lg font-semibold mb-2 text-center">İzin sisteme eklendi</div>
                <div className="text-green-700 text-base text-center">Onayınız kaydedildi</div>
              </div>
            )}
            {/* Close button */}
            <button
              onClick={() => { setShowPermissionModal(false); resetPermissionModal(); }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              aria-label="Kapat"
            >
              ×
            </button>
            <form onSubmit={handlePermissionSubmit} className="p-4 md:p-8 pt-4 space-y-4">
              {/* Title */}
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 text-center mb-2">İzin Oluşturun</h3>
              {/* Student selection */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Öğrenci</label>
                <select
                  value={selectedStudent?.rowIndex || ''}
                  onChange={e => {
                    const student = students.find(s => s.rowIndex === parseInt(e.target.value));
                    setSelectedStudent(student || null);
                    setStartDate(null); setEndDate(null); setPermissionError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={showSmsCodeInput}
                >
                  <option value="">Öğrenci seçin...</option>
                  {students.map(student => (
                    <option key={student.rowIndex} value={student.rowIndex}>{student.ogrenciAdi}</option>
                  ))}
                </select>
              </div>
              {/* Calendar for range selection */}
              {!showSmsCodeInput && selectedStudent && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tarih Aralığı</label>
                  <div className="w-full flex justify-center">
                    <Calendar
                      selectedDate={startDate && endDate ? endDate : startDate}
                      onDateSelect={date => {
                        if (!startDate || (startDate && endDate)) {
                          setStartDate(date); setEndDate(null); setPermissionError('');
                        } else if (date < startDate) {
                          setStartDate(date); setEndDate(null); setPermissionError('');
                        } else {
                          setEndDate(date);
                        }
                      }}
                      minDate={new Date()}
                      className="shadow-none border-none w-full"
                      rangeStart={startDate}
                      rangeEnd={endDate}
                      highlightedDays={(() => {
                        const days: {date: Date, label: string, isSelectedStudent?: boolean}[] = [];
                        selectedStudent.izinler?.forEach(izin => {
                          if (!izin.toLowerCase().includes('beklemede')) {
                            const dateRangeRegex = /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/g;
                            let match;
                            while ((match = dateRangeRegex.exec(izin)) !== null) {
                              const [_, startStr, endStr] = match;
                              const [startDay, startMonth, startYear] = startStr.split('.').map(Number);
                              const [endDay, endMonth, endYear] = endStr.split('.').map(Number);
                              const startDate = new Date(startYear, startMonth - 1, startDay);
                              const endDate = new Date(endYear, endMonth - 1, endDay);
                              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                                days.push({date: new Date(d), label: '', isSelectedStudent: true});
                              }
                            }
                          }
                        });
                        return days;
                      })()}
                      disabledDays={(() => {
                        const days: Date[] = [];
                        selectedStudent.izinler?.forEach(izin => {
                          if (!izin.toLowerCase().includes('beklemede')) {
                            const dateRangeRegex = /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/g;
                            let match;
                            while ((match = dateRangeRegex.exec(izin)) !== null) {
                              const [_, startStr, endStr] = match;
                              const [startDay, startMonth, startYear] = startStr.split('.').map(Number);
                              const [endDay, endMonth, endYear] = endStr.split('.').map(Number);
                              const startDate = new Date(startYear, startMonth - 1, startDay);
                              const endDate = new Date(endYear, endMonth - 1, endDay);
                              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                                days.push(new Date(d));
                              }
                            }
                          }
                        });
                        return days;
                      })()}
                    />
                  </div>
                  {/* Show selected range */}
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>Başlangıç: {startDate ? startDate.toLocaleDateString('tr-TR') : '-'}</span>
                    <span>Bitiş: {endDate ? endDate.toLocaleDateString('tr-TR') : '-'}</span>
                  </div>
                </div>
              )}
              {/* Overlap warning */}
              {startDate && endDate && selectedStudent && selectedStudent.izinler && selectedStudent.izinler.some(izin => {
                if (izin.toLowerCase().includes('beklemede')) return false;
                const dateRangeRegex = /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/g;
                let match;
                while ((match = dateRangeRegex.exec(izin)) !== null) {
                  const [_, startStr, endStr] = match;
                  const [sD, sM, sY] = startStr.split('.').map(Number);
                  const [eD, eM, eY] = endStr.split('.').map(Number);
                  const izinStart = new Date(sY, sM - 1, sD);
                  const izinEnd = new Date(eY, eM - 1, eD);
                  if (startDate <= izinEnd && endDate >= izinStart) return true;
                }
                return false;
              }) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 font-medium text-center">
                  Seçilen tarih aralığı mevcut izinlerle çakışıyor!
                </div>
              )}
              {/* Error/Success Messages */}
              {permissionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 font-medium text-center">
                  {permissionError}
                </div>
              )}
              {permissionSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700 font-medium text-center">
                  {permissionSuccess}
                </div>
              )}
              {/* Bottom buttons */}
              <div className="flex justify-between items-center pt-2 border-t mt-4">
                <button
                  type="button"
                  onClick={() => { setShowPermissionModal(false); resetPermissionModal(); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-xs font-medium"
                  disabled={permissionLoading || approvalLoading}
                >
                  İptal
                </button>
                {!showSmsCodeInput && (
                  <button
                    type="submit"
                    disabled={Boolean(permissionLoading || !startDate || !endDate || (selectedStudent && selectedStudent.izinler && selectedStudent.izinler.some(izin => {
                      if (izin.toLowerCase().includes('beklemede')) return false;
                      const dateRangeRegex = /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/g;
                      let match;
                      while ((match = dateRangeRegex.exec(izin)) !== null) {
                        const [_, startStr, endStr] = match;
                        const [sD, sM, sY] = startStr.split('.').map(Number);
                        const [eD, eM, eY] = endStr.split('.').map(Number);
                        const izinStart = new Date(sY, sM - 1, sD);
                        const izinEnd = new Date(eY, eM - 1, eD);
                        if (startDate && endDate && startDate <= izinEnd && endDate >= izinStart) return true;
                      }
                      return false;
                    })))}
                    className={`px-6 py-2 rounded-lg flex items-center transition-all duration-300 font-medium text-xs
                      ${!!startDate && !!endDate && !permissionLoading && !(selectedStudent && selectedStudent.izinler && selectedStudent.izinler.some(izin => {
                        if (izin.toLowerCase().includes('beklemede')) return false;
                        const dateRangeRegex = /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/g;
                        let match;
                        while ((match = dateRangeRegex.exec(izin)) !== null) {
                          const [_, startStr, endStr] = match;
                          const [sD, sM, sY] = startStr.split('.').map(Number);
                          const [eD, eM, eY] = endStr.split('.').map(Number);
                          const izinStart = new Date(sY, sM - 1, sD);
                          const izinEnd = new Date(eY, eM - 1, eD);
                          if (startDate && endDate && startDate <= izinEnd && endDate >= izinStart) return true;
                        }
                        return false;
                      }))
                        ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg hover:scale-105'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    {permissionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Devam Ediyor...
                      </>
                    ) : (
                      <>
                        Devam Et
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
            {/* Onay yöntemi ve SMS kodu UI'ları aşağıda aynı şekilde kalacak */}
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
              <div className="mt-6 px-2 pb-3">
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
      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl p-4 max-w-xs w-full flex flex-col items-center">
            <div className="text-lg mb-1 text-red-500 font-semibold">Çıkış Yapmak Üzeresiniz</div>
            <div className="text-gray-700 mb-4 text-center text-sm">Emin misiniz? Oturumunuz kapatılacak.</div>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
              >
                Vazgeç
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Evet, Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 