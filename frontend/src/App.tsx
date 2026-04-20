import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { AppHeader } from './components/AppHeader'
import { InitialLoadingScreen } from './components/InitialLoadingScreen'
import { QuakeListSection } from './components/QuakeListSection'
import { QuakeModal } from './components/QuakeModal'
import {
  compareQuakes,
  initialSearchFilters,
  mergeQuakes,
  type Quake,
  type SearchFilters,
  type SortOption,
} from './quake'

type QuakeResponse = {
  synced: {
    inserted: number
    totalFetched: number
  }
  data: Quake[]
  total: number
  hasMore: boolean
  limit: number
  offset: number
}

type ViewMode = 'list' | 'gallery'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'
const PAGE_SIZE = 100
const MAX_ANIMATED_QUAKES = 24
const AUTO_REFRESH_INTERVAL_MS = 120_000
const SEARCH_DEBOUNCE_MS = 250
const VIEW_TRANSITION_DURATION_MS = 220
const MODAL_TRANSITION_DURATION_MS = 220

const buildSearchParams = (
  filters: SearchFilters,
  sortBy: SortOption,
  offset: number,
  sync: boolean,
): URLSearchParams => {
  const params = new URLSearchParams()

  if (filters.place.trim().length > 0) {
    params.set('place', filters.place.trim())
  }

  if (filters.datetime.trim().length > 0) {
    params.set('datetime', filters.datetime.trim())
  }

  const numericEntries = [
    ['minMagnitude', filters.minMagnitude],
    ['maxMagnitude', filters.maxMagnitude],
    ['minDepth', filters.minDepth],
    ['maxDepth', filters.maxDepth],
    ['minScale', filters.minScale],
    ['maxScale', filters.maxScale],
  ] as const

  for (const [key, value] of numericEntries) {
    if (value.trim().length > 0) {
      params.set(key, value.trim())
    }
  }

  if (filters.tsunamiOnly) {
    params.set('tsunamiOnly', 'true')
  }

  params.set('sortBy', sortBy)
  params.set('limit', String(PAGE_SIZE))
  params.set('offset', String(offset))
  params.set('sync', sync ? 'true' : 'false')

  return params
}

const fetchQuakes = async (
  filters: SearchFilters,
  sortBy: SortOption,
  offset: number,
  sync: boolean,
): Promise<QuakeResponse> => {
  const searchParams = buildSearchParams(filters, sortBy, offset, sync)
  const response = await fetch(`${API_BASE_URL}/api/quakes?${searchParams.toString()}`)

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
  const [filters, setFilters] = createSignal<SearchFilters>(initialSearchFilters())
  const [sortBy, setSortBy] = createSignal<SortOption>('time-desc')
  const [totalCount, setTotalCount] = createSignal(0)
  const [hasMore, setHasMore] = createSignal(false)
  const [isLoading, setIsLoading] = createSignal(true)
  const [isRefreshing, setIsRefreshing] = createSignal(false)
  const [isLoadingMore, setIsLoadingMore] = createSignal(false)
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
  let latestRequestId = 0
  let shouldSkipNextSearch = true

  const applyResponse = (response: QuakeResponse, mode: 'replace' | 'append'): void => {
    setQuakes((current) =>
      mode === 'append'
        ? mergeQuakes(current, response.data, Number.POSITIVE_INFINITY, sortBy())
        : [...response.data].sort((left, right) => compareQuakes(left, right, sortBy())),
    )
    setSyncStatus(response.synced)
    setTotalCount(response.total)
    setHasMore(response.hasMore)
    setErrorMessage(null)
  }

  const loadQuakes = async (
    mode: 'replace' | 'append',
    options: { offset: number; sync: boolean },
  ): Promise<void> => {
    const requestId = ++latestRequestId

    try {
      const response = await fetchQuakes(
        filters(),
        sortBy(),
        options.offset,
        options.sync,
      )

      if (requestId !== latestRequestId) {
        return
      }

      applyResponse(response, mode)
    } catch (error) {
      if (requestId !== latestRequestId) {
        return
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : '地震情報を取得できませんでした。',
      )
    } finally {
      if (requestId === latestRequestId) {
        setIsLoading(false)
        setIsRefreshing(false)
        setIsLoadingMore(false)
      }
    }
  }

  const refreshQuakes = async (): Promise<void> => {
    if (isRefreshing() || isLoadingMore()) {
      return
    }

    const initialLoad = quakes().length === 0
    if (initialLoad) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    await loadQuakes('replace', { offset: 0, sync: true })
  }

  const loadMoreQuakes = async (): Promise<void> => {
    if (isLoading() || isRefreshing() || isLoadingMore() || !hasMore()) {
      return
    }

    setIsLoadingMore(true)
    await loadQuakes('append', { offset: quakes().length, sync: false })
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

  createEffect(() => {
    const currentFilters = filters()
    const currentSortBy = sortBy()

    if (isLoading()) {
      return
    }

    if (shouldSkipNextSearch) {
      shouldSkipNextSearch = false
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsRefreshing(true)
      void loadQuakes('replace', { offset: 0, sync: false })
    }, SEARCH_DEBOUNCE_MS)

    onCleanup(() => window.clearTimeout(timeoutId))
    void currentFilters
    void currentSortBy
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

  const clearFilters = (): void => {
    setFilters(initialSearchFilters())
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
          loadedCount={quakes().length}
          matchingCount={totalCount()}
          onRefresh={() => void refreshQuakes()}
          onToggleTheme={toggleTheme}
          syncStatus={syncStatus()}
          theme={theme()}
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
            filters={filters()}
            hasMore={hasMore()}
            isLoadingMore={isLoadingMore()}
            isViewTransitioning={isViewTransitioning()}
            loadedCount={quakes().length}
            matchingCount={totalCount()}
            maxAnimatedQuakes={MAX_ANIMATED_QUAKES}
            onClearFilters={clearFilters}
            onFiltersChange={setFilters}
            onLoadMore={() => void loadMoreQuakes()}
            onOpenModal={openModal}
            onSortByChange={setSortBy}
            onViewModeChange={handleViewModeChange}
            sortBy={sortBy()}
            viewAnimationPhase={viewAnimationPhase()}
            viewMode={viewMode()}
            visibleQuakes={quakes()}
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
