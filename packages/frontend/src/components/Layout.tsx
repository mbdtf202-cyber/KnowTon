import type { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen-mobile flex flex-col bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-50">
      <Header />
      <main className="flex-1 container-safe pt-24 sm:pt-28 pb-4 sm:pb-6 lg:pb-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}
