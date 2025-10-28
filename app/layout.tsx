import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"

import Script from 'next/script'

import { Toaster } from "@/components/ui/sonner"
import { Analytics } from '@vercel/analytics/next'
import LoadingTransition from "@/components/loading-transition"

export const metadata: Metadata = {
  title: 'Sankhya - Força de Vendas',
  description: 'Sankhya - Força de Vendas',
  generator: 'Sankhya - Força de Vendas',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.sandbox.sankhya.com.br" />
        <link rel="dns-prefetch" href="https://api.sandbox.sankhya.com.br" />
        <link rel="preload" href="/anigif.gif" as="image" />
        <link rel="preload" href="/sankhya-logo-horizontal.png" as="image" />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <LoadingTransition />
          {children}
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}