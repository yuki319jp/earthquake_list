export function InitialLoadingScreen() {
  return (
    <section class="loading-screen rounded-[32px] border-0 bg-white/95 px-6 py-12 backdrop-blur dark:bg-slate-800/95">
      <div class="loading-screen__inner">
        <div class="loading-screen__badge">
          <span class="loading-screen__pulse" aria-hidden="true" />
          <span>同期を開始しています</span>
        </div>
        <div class="loading-screen__meter" aria-hidden="true">
          <span class="loading-screen__meter-bar" />
        </div>
        <div class="space-y-3">
          <div class="loading-screen__skeleton h-5 w-40 rounded-full" />
          <div class="loading-screen__skeleton h-20 rounded-[24px]" />
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="loading-screen__skeleton h-32 rounded-[24px]" />
            <div class="loading-screen__skeleton h-32 rounded-[24px]" />
          </div>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          気象庁由来の最新データを取得して一覧を準備しています。
        </p>
      </div>
    </section>
  )
}
