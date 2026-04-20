import { Show, createEffect, onCleanup, onMount } from 'solid-js'
import { X } from 'lucide-solid'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  formatCoordinate,
  formatDateTime,
  formatDepth,
  formatMagnitude,
  formatScale,
  formatTsunami,
  type Quake,
} from '../quake'

const MAP_DEFAULT_ZOOM = 7
const MAP_MIN_ZOOM = 3
const MAP_MAX_ZOOM = 13

type QuakeModalProps = {
  quake: Quake
  isVisible: boolean
  onClose: () => void
}

type DetailItemProps = {
  label: string
  value: string
}

type QuakeMapProps = {
  quake: Quake
}

export function QuakeModal(props: QuakeModalProps) {
  return (
    <div
      aria-modal="true"
      class={`fixed inset-0 z-50 flex items-center justify-center px-4 py-8 backdrop-blur-sm transition-[background-color,opacity] duration-200 ${
        props.isVisible
          ? 'bg-slate-950/70 opacity-100'
          : 'bg-slate-950/0 opacity-0'
      }`}
      onClick={props.onClose}
      role="dialog"
    >
      <div
        class={`w-full max-w-3xl rounded-3xl border-0 bg-white p-6 transition-[opacity,transform] duration-200 dark:bg-slate-800 ${
          props.isVisible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-4 scale-[0.98] opacity-0'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
              地震の詳細
            </p>
            <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {props.quake.place}
            </h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              ID: {props.quake.id}
            </p>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              発表元: {props.quake.publisher ?? '不明'}
            </p>
          </div>
          <button
            class="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            onClick={props.onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <DetailItem
            label="震度"
            value={`震度 ${formatScale(props.quake.maxScale)}`}
          />
          <DetailItem
            label="発生時刻"
            value={formatDateTime(props.quake.earthquakeTime)}
          />
          <DetailItem
            label="発表時刻"
            value={formatDateTime(props.quake.issueTime)}
          />
          <DetailItem
            label="津波"
            value={`${formatTsunami(props.quake.domesticTsunami)} / ${formatTsunami(props.quake.foreignTsunami)}`}
          />
        </div>

        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <DetailItem
            label="マグニチュード"
            value={formatMagnitude(props.quake.magnitude)}
          />
          <DetailItem label="深さ" value={formatDepth(props.quake.depth)} />
          <DetailItem
            label="緯度"
            value={formatCoordinate(props.quake.latitude)}
          />
          <DetailItem
            label="経度"
            value={formatCoordinate(props.quake.longitude)}
          />
        </div>

        <div class="mt-5">
          <QuakeMap quake={props.quake} />
        </div>

        <div class="mt-5 rounded-2xl border-0 bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
          <p>コード: {props.quake.code}</p>
          <p>地名検索・日時検索の対象: {props.quake.place}</p>
        </div>
      </div>
    </div>
  )
}

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
  )
}

function QuakeMap(props: QuakeMapProps) {
  let mapElement: HTMLDivElement | undefined
  let map: L.Map | undefined
  let marker: L.CircleMarker | undefined

  const hasCoordinates = () =>
    props.quake.latitude !== null && props.quake.longitude !== null

  const updateMapView = (): void => {
    if (
      map === undefined ||
      marker === undefined ||
      props.quake.latitude === null ||
      props.quake.longitude === null
    ) {
      return
    }

    const center: L.LatLngExpression = [
      props.quake.latitude,
      props.quake.longitude,
    ]

    map.setView(center, MAP_DEFAULT_ZOOM, {
      animate: false,
    })
    marker.setLatLng(center)
    marker.bindTooltip(props.quake.place, {
      direction: 'top',
      offset: [0, -10],
    })
  }

  onMount(() => {
    if (!hasCoordinates() || mapElement === undefined) {
      return
    }

    map = L.map(mapElement, {
      center: [props.quake.latitude!, props.quake.longitude!],
      zoom: MAP_DEFAULT_ZOOM,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      zoomControl: true,
      scrollWheelZoom: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    marker = L.circleMarker([props.quake.latitude!, props.quake.longitude!], {
      radius: 9,
      weight: 3,
      color: '#0f172a',
      fillColor: '#f97316',
      fillOpacity: 0.92,
    }).addTo(map)

    updateMapView()
    window.setTimeout(() => map?.invalidateSize(), 0)
  })

  createEffect(() => {
    if (!hasCoordinates()) {
      return
    }

    updateMapView()
    map?.invalidateSize()
  })

  onCleanup(() => {
    marker = undefined
    map?.remove()
    map = undefined
  })

  return (
    <div class="rounded-2xl border-0 bg-slate-50 p-4 dark:bg-slate-800/90">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            震源マップ
          </p>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            OpenStreetMap 上で震源位置を確認できます。
          </p>
        </div>
        <Show when={hasCoordinates()}>
          <a
            class="inline-flex shrink-0 items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
            href={`https://www.openstreetmap.org/?mlat=${props.quake.latitude}&mlon=${props.quake.longitude}#map=${MAP_DEFAULT_ZOOM}/${props.quake.latitude}/${props.quake.longitude}`}
            rel="noreferrer"
            target="_blank"
          >
            OpenStreetMapで開く
          </a>
        </Show>
      </div>

      <Show
        when={hasCoordinates()}
        fallback={
          <div class="rounded-xl bg-white px-4 py-6 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            緯度・経度が取得できないため、地図は表示できません。
          </div>
        }
      >
        <div
          aria-label={`${props.quake.place} の震源位置マップ`}
          class="quake-modal-map"
          ref={(element) => {
            mapElement = element
          }}
        />
      </Show>
    </div>
  )
}
