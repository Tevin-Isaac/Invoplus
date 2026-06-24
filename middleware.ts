import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Middleware no longer needed - landing page is now handled by app/page.tsx
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
