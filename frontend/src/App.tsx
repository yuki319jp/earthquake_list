import { Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { AppHeader } from './components/AppHeader'
import { InitialLoadingScreen } from './components/InitialLoadingScreen'
import { QuakeListSection } from './components/QuakeListSection'
import { QuakeModal } from './components/QuakeModal'
import {
  compareQuakes,
  matchesDatetimeQuery,
  mergeQuakes,
  normalizeText,
  type Quake,
  type SortOption,
} from './quake'

type QuakeResponse = {
  synced: {
    inserted: number
    totalFetched: number
  }
  data: Quake[]
}

type ViewMode = 'list' | 'gallery'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'
const MAX_VISIBLE_QUAKES = 100
const MAX_ANIMATED_QUAKES = 24
const AUTO_REFRESH_INTERVAL_MS = 120_000
const VIEW_TRANSITION_DURATION_MS = 220
const MODAL_TRANSITION_DURATION_MS = 220

const fetchQuakes = async (): Promise<QuakeResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/quakes`)

  if (!response.ok) {
    throw new Error(`地震情報を取得できませんでした: ${response.status}`)
  }

  return (await response.json()) as QuakeResponse
}

function App() {
  const [quakes, setQuakes] = createSignal<Quake[]>([])
  const [syncStatus, setSyncStatus] = createSignal<QuakeResponse['synced']>({
    inserted: 0,
    totalFetched: 0,
  })
  const [placeQuery, setPlaceQuery] = createSignal('')
  const [datetimeQuery, setDatetimeQuery] = createSignal('')
  const [sortBy, setSortBy] = createSignal<SortOption>('time-desc')
  const [isLoading, setIsLoading] = createSignal(true)
  const [isRefreshing, setIsRefreshing] = createSignal(false)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [theme, setTheme] = createSignal<'light' | 'dark'>('light')
  const [viewMode, setViewMode] = createSignal<ViewMode>('list')
  const [viewAnimationPhase, setViewAnimationPhase] = createSignal<'a' | 'b'>(
    'a',
  )
  const [isViewTransitioning, setIsViewTransitioning] = createSignal(false)
  const [modalQuake, setModalQuake] = createSignal<Quake | null>(null)
  const [isModalVisible, setIsModalVisible] = createSignal(false)
  let viewTransitionTimeoutId: number | undefined
  let modalTransitionTimeoutId: number | undefined
  let modalAnimationFrameId: number | undefined

  const refreshQuakes = async (): Promise<void> => {
    if (isRefreshing()) {
      return
    }

    const initialLoad = quakes().length === 0
    if (initialLoad) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      const response = await fetchQuakes()
      setQuakes((current) =>
        mergeQuakes(current, response.data, MAX_VISIBLE_QUAKES),
      )
      setSyncStatus(response.synced)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '地震情報を取得できませんでした。',
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const closeModal = (): void => {
    if (modalQuake() === null) {
      return
    }

    setIsModalVisible(false)
    modalTransitionTimeoutId = window.setTimeout(() => {
      setModalQuake(null)
      modalTransitionTimeoutId = undefined
    }, MODAL_TRANSITION_DURATION_MS)
  }

  createEffect(() => {
    const quake = modalQuake()

    if (quake === null) {
      return
    }

    setIsModalVisible(false)
    modalAnimationFrameId = window.requestAnimationFrame(() => {
      modalAnimationFrameId = window.requestAnimationFrame(() => {
        setIsModalVisible(true)
        modalAnimationFrameId = undefined
      })
    })

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown))
  })

  createEffect(() => {
    if (modalQuake() === null) {
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    onCleanup(() => {
      document.body.style.overflow = originalOverflow
    })
  })

  onMount(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved)
        document.documentElement.classList.toggle('dark', saved === 'dark')
      } else if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        setTheme('dark')
        document.documentElement.classList.add('dark')
      } else {
        setTheme('light')
        document.documentElement.classList.remove('dark')
      }
    } catch {
      // ignore
    }

    void refreshQuakes()

    const intervalId = window.setInterval(() => {
      void refreshQuakes()
    }, AUTO_REFRESH_INTERVAL_MS)

    onCleanup(() => {
      window.clearInterval(intervalId)
      if (viewTransitionTimeoutId !== undefined) {
        window.clearTimeout(viewTransitionTimeoutId)
      }
      if (modalTransitionTimeoutId !== undefined) {
        window.clearTimeout(modalTransitionTimeoutId)
      }
      if (modalAnimationFrameId !== undefined) {
        window.cancelAnimationFrame(modalAnimationFrameId)
      }
    })
  })

  const filteredQuakes = createMemo(() => {
    const place = normalizeText(placeQuery())
    const datetime = normalizeText(datetimeQuery())

    return quakes().filter((quake) => {
      const placeMatches =
        place.length === 0 || normalizeText(quake.place).includes(place)
      const datetimeMatches = matchesDatetimeQuery(quake, datetime)

      return placeMatches && datetimeMatches
    })
  })

  const sortedQuakes = createMemo(() =>
    [...filteredQuakes()].sort((left, right) =>
      compareQuakes(left, right, sortBy()),
    ),
  )
  const visibleQuakes = createMemo(() =>
    sortedQuakes().slice(0, MAX_VISIBLE_QUAKES),
  )
  const matchingCount = createMemo(() => filteredQuakes().length)

  const clearFilters = (): void => {
    setPlaceQuery('')
    setDatetimeQuery('')
    setSortBy('time-desc')
  }

  const openModal = (quake: Quake): void => {
    if (modalTransitionTimeoutId !== undefined) {
      window.clearTimeout(modalTransitionTimeoutId)
      modalTransitionTimeoutId = undefined
    }

    setModalQuake(quake)
  }

  const toggleTheme = (): void => {
    const next = theme() === 'dark' ? 'light' : 'dark'
    setTheme(next)

    try {
      localStorage.setItem('theme', next)
    } catch {
      // ignore
    }

    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  const handleViewModeChange = (nextMode: ViewMode): void => {
    if (viewMode() === nextMode) {
      return
    }

    if (viewTransitionTimeoutId !== undefined) {
      window.clearTimeout(viewTransitionTimeoutId)
    }

    setIsViewTransitioning(true)
    setViewMode(nextMode)
    setViewAnimationPhase((current) => (current === 'a' ? 'b' : 'a'))
    viewTransitionTimeoutId = window.setTimeout(() => {
      setIsViewTransitioning(false)
      viewTransitionTimeoutId = undefined
    }, VIEW_TRANSITION_DURATION_MS)
  }

  return (
    <main class="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <AppHeader
          isRefreshing={isRefreshing()}
          matchingCount={matchingCount()}
          onRefresh={() => void refreshQuakes()}
          onToggleTheme={toggleTheme}
          syncStatus={syncStatus()}
          theme={theme()}
          totalCount={quakes().length}
          visibleCount={visibleQuakes().length}
        />

        <Show when={errorMessage()}>
          {(message) => (
            <div class="mb-6 rounded-2xl border-0 bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {message()}
            </div>
          )}
        </Show>

        <Show
          when={!isLoading()}
          fallback={<InitialLoadingScreen />}
        >
          <QuakeListSection
            datetimeQuery={datetimeQuery()}
            isViewTransitioning={isViewTransitioning()}
            matchingCount={matchingCount()}
            maxAnimatedQuakes={MAX_ANIMATED_QUAKES}
            onClearFilters={clearFilters}
            onDatetimeQueryChange={setDatetimeQuery}
            onOpenModal={openModal}
            onPlaceQueryChange={setPlaceQuery}
            onSortByChange={setSortBy}
            onViewModeChange={handleViewModeChange}
            placeQuery={placeQuery()}
            sortBy={sortBy()}
            viewAnimationPhase={viewAnimationPhase()}
            viewMode={viewMode()}
            visibleQuakes={visibleQuakes()}
          />
        </Show>
      </div>

      <Show when={modalQuake()}>
        {(quake) => (
          <QuakeModal
            isVisible={isModalVisible()}
            onClose={closeModal}
            quake={quake()}
          />
        )}
      </Show>

      <footer class="mt-8">
        <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div class="text-center text-sm text-slate-500 dark:text-slate-400">
            © 2026 Earthquake List — Data: P2P Quake / JMA
          </div>
        </div>
      </footer>
    </main>
  )
}

export default App
