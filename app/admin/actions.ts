'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function inviteEmail(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return { error: '請輸入有效的 email。' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '未授權。' }

  const { error } = await supabase
    .from('invites')
    .upsert(
      { email, invited_by: user.id, status: 'pending' },
      { onConflict: 'email' }
    )

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

export async function revokeInvite(formData: FormData) {
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'Missing id' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('invites')
    .update({ status: 'revoked' })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

export async function restoreInvite(formData: FormData) {
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'Missing id' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('invites')
    .update({ status: 'pending' })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}
