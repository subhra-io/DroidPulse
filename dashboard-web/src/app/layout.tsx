import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Optimizer Dashboard',
  description: 'Real-time Android performance monitoring',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-dark-bg text-white">{children}</body>
    </html>
  )
}
