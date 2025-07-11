import './globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LYO Request',
  description: 'Sabancı Üniversitesi Lise Yaz Okulu İzin Yönetim Sistemi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
} 