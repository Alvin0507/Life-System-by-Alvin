import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/'

  if (!code) {
    return NextResponse.redirect(new URL('/auth/error?reason=no-code', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const msg = error.message.toLowerCase()
    const isPkce = msg.includes('pkce') || msg.includes('code verifier') || msg.includes('code challenge')
    if (isPkce) {
      const url = new URL('/login', request.url)
      url.searchParams.set('retry', '1')
      const res = NextResponse.redirect(url)
      for (const c of request.cookies.getAll()) {
        if (c.name.startsWith('sb-')) res.cookies.delete(c.name)
      }
      return res
    }
    return NextResponse.redirect(
      new URL(`/auth/error?reason=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL('/auth/error?reason=not-invited', request.url)
      )
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
