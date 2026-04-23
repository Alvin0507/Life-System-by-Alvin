'use client'
import { useEffect, useState } from 'react'

interface Greeting {
  text: string
  mood: 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' | 'late'
}

function compute(): Greeting {
  const h = new Date().getHours()
  if (h >= 5 && h < 10)  return { text: '早安，新的一天開始了',        mood: 'morning'   }
  if (h >= 10 && h < 12) return { text: '上午時光 · 抓住最清醒的腦袋', mood: 'morning'   }
  if (h >= 12 && h < 14) return { text: '午間 · 吃飽了再戰',           mood: 'noon'      }
  if (h >= 14 && h < 17) return { text: '下午 · 別被睡意吃掉',         mood: 'afternoon' }
  if (h >= 17 && h < 20) return { text: '傍晚 · 最後衝刺的時段',       mood: 'evening'   }
  if (h >= 20 && h < 23) return { text: '夜深了 · 收個尾再睡',         mood: 'night'     }
  return { text: '深夜 · 明天的自己會謝謝你早點睡', mood: 'late' }
}

export function useGreeting(): Greeting {
  const [g, setG] = useState<Greeting>(() => compute())
  useEffect(() => {
    const id = setInterval(() => setG(compute()), 60_000)
    return () => clearInterval(id)
  }, [])
  return g
}
