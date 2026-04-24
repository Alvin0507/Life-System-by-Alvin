'use client'
import { create } from 'zustand'
import { createClient as createSupabase, getSessionUser } from '@/lib/supabase/client'
import {
  MonthlyOutput,
  FieldTrip,
  Deadline,
  ClientName,
  RevenueStatus,
  TaskStatus,
  Client,
  ClientConfig,
} from '@/types'
import { getYearMonth } from '@/lib/utils'

/* ── Live module-scoped client config (rebuilt on load) ── */
export const CLIENT_CONFIG: Record<string, ClientConfig> = {}
export const CLIENT_ORDER: ClientName[] = []
export let TOTAL_REVENUE_GOAL = 0
let CLIENTS_BY_KEY: Record<string, Client> = {}
let CLIENTS_BY_ID: Record<string, Client> = {}

function rebuildClientMaps(clients: Client[]) {
  for (const k of Object.keys(CLIENT_CONFIG)) delete CLIENT_CONFIG[k]
  CLIENT_ORDER.length = 0
  TOTAL_REVENUE_GOAL = 0
  CLIENTS_BY_KEY = {}
  CLIENTS_BY_ID = {}
  for (const c of clients) {
    CLIENT_CONFIG[c.key] = {
      label: c.label,
      color: c.color,
      revenue: c.revenue,
      scriptTarget: c.script_target,
      editTarget: c.edit_target,
    }
    CLIENT_ORDER.push(c.key)
    TOTAL_REVENUE_GOAL += c.revenue
    CLIENTS_BY_KEY[c.key] = c
    CLIENTS_BY_ID[c.id] = c
  }
}

export function getClientIdByKey(key: string | null | undefined): string | null {
  if (!key) return null
  return CLIENTS_BY_KEY[key]?.id ?? null
}
export function getClientKeyById(id: string | null | undefined): string | undefined {
  if (!id) return undefined
  return CLIENTS_BY_ID[id]?.key
}

/* ── Store ── */
interface ClientStore {
  clients: Client[]
  outputs: MonthlyOutput[]
  fieldTrips: FieldTrip[]
  deadlines: Deadline[]
  yearMonth: string
  loaded: boolean

  loadAll: () => Promise<void>

  addClient: (init: { key: string; label: string; color: string; revenue: number; script_target: number; edit_target: number }) => Promise<Client | null>
  archiveClient: (id: string) => Promise<void>
  restoreClient: (id: string) => Promise<void>
  listArchivedClients: () => Promise<Client[]>

  adjustOutput: (
    client: ClientName,
    field: 'script_done' | 'edit_done' | 'threads_done',
    delta: number
  ) => Promise<void>
  setRevenueStatus: (client: ClientName, status: RevenueStatus) => Promise<void>
  resetMonthlyOutputs: () => Promise<void>

  addFieldTrip: (trip: Omit<FieldTrip, 'id'>) => Promise<void>
  deleteFieldTrip: (id: string) => Promise<void>

  addDeadline: (deadline: Omit<Deadline, 'id'>) => Promise<void>
  setDeadlineStatus: (id: string, status: TaskStatus) => Promise<void>
  deleteDeadline: (id: string) => Promise<void>
}

