export function getTodayString(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

export function getYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

export function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return `${month}.${day} ${days[d.getDay()]}`
}

export function getDayOfMonth(): number {
  return new Date().getDate()
}

export function getDaysLeftInMonth(): number {
  const d = new Date()
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return lastDay - d.getDate()
}

export function getDateSeed(): number {
  const s = getTodayString().replace(/-/g, '')
  return parseInt(s, 10)
}

export function getDaysStreak(logs: string[], _topic: string): number {
  return logs.length
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
