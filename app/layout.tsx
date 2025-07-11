import './globals.css'
import React from 'react'

export const metadata = {
  title: 'LYO Request - Öğrenci Yönetim Sistemi',
  description: 'Öğrenci izin ve devam durumu takip sistemi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
} 