export const useClientStore = create<ClientStore>((set, get) => ({
  clients: [],
  outputs: [],
  fieldTrips: [],
  deadlines: [],
  yearMonth: getYearMonth(),
  loaded: false,

  loadAll: async () => {
    const supabase = createSupabase()
    const ym = getYearMonth()

    const [clientsRes, outputsRes, tripsRes, deadlinesRes] = await Promise.all([
      supabase.from('clients').select('*').eq('archived', false).order('sort_order'),
      supabase.from('monthly_outputs').select('*').eq('year_month', ym),
      supabase.from('field_trips').select('*').order('trip_date'),
      supabase.from('deadlines').select('*').order('due_date'),
    ])

    const clientList = (clientsRes.data ?? []) as Client[]
    rebuildClientMaps(clientList)

    const outputsUI: MonthlyOutput[] = clientList.map(c => {
      const db = outputsRes.data?.find(o => o.client_id === c.id)
      return db
        ? {
            id: db.id,
            year_month: db.year_month,
            client: c.key,
            script_done: db.script_done,
            script_target: db.script_target,
            edit_done: db.edit_done,
            edit_target: db.edit_target,
            threads_done: db.threads_done,
            revenue_status: db.revenue_status as RevenueStatus,
          }
        : {
            id: `__virtual_${c.id}`,
            year_month: ym,
            client: c.key,
            script_done: 0,
            script_target: c.script_target,
            edit_done: 0,
            edit_target: c.edit_target,
            threads_done: 0,
            revenue_status: 'pending',
          }
    })

    const tripsUI: FieldTrip[] = (tripsRes.data ?? []).map(t => ({
      id: t.id,
      trip_date: t.trip_date,
      client: getClientKeyById(t.client_id) ?? '',
      duration: (t.notes?.startsWith('[half]') ? 'half' : 'full') as 'full' | 'half',
      notes: t.notes?.replace(/^\[half\]\s*/, '') ?? '',
    }))

    const deadlinesUI: Deadline[] = (deadlinesRes.data ?? []).map(d => ({
      id: d.id,
      due_date: d.due_date,
      client: getClientKeyById(d.client_id) ?? '',
      deliverable: d.title,
      status: (d.status as TaskStatus) ?? 'not_started',
    }))

    set({
      clients: clientList,
      outputs: outputsUI,
      fieldTrips: tripsUI,
      deadlines: deadlinesUI,
      yearMonth: ym,
      loaded: true,
    })
  },

  addClient: async init => {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return null
    const { clients } = get()
    const nextOrder = (clients[clients.length - 1]?.sort_order ?? -1) + 1
    const { data, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        key: init.key,
        label: init.label,
        color: init.color,
        revenue: init.revenue,
        script_target: init.script_target,
        edit_target: init.edit_target,
        sort_order: nextOrder,
        archived: false,
      })
      .select()
      .single()
    if (error || !data) return null
    await get().loadAll()
    return data as Client
  },

  archiveClient: async id => {
    const supabase = createSupabase()
    await supabase.from('clients').update({ archived: true }).eq('id', id)
    await get().loadAll()
  },

  restoreClient: async id => {
    const supabase = createSupabase()
    await supabase.from('clients').update({ archived: false }).eq('id', id)
    await get().loadAll()
  },

  listArchivedClients: async () => {
    const supabase = createSupabase()
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('archived', true)
      .order('sort_order')
    return (data ?? []) as Client[]
  },

  adjustOutput: async (clientKey, field, delta) => {
    const { outputs, yearMonth } = get()
    const idx = outputs.findIndex(o => o.client === clientKey)
    if (idx < 0) return
    const current = outputs[idx]
    const nextVal = Math.max(0, current[field] + delta)
    const updated = { ...current, [field]: nextVal }
    const nextArr = [...outputs]
    nextArr[idx] = updated
    set({ outputs: nextArr }) // optimistic

    const client = CLIENTS_BY_KEY[clientKey]
    if (!client) return
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      year_month: yearMonth,
      client_id: client.id,
      script_done: updated.script_done,
      edit_done: updated.edit_done,
      threads_done: updated.threads_done,
      script_target: updated.script_target,
      edit_target: updated.edit_target,
      revenue_status: updated.revenue_status,
    }
    const { data, error } = await supabase
      .from('monthly_outputs')
      .upsert(payload, { onConflict: 'user_id,year_month,client_id' })
      .select()
      .single()
    if (!error && data) {
      const final = [...get().outputs]
      const i = final.findIndex(o => o.client === clientKey)
      if (i >= 0) final[i] = { ...final[i], id: data.id }
      set({ outputs: final })
    }
  },

  setRevenueStatus: async (clientKey, status) => {
    const { outputs, yearMonth } = get()
    const idx = outputs.findIndex(o => o.client === clientKey)
    if (idx < 0) return
    const updated = { ...outputs[idx], revenue_status: status }
    const nextArr = [...outputs]
    nextArr[idx] = updated
    set({ outputs: nextArr })

    const client = CLIENTS_BY_KEY[clientKey]
    if (!client) return
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return

    await supabase.from('monthly_outputs').upsert(
      {
        user_id: user.id,
        year_month: yearMonth,
        client_id: client.id,
        revenue_status: status,
        script_done: updated.script_done,
        edit_done: updated.edit_done,
        threads_done: updated.threads_done,
        script_target: updated.script_target,
        edit_target: updated.edit_target,
      },
      { onConflict: 'user_id,year_month,client_id' }
    )
  },

  resetMonthlyOutputs: async () => {
    const { clients, yearMonth } = get()
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return

    await supabase
      .from('monthly_outputs')
      .delete()
      .eq('user_id', user.id)
      .eq('year_month', yearMonth)

    const reset: MonthlyOutput[] = clients.map(c => ({
      id: `__virtual_${c.id}`,
      year_month: yearMonth,
      client: c.key,
      script_done: 0,
      script_target: c.script_target,
      edit_done: 0,
      edit_target: c.edit_target,
      threads_done: 0,
      revenue_status: 'pending',
    }))
    set({ outputs: reset })
  },

  addFieldTrip: async trip => {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return
    const client_id = getClientIdByKey(trip.client)
    const noteBody = trip.duration === 'half' ? `[half] ${trip.notes}` : trip.notes

    const { data, error } = await supabase
      .from('field_trips')
      .insert({
        user_id: user.id,
        trip_date: trip.trip_date,
        client_id,
        notes: noteBody,
      })
      .select()
      .single()
    if (error || !data) return

    const newTrip: FieldTrip = { ...trip, id: data.id }
    const updated = [...get().fieldTrips, newTrip].sort((a, b) =>
      a.trip_date.localeCompare(b.trip_date)
    )
    set({ fieldTrips: updated })
  },

  deleteFieldTrip: async id => {
    set({ fieldTrips: get().fieldTrips.filter(t => t.id !== id) })
    await createSupabase().from('field_trips').delete().eq('id', id)
  },

  addDeadline: async deadline => {
    const supabase = createSupabase()
    const user = await getSessionUser()
    if (!user) return
    const client_id = getClientIdByKey(deadline.client)

    const { data, error } = await supabase
      .from('deadlines')
      .insert({
        user_id: user.id,
        due_date: deadline.due_date,
        title: deadline.deliverable,
        client_id,
        status: deadline.status,
      })
      .select()
      .single()
    if (error || !data) return

    const newDl: Deadline = { ...deadline, id: data.id }
    set({ deadlines: [...get().deadlines, newDl] })
  },

  setDeadlineStatus: async (id, status) => {
    set({
      deadlines: get().deadlines.map(d => (d.id === id ? { ...d, status } : d)),
    })
    await createSupabase().from('deadlines').update({ status }).eq('id', id)
  },

  deleteDeadline: async id => {
    set({ deadlines: get().deadlines.filter(d => d.id !== id) })
    await createSupabase().from('deadlines').delete().eq('id', id)
  },
}))
