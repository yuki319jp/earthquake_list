import { For, Show } from 'solid-js'
import {
  ArrowUpDown,
  LayoutGrid,
  List,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-solid'
import {
  formatCoordinate,
  formatDateTime,
  formatDepth,
  formatMagnitude,
  formatScale,
  isSortOption,
  sortOptions,
  type Quake,
  type SortOption,
} from '../quake'

type ViewMode = 'list' | 'gallery'

type QuakeListSectionProps = {
  placeQuery: string
  onPlaceQueryChange: (value: string) => void
  datetimeQuery: string
  onDatetimeQueryChange: (value: string) => void
  sortBy: SortOption
  onSortByChange: (value: SortOption) => void
  onClearFilters: () => void
  matchingCount: number
  visibleQuakes: Quake[]
  viewMode: ViewMode
  onViewModeChange: (nextMode: ViewMode) => void
  viewAnimationPhase: 'a' | 'b'
  isViewTransitioning: boolean
  maxAnimatedQuakes: number
  onOpenModal: (quake: Quake) => void
}

type DetailItemProps = {
  label: string
  value: string
}

export function QuakeListSection(props: QuakeListSectionProps) {
  return (
    <div class="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside class="h-fit rounded-[28px] border-0 bg-white/95 p-5 backdrop-blur dark:bg-slate-800/95 lg:sticky lg:top-8">
        <div class="mb-5 flex items-center gap-2">
          <span class="rounded-full bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <SlidersHorizontal size={16} />
          </span>
          <div>
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">
              サイドバー
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              地名と日時で絞り込み
            </p>
          </div>
        </div>

        <div class="space-y-5">
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              地名検索
            </span>
            <div class="relative">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                class="w-full rounded-xl bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-800 outline-none transition focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
                onInput={(event) =>
                  props.onPlaceQueryChange(event.currentTarget.value)
                }
                placeholder="例: 福島"
                type="search"
                value={props.placeQuery}
              />
              <Show when={props.placeQuery.length > 0}>
                <button
                  aria-label="地名検索をクリア"
                  class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  onClick={() => props.onPlaceQueryChange('')}
                  type="button"
                >
                  <X size={14} />
                </button>
              </Show>
            </div>
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              日時検索
            </span>
            <input
              class="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
              onInput={(event) =>
                props.onDatetimeQueryChange(event.currentTarget.value)
              }
              placeholder="2026-04-16 08:39"
              type="search"
              value={props.datetimeQuery}
            />
            <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
              発生時刻・発表時刻・ISO形式の文字列で検索できます。
            </p>
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              並び替え
            </span>
            <div class="relative">
              <ArrowUpDown
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <select
                class="w-full appearance-none rounded-xl bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
                onChange={(event) => {
                  const value = event.currentTarget.value

                  if (isSortOption(value)) {
                    props.onSortByChange(value)
                  }
                }}
                value={props.sortBy}
              >
                <For each={sortOptions}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </select>
            </div>
          </label>

          <button
            class="w-full rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={props.onClearFilters}
            type="button"
          >
            絞り込みをクリア
          </button>

          <div class="rounded-xl border-0 bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/90 dark:text-slate-400">
            表示と内部保持は最新100件まで。新しい地震は2分ごとに追加され、重複は自動で除外します。
          </div>
        </div>
      </aside>

      <section class="space-y-3">
        <div class="flex flex-col gap-3 rounded-[28px] border-0 bg-white/95 p-4 backdrop-blur dark:bg-slate-800/95 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-slate-600 dark:text-slate-300">
            合致件数: {props.matchingCount}件 / 最新100件まで表示
          </p>
          <div
            aria-label="表示モード切り替え"
            class="inline-flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
            role="group"
          >
            <button
              aria-pressed={props.viewMode === 'list'}
              class={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                props.viewMode === 'list'
                  ? 'bg-white text-slate-900 dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
              }`}
              onClick={() => props.onViewModeChange('list')}
              type="button"
            >
              <List size={16} />
              リスト
            </button>
            <button
              aria-pressed={props.viewMode === 'gallery'}
              class={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                props.viewMode === 'gallery'
                  ? 'bg-white text-slate-900 dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
              }`}
              onClick={() => props.onViewModeChange('gallery')}
              type="button"
            >
              <LayoutGrid size={16} />
              ギャラリー
            </button>
          </div>
        </div>

        <Show
          when={props.visibleQuakes.length > 0}
          fallback={
            <div class="rounded-[28px] border-0 bg-white/95 p-8 text-center text-sm text-slate-500 backdrop-blur dark:bg-slate-800/95 dark:text-slate-400">
              該当する地震情報はありません。
            </div>
          }
        >
          <div
            class="quake-results"
            data-animate={props.visibleQuakes.length <= props.maxAnimatedQuakes}
            data-animation-phase={props.viewAnimationPhase}
            data-mode={props.viewMode}
            data-transitioning={props.isViewTransitioning}
          >
            <For each={props.visibleQuakes}>
              {(quake, index) => (
                <article
                  class="quake-card rounded-[28px] border-0 bg-white/95 p-4 backdrop-blur dark:bg-slate-800/95"
                  style={{ '--quake-index': `${index()}` }}
                >
                  <div
                    class={`mb-2 gap-3 ${
                      props.viewMode === 'gallery'
                        ? 'flex flex-col'
                        : 'flex items-start justify-between'
                    }`}
                  >
                    <div class="flex items-start gap-2">
                      <MapPin
                        class="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400"
                        size={16}
                      />
                      <div>
                        <h3 class="text-base font-semibold text-slate-950 dark:text-slate-50">
                          {quake.place}
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">
                          発生 {formatDateTime(quake.earthquakeTime)} / 発表{' '}
                          {formatDateTime(quake.issueTime)}
                        </p>
                        <p class="text-xs text-slate-500 dark:text-slate-400">
                          発表元: {quake.publisher ?? '不明'}
                        </p>
                      </div>
                    </div>
                    <p
                      class={`quake-card__scale rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200 ${
                        props.viewMode === 'gallery' ? 'self-start' : ''
                      }`}
                    >
                      震度 {formatScale(quake.maxScale)}
                    </p>
                  </div>
                  <div
                    class={`grid gap-2 ${
                      props.viewMode === 'gallery'
                        ? 'grid-cols-1'
                        : 'sm:grid-cols-2'
                    }`}
                  >
                    <FactRow
                      label="マグニチュード"
                      value={formatMagnitude(quake.magnitude)}
                    />
                    <FactRow label="深さ" value={formatDepth(quake.depth)} />
                    <FactRow
                      label="緯度"
                      value={formatCoordinate(quake.latitude)}
                    />
                    <FactRow
                      label="経度"
                      value={formatCoordinate(quake.longitude)}
                    />
                  </div>
                  <div
                    class={`mt-4 flex ${
                      props.viewMode === 'gallery'
                        ? 'justify-start'
                        : 'justify-end'
                    }`}
                  >
                    <button
                      class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
                      onClick={() => props.onOpenModal(quake)}
                      type="button"
                    >
                      詳細を見る
                    </button>
                  </div>
                </article>
              )}
            </For>
          </div>
        </Show>
      </section>
    </div>
  )
}

function FactRow(props: DetailItemProps) {
  return (
    <div class="quake-card__fact-row flex items-center justify-between gap-3 rounded-xl border-0 bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/90">
      <span class="text-slate-500 dark:text-slate-400">{props.label}</span>
      <span class="text-right font-semibold text-slate-900 dark:text-slate-50">
        {props.value}
      </span>
    </div>
  )
}
