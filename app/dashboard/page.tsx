'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Student {
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

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedDonem, setSelectedDonem] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [notification, setNotification] = useState<string>('')
  const [showNotification, setShowNotification] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchStudents()
    
    // Set up automatic refresh every 15 seconds for more real-time updates
    const interval = setInterval(() => {
      refreshData()
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterStudents()
  }, [students, searchTerm, selectedProgram, selectedDonem])

  const fetchStudents = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true)
      }
      
      // Enhanced cache busting with random parameter and timestamp
      const cacheBuster = `t=${Date.now()}&r=${Math.random().toString(36).substring(7)}&v=${Date.now()}`
      const response = await fetch(`/api/students?${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        cache: 'no-store', // Additional cache control
      })
      
      if (!response.ok) {
        throw new Error('Veri alınamadı')
      }
      
      // Log response headers for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Response headers:', {
          cacheControl: response.headers.get('cache-control'),
          freshData: response.headers.get('x-fresh-data'),
          fetchTime: response.headers.get('x-fetch-time'),
          studentsCount: response.headers.get('x-students-count'),
          permissionsCount: response.headers.get('x-permissions-count'),
        })
      }
      
      const data = await response.json()
      
      // Check for changes if this is a refresh
      if (isRefresh && students.length > 0) {
        const oldPermissionCount = students.reduce((total, student) => total + student.izinler.length, 0)
        const newPermissionCount = data.reduce((total: number, student: Student) => total + student.izinler.length, 0)
        
        if (newPermissionCount > oldPermissionCount) {
          setNotification(`${newPermissionCount - oldPermissionCount} yeni izin güncellemesi tespit edildi!`)
          setShowNotification(true)
          setTimeout(() => setShowNotification(false), 5000)
        } else if (JSON.stringify(students) !== JSON.stringify(data)) {
          // Check for any data changes, not just permission count
          setNotification('Veri güncellendi!')
          setShowNotification(true)
          setTimeout(() => setShowNotification(false), 3000)
        }
      }
      
      setStudents(data)
      setLastRefresh(new Date())
      setError('')
    } catch (err) {
      setError('Öğrenci verileri yüklenirken hata oluştu')
      console.error(err)
    } finally {
      setLoading(false)
      if (isRefresh) {
        setRefreshing(false)
      }
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchStudents(true)
  }

  const filterStudents = () => {
    let filtered = students

    // İsim ile arama
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.ogrenciAdi.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Program filtresi
    if (selectedProgram) {
      filtered = filtered.filter(student => student.ogrenciProgram === selectedProgram)
    }

    // Dönem filtresi
    if (selectedDonem) {
      filtered = filtered.filter(student => student.ogrenciDonem === selectedDonem)
    }

    setFilteredStudents(filtered)
  }

  const goBack = () => {
    router.push('/')
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedProgram('')
    setSelectedDonem('')
  }

  // Permission status color determination
  const getPermissionColor = (permission: string) => {
    const permissionLower = permission.toLowerCase()
    if (permissionLower.includes('✅') || permissionLower.includes('[onaylandi]') || permissionLower.includes('sistem onay')) {
      return 'bg-green-100 text-green-800' // Approved permissions - green
    } else if (permissionLower.includes('[reddedildi]') || permissionLower.includes('❌')) {
      return 'bg-red-100 text-red-800' // Rejected permissions - red
    } else if (permissionLower.includes('[beklemede]')) {
      return 'bg-yellow-100 text-yellow-800' // Pending permissions - yellow
    } else {
      return 'bg-gray-100 text-gray-800' // Default/other - gray
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Hata</h2>
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

  const totalStudents = students.length
  const filteredCount = filteredStudents.length
  const programCounts = students.reduce((acc, student) => {
    acc[student.ogrenciProgram] = (acc[student.ogrenciProgram] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Unique programs and semesters for filters
  const uniquePrograms = [...new Set(students.map(s => s.ogrenciProgram))].filter(Boolean)
  const uniqueDonemler = [...new Set(students.map(s => s.ogrenciDonem))].filter(Boolean)

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
              <div>
                <h1 className="text-2xl font-bold text-gray-900">LYO Request - Asistan Portalı</h1>
                <p className="text-sm text-gray-500">
                  Son güncelleme: {lastRefresh.toLocaleString('tr-TR')}
                  {refreshing && (
                    <span className="ml-2 text-blue-600">
                      <span className="animate-spin inline-block">🔄</span> Yenileniyor...
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <span className={refreshing ? "animate-spin" : ""}>🔄</span>
                <span className="ml-2">Yenile</span>
              </button>
              <button
                onClick={goBack}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Ana Sayfaya Dön
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Banner */}
      {showNotification && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mx-auto max-w-7xl">
          <div className="flex items-center">
            <span className="text-green-500 mr-2">✅</span>
            <p className="font-medium">{notification}</p>
            <button
              onClick={() => setShowNotification(false)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-full p-3 mr-4">
                <span className="text-blue-600 text-xl">👥</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Öğrenci</p>
                <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-3 mr-4">
                <span className="text-green-600 text-xl">📚</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Programlar</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(programCounts).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-full p-3 mr-4">
                <span className="text-purple-600 text-xl">🔍</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Filtrelenmiş</p>
                <p className="text-2xl font-bold text-gray-900">{filteredCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`rounded-full p-3 mr-4 ${refreshing ? 'bg-yellow-100' : 'bg-orange-100'}`}>
                <span className={`text-xl ${refreshing ? 'text-yellow-600' : 'text-orange-600'}`}>
                  {refreshing ? '🔄' : '📊'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Veri Durumu</p>
                <p className={`text-2xl font-bold ${refreshing ? 'text-yellow-600' : 'text-green-600'}`}>
                  {refreshing ? 'Güncelleniyor' : 'Güncel'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Program Distribution */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Dağılımı</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(programCounts).map(([program, count]) => (
              <div key={program} className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{program}</p>
                <p className="text-2xl font-bold text-primary-600">{count} öğrenci</p>
              </div>
            ))}
          </div>
        </div>

        {/* Student List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Öğrenci Listesi</h3>
            
            {/* Search and Filter Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Öğrenci adı ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔍</span>
                </div>
              </div>

              {/* Program Filter */}
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Tüm Programlar</option>
                {uniquePrograms.map(program => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>

              {/* Semester Filter */}
              <select
                value={selectedDonem}
                onChange={(e) => setSelectedDonem(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Tüm Dönemler</option>
                {uniqueDonemler.map(donem => (
                  <option key={donem} value={donem}>{donem}</option>
                ))}
              </select>

              {/* Clear Filters Button */}
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-200"
              >
                Filtreleri Temizle
              </button>
            </div>

            {/* Results Info */}
            <div className="text-sm text-gray-600 mb-4">
              {filteredCount} öğrenci gösteriliyor {totalStudents !== filteredCount && `(${totalStudents} toplam)`}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öğrenci Bilgileri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Veli Bilgileri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dönem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İzinler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student.ogrenciAdi}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.ogrenciDogumTarihi}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Anne: {student.veliAdi}
                        </div>
                        <div className="text-sm text-gray-500">
                          Tel: {student.veliTel}
                        </div>
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          Baba: {student.veliBabaAdi}
                        </div>
                        <div className="text-sm text-gray-500">
                          Tel: {student.veliBabaTel}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student.ogrenciProgram}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student.ogrenciDonem}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {student.ogrenciTel}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {student.izinler && student.izinler.length > 0 ? (
                          <div className="space-y-1">
                            {student.izinler.map((izin, izinIndex) => (
                              <div key={izinIndex} className={`inline-block ${getPermissionColor(izin)} px-2 py-1 rounded-full text-xs mr-1 mb-1`}>
                                {izin}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">İzin kaydı yok</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">🔍</div>
              <p className="text-gray-500">Arama kriterlerinize uygun öğrenci bulunamadı.</p>
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 