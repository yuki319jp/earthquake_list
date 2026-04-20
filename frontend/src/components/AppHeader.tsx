import { Activity, Moon, RefreshCw, Sun } from 'lucide-solid'

type AppHeaderProps = {
  isRefreshing: boolean
  onRefresh: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  totalCount: number
  visibleCount: number
  matchingCount: number
  syncStatus: {
    inserted: number
    totalFetched: number
  }
}

export function AppHeader(props: AppHeaderProps) {
  return (
    <header class="mb-6 rounded-[28px] border-0 bg-white/95 p-5 backdrop-blur dark:bg-slate-800/95">
      <div class="mb-3 flex items-center gap-3">
        <span class="rounded-full bg-slate-900 p-2 text-white dark:bg-slate-100 dark:text-slate-900">
          <Activity size={20} />
        </span>
        <div>
          <h1 class="text-2xl font-semibold text-slate-950 dark:text-slate-50">
            地震情報リスト
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            モノトーンで整理した最新100件の地震情報
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
          disabled={props.isRefreshing}
          onClick={props.onRefresh}
          type="button"
        >
          <RefreshCw
            class={props.isRefreshing ? 'animate-spin' : ''}
            size={16}
          />
          {props.isRefreshing ? '更新中...' : '今すぐ更新'}
        </button>

        <button
          aria-label="Toggle theme"
          class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          onClick={props.onToggleTheme}
          type="button"
        >
          {props.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          保持: {props.totalCount}件 / 表示: {props.visibleCount}件 / 合致:{' '}
          {props.matchingCount}件
        </p>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          最新同期: 保存 {props.syncStatus.inserted}件 / 取得{' '}
          {props.syncStatus.totalFetched}件
        </p>
      </div>
    </header>
  )
}
