import { Activity, MapPin, RefreshCw } from 'lucide-solid'
import { For, Show, createResource } from 'solid-js'

type Quake = {
  id: string
  place: string
  magnitude: number | null
  maxScale: number
  depth: number | null
  issueTime: string
  earthquakeTime: string
  domesticTsunami: string | null
  foreignTsunami: string | null
}

type QuakeResponse = {
  synced: {
    inserted: number
    totalFetched: number
  }
  data: Quake[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

const scaleLabels: Record<number, string> = {
  10: '1',
  20: '2',
  30: '3',
  40: '4',
  45: '5弱',
  50: '5強',
  55: '6弱',
  60: '6強',
  70: '7'
}

const formatScale = (scale: number): string => scaleLabels[scale] ?? String(scale)
const formatDepth = (depth: number | null): string => (depth === null ? '不明' : `${depth}km`)
const formatMagnitude = (magnitude: number | null): string => (magnitude === null ? '不明' : `M${magnitude.toFixed(1)}`)
const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString('ja-JP', {
    hour12: false,
    timeZone: 'Asia/Tokyo'
  })

const fetchQuakes = async (): Promise<QuakeResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/quakes`)

  if (!response.ok) {
    throw new Error(`地震情報の取得に失敗しました: ${response.status}`)
  }

  return (await response.json()) as QuakeResponse
}

function App() {
  const [quakes, { refetch }] = createResource(fetchQuakes)

  return (
    <main class="min-h-screen bg-slate-100 text-slate-800">
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <header class="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div class="mb-3 flex items-center gap-3">
            <span class="rounded-full bg-sky-100 p-2 text-sky-600">
              <Activity size={20} />
            </span>
            <div>
              <h1 class="text-2xl font-semibold">地震情報リスト</h1>
              <p class="text-sm text-slate-500">P2P地震情報API（最新25件）</p>
            </div>
          </div>
          <button
            class="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
            onClick={() => void refetch()}
            type="button"
          >
            <RefreshCw size={16} />
            更新
          </button>
        </header>

        <Show when={!quakes.loading} fallback={<p class="text-sm text-slate-500">読み込み中...</p>}>
          <Show when={!quakes.error} fallback={<p class="text-sm text-red-600">{quakes.error?.message}</p>}>
            <div class="space-y-3">
              <For each={quakes()?.data ?? []}>
                {(quake) => (
                  <article class="rounded-2xl bg-white p-4 shadow-sm">
                    <div class="mb-2 flex items-start justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <MapPin class="mt-0.5 text-slate-500" size={16} />
                        <h2 class="text-base font-semibold">{quake.place}</h2>
                      </div>
                      <p class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        震度 {formatScale(quake.maxScale)}
                      </p>
                    </div>
                    <div class="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                      <p>発生時刻: {formatDateTime(quake.earthquakeTime)}</p>
                      <p>発表時刻: {formatDateTime(quake.issueTime)}</p>
                      <p>マグニチュード: {formatMagnitude(quake.magnitude)}</p>
                      <p>深さ: {formatDepth(quake.depth)}</p>
                    </div>
                  </article>
                )}
              </For>
            </div>
            <p class="mt-4 text-xs text-slate-500">
              取得件数: {quakes()?.synced.totalFetched ?? 0} / 新規保存: {quakes()?.synced.inserted ?? 0}
            </p>
          </Show>
        </Show>
      </div>
    </main>
  )
}

export default App
