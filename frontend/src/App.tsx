import {
  Activity,
  ArrowUpDown,
  LayoutGrid,
  List,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  Sun,
  Moon,
} from "lucide-solid";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import {
  compareQuakes,
  formatCoordinate,
  formatDateTime,
  formatDepth,
  formatMagnitude,
  formatScale,
  formatTsunami,
  isSortOption,
  matchesDatetimeQuery,
  mergeQuakes,
  normalizeText,
  sortOptions,
  type Quake,
  type SortOption,
} from "./quake";

type QuakeResponse = {
  synced: {
    inserted: number;
    totalFetched: number;
  };
  data: Quake[];
};

type ViewMode = "list" | "gallery";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";
const MAX_VISIBLE_QUAKES = 100;
const MAX_ANIMATED_QUAKES = 24;
const AUTO_REFRESH_INTERVAL_MS = 120_000;
const VIEW_TRANSITION_DURATION_MS = 220;
const MODAL_TRANSITION_DURATION_MS = 220;

const fetchQuakes = async (): Promise<QuakeResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/quakes`);

  if (!response.ok) {
    throw new Error(`地震情報を取得できませんでした: ${response.status}`);
  }

  return (await response.json()) as QuakeResponse;
};

function App() {
  const [quakes, setQuakes] = createSignal<Quake[]>([]);
  const [syncStatus, setSyncStatus] = createSignal<QuakeResponse["synced"]>({
    inserted: 0,
    totalFetched: 0,
  });
  const [placeQuery, setPlaceQuery] = createSignal("");
  const [datetimeQuery, setDatetimeQuery] = createSignal("");
  const [sortBy, setSortBy] = createSignal<SortOption>("time-desc");
  const [isLoading, setIsLoading] = createSignal(true);
  const [isRefreshing, setIsRefreshing] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [theme, setTheme] = createSignal<"light" | "dark">("light");
  const [viewMode, setViewMode] = createSignal<ViewMode>("list");
  const [viewAnimationPhase, setViewAnimationPhase] = createSignal<"a" | "b">(
    "a",
  );
  const [isViewTransitioning, setIsViewTransitioning] = createSignal(false);
  const [modalQuake, setModalQuake] = createSignal<Quake | null>(null);
  const [isModalVisible, setIsModalVisible] = createSignal(false);
  let viewTransitionTimeoutId: number | undefined;
  let modalTransitionTimeoutId: number | undefined;
  let modalAnimationFrameId: number | undefined;

  const refreshQuakes = async (): Promise<void> => {
    if (isRefreshing()) {
      return;
    }

    const initialLoad = quakes().length === 0;
    if (initialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await fetchQuakes();
      setQuakes((current) =>
        mergeQuakes(current, response.data, MAX_VISIBLE_QUAKES),
      );
      setSyncStatus(response.synced);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "地震情報を取得できませんでした。",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  createEffect(() => {
    const quake = modalQuake();

    if (quake === null) {
      return;
    }

    setIsModalVisible(false);
    modalAnimationFrameId = window.requestAnimationFrame(() => {
      modalAnimationFrameId = window.requestAnimationFrame(() => {
        setIsModalVisible(true);
        modalAnimationFrameId = undefined;
      });
    });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  createEffect(() => {
    if (modalQuake() === null) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    onCleanup(() => {
      document.body.style.overflow = originalOverflow;
    });
  });

  onMount(() => {
    // Initialize theme from localStorage or prefers-color-scheme
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved as "dark" | "light");
        document.documentElement.classList.toggle("dark", saved === "dark");
      } else if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      } else {
        setTheme("light");
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // ignore
    }

    void refreshQuakes();

    const intervalId = window.setInterval(() => {
      void refreshQuakes();
    }, AUTO_REFRESH_INTERVAL_MS);

    onCleanup(() => {
      window.clearInterval(intervalId);
      if (viewTransitionTimeoutId !== undefined) {
        window.clearTimeout(viewTransitionTimeoutId);
      }
      if (modalTransitionTimeoutId !== undefined) {
        window.clearTimeout(modalTransitionTimeoutId);
      }
      if (modalAnimationFrameId !== undefined) {
        window.cancelAnimationFrame(modalAnimationFrameId);
      }
    });
  });

  const filteredQuakes = createMemo(() => {
    const place = normalizeText(placeQuery());
    const datetime = normalizeText(datetimeQuery());

    return quakes().filter((quake) => {
      const placeMatches =
        place.length === 0 || normalizeText(quake.place).includes(place);
      const datetimeMatches = matchesDatetimeQuery(quake, datetime);

      return placeMatches && datetimeMatches;
    });
  });

  const sortedQuakes = createMemo(() =>
    [...filteredQuakes()].sort((left, right) =>
      compareQuakes(left, right, sortBy()),
    ),
  );

  const visibleQuakes = createMemo(() =>
    sortedQuakes().slice(0, MAX_VISIBLE_QUAKES),
  );
  const matchingCount = createMemo(() => filteredQuakes().length);

  const clearFilters = (): void => {
    setPlaceQuery("");
    setDatetimeQuery("");
    setSortBy("time-desc");
  };

  const openModal = (quake: Quake): void => {
    if (modalTransitionTimeoutId !== undefined) {
      window.clearTimeout(modalTransitionTimeoutId);
      modalTransitionTimeoutId = undefined;
    }

    setModalQuake(quake);
  };

  const closeModal = (): void => {
    if (modalQuake() === null) {
      return;
    }

    setIsModalVisible(false);
    modalTransitionTimeoutId = window.setTimeout(() => {
      setModalQuake(null);
      modalTransitionTimeoutId = undefined;
    }, MODAL_TRANSITION_DURATION_MS);
  };

  const handleViewModeChange = (nextMode: ViewMode): void => {
    if (viewMode() === nextMode) {
      return;
    }

    if (viewTransitionTimeoutId !== undefined) {
      window.clearTimeout(viewTransitionTimeoutId);
    }

    setIsViewTransitioning(true);
    setViewMode(nextMode);
    setViewAnimationPhase((current) => (current === "a" ? "b" : "a"));
    viewTransitionTimeoutId = window.setTimeout(() => {
      setIsViewTransitioning(false);
      viewTransitionTimeoutId = undefined;
    }, VIEW_TRANSITION_DURATION_MS);
  };

  return (
    <main class="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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
              disabled={isRefreshing()}
              onClick={() => void refreshQuakes()}
              type="button"
            >
              <RefreshCw
                class={isRefreshing() ? "animate-spin" : ""}
                size={16}
              />
              {isRefreshing() ? "更新中..." : "今すぐ更新"}
            </button>

            <button
              class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              onClick={() => {
                const next = theme() === "dark" ? "light" : "dark";
                setTheme(next);
                try {
                  localStorage.setItem("theme", next);
                } catch {}
                document.documentElement.classList.toggle(
                  "dark",
                  next === "dark",
                );
              }}
              type="button"
              aria-label="Toggle theme"
            >
              {theme() === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              保持: {quakes().length}件 / 表示: {visibleQuakes().length}件 /
              合致: {matchingCount()}件
            </p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              最新同期: 保存 {syncStatus().inserted}件 / 取得{" "}
              {syncStatus().totalFetched}件
            </p>
          </div>
        </header>

        <Show when={errorMessage()}>
          {(message) => (
            <div class="mb-6 rounded-2xl border-0 bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {message()}
            </div>
          )}
        </Show>

        <Show when={isLoading()} fallback={<MainContent />}>
          <InitialLoadingScreen />
        </Show>
      </div>

      <Show when={modalQuake()}>
        {(quake) => (
          <div
            aria-modal="true"
            class={`fixed inset-0 z-50 flex items-center justify-center px-4 py-8 backdrop-blur-sm transition-[background-color,opacity] duration-200 ${
              isModalVisible()
                ? "bg-slate-950/70 opacity-100"
                : "bg-slate-950/0 opacity-0"
            }`}
            onClick={closeModal}
            role="dialog"
          >
            <div
                class={`w-full max-w-3xl rounded-3xl border-0 bg-white p-6 transition-[opacity,transform] duration-200 dark:bg-slate-800 ${
                isModalVisible()
                  ? "translate-y-0 scale-100 opacity-100"
                  : "translate-y-4 scale-[0.98] opacity-0"
              }`}
              onClick={(event) => event.stopPropagation()}
            >
              <div class="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
                    地震の詳細
                  </p>
                  <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    {quake().place}
                  </h2>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    ID: {quake().id}
                  </p>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    発表元: {quake().publisher ?? "不明"}
                  </p>
                </div>
                <button
                  class="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  onClick={closeModal}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="震度"
                  value={`震度 ${formatScale(quake().maxScale)}`}
                />
                <DetailItem
                  label="発生時刻"
                  value={formatDateTime(quake().earthquakeTime)}
                />
                <DetailItem
                  label="発表時刻"
                  value={formatDateTime(quake().issueTime)}
                />
                <DetailItem
                  label="津波"
                  value={`${formatTsunami(quake().domesticTsunami)} / ${formatTsunami(quake().foreignTsunami)}`}
                />
              </div>

              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="マグニチュード"
                  value={formatMagnitude(quake().magnitude)}
                />
                <DetailItem label="深さ" value={formatDepth(quake().depth)} />
                <DetailItem
                  label="緯度"
                  value={formatCoordinate(quake().latitude)}
                />
                <DetailItem
                  label="経度"
                  value={formatCoordinate(quake().longitude)}
                />
              </div>

              <div class="mt-5 rounded-2xl border-0 bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
                <p>コード: {quake().code}</p>
                <p>地名検索・日時検索の対象: {quake().place}</p>
              </div>
            </div>
          </div>
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
  );

  function MainContent() {
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
                  onInput={(event) => setPlaceQuery(event.currentTarget.value)}
                  placeholder="例: 福島"
                  type="search"
                  value={placeQuery()}
                />
                <Show when={placeQuery().length > 0}>
                  <button
                    aria-label="地名検索をクリア"
                    class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    onClick={() => setPlaceQuery("")}
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
                onInput={(event) => setDatetimeQuery(event.currentTarget.value)}
                placeholder="2026-04-16 08:39"
                type="search"
                value={datetimeQuery()}
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
                    const value = event.currentTarget.value;

                    if (isSortOption(value)) {
                      setSortBy(value);
                    }
                  }}
                  value={sortBy()}
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
              onClick={clearFilters}
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
              合致件数: {matchingCount()}件 / 最新100件まで表示
            </p>
            <div
              aria-label="表示モード切り替え"
              class="inline-flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
              role="group"
            >
              <button
                aria-pressed={viewMode() === "list"}
                class={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  viewMode() === "list"
                    ? "bg-white text-slate-900 dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                }`}
                onClick={() => handleViewModeChange("list")}
                type="button"
              >
                <List size={16} />
                リスト
              </button>
              <button
                aria-pressed={viewMode() === "gallery"}
                class={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  viewMode() === "gallery"
                    ? "bg-white text-slate-900 dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                }`}
                onClick={() => handleViewModeChange("gallery")}
                type="button"
              >
                <LayoutGrid size={16} />
                ギャラリー
              </button>
            </div>
          </div>

          <Show
            when={visibleQuakes().length > 0}
            fallback={
              <div class="rounded-[28px] border-0 bg-white/95 p-8 text-center text-sm text-slate-500 backdrop-blur dark:bg-slate-800/95 dark:text-slate-400">
                該当する地震情報はありません。
              </div>
            }
          >
            <div
              class="quake-results"
              data-animate={visibleQuakes().length <= MAX_ANIMATED_QUAKES}
              data-animation-phase={viewAnimationPhase()}
              data-mode={viewMode()}
              data-transitioning={isViewTransitioning()}
            >
              <For each={visibleQuakes()}>
                {(quake, index) => (
                  <article
                    class="quake-card rounded-[28px] border-0 bg-white/95 p-4 backdrop-blur dark:bg-slate-800/95"
                    style={{ "--quake-index": `${index()}` }}
                  >
                    <div
                      class={`mb-2 gap-3 ${
                        viewMode() === "gallery"
                          ? "flex flex-col"
                          : "flex items-start justify-between"
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
                            発生 {formatDateTime(quake.earthquakeTime)} / 発表{" "}
                            {formatDateTime(quake.issueTime)}
                          </p>
                          <p class="text-xs text-slate-500 dark:text-slate-400">
                            発表元: {quake.publisher ?? "不明"}
                          </p>
                        </div>
                      </div>
                      <p
                        class={`quake-card__scale rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200 ${
                          viewMode() === "gallery" ? "self-start" : ""
                        }`}
                      >
                        震度 {formatScale(quake.maxScale)}
                      </p>
                    </div>
                    <div
                      class={`grid gap-2 ${
                        viewMode() === "gallery"
                          ? "grid-cols-1"
                          : "sm:grid-cols-2"
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
                      class={`mt-4 flex ${viewMode() === "gallery" ? "justify-start" : "justify-end"}`}
                    >
                      <button
                        class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
                        onClick={() => openModal(quake)}
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
    );
  }
}

type DetailItemProps = {
  label: string;
  value: string;
};

function DetailItem(props: DetailItemProps) {
  return (
    <div class="rounded-2xl border-0 bg-slate-50 p-4 dark:bg-slate-800/90">
      <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {props.label}
      </p>
      <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
        {props.value}
      </p>
    </div>
  );
}

function FactRow(props: DetailItemProps) {
  return (
    <div class="quake-card__fact-row flex items-center justify-between gap-3 rounded-xl border-0 bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/90">
      <span class="text-slate-500 dark:text-slate-400">{props.label}</span>
      <span class="text-right font-semibold text-slate-900 dark:text-slate-50">
        {props.value}
      </span>
    </div>
  );
}

function InitialLoadingScreen() {
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
  );
}

export default App;
