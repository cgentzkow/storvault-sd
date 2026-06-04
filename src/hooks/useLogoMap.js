import { useState, useEffect } from 'react'

const CACHE_KEY = 'sv_logo_map_v2'

function loadCache() {
  try { return new Map(Object.entries(JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'))) }
  catch { return new Map() }
}
function saveCache(map) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(map))) } catch {}
}

// Shared cache across hook instances (both MapView and PropertyList share the same data)
let sharedMap = loadCache()
const listeners = new Set()
function notify() { listeners.forEach(fn => fn(new Map(sharedMap))) }

let queue = []
let processing = false

async function processQueue() {
  if (processing) return
  processing = true
  while (queue.length > 0) {
    const batch = queue.splice(0, 4)
    await Promise.all(batch.map(async name => {
      try {
        const r = await fetch(`https://logos.gentz.co/logo/by-name/${encodeURIComponent(name)}`, { method: 'HEAD' })
        sharedMap.set(name, r.ok)
      } catch { sharedMap.set(name, false) }
    }))
    saveCache(sharedMap)
    notify()
    if (queue.length > 0) await new Promise(r => setTimeout(r, 250))
  }
  processing = false
}

export function queueNames(names) {
  const toCheck = names.filter(n => n && !sharedMap.has(n))
  if (!toCheck.length) return
  toCheck.forEach(n => sharedMap.set(n, null)) // mark as in-progress
  queue.push(...toCheck)
  processQueue()
}

export function useLogoMap(names) {
  const [logoMap, setLogoMap] = useState(() => new Map(sharedMap))
  useEffect(() => {
    const fn = (m) => setLogoMap(m)
    listeners.add(fn)
    queueNames(names)
    return () => listeners.delete(fn)
  }, [names.join('|').slice(0, 500)]) // stable dep
  return logoMap
}
