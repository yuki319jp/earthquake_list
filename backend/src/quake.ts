export type JsonObject = Record<string, unknown>

export type QuakeInsertInput = {
  id: string
  code: number
  issueTime: string
  earthquakeTime: string
  place: string
  magnitude: number | null
  maxScale: number
  depth: number | null
  latitude: number | null
  longitude: number | null
  domesticTsunami: string | null
  foreignTsunami: string | null
  raw: JsonObject
}

export type QuakeRow = {
  id: string
  code: number
  issueTime: string
  earthquakeTime: string
  place: string
  magnitude: number | null
  maxScale: number
  depth: number | null
  latitude: number | null
  longitude: number | null
  domesticTsunami: string | null
  foreignTsunami: string | null
  publisher: string | null
}

export const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const getObject = (value: JsonObject, key: string): JsonObject => {
  const objectValue = value[key]
  if (!isObject(objectValue)) {
    throw new Error(`Expected object at key "${key}".`)
  }
  return objectValue
}

export const getString = (value: JsonObject, key: string): string => {
  const stringValue = value[key]
  if (typeof stringValue !== 'string') {
    throw new Error(`Expected string at key "${key}".`)
  }
  return stringValue
}

export const getNumber = (value: JsonObject, key: string): number => {
  const numberValue = value[key]
  if (typeof numberValue !== 'number' || Number.isNaN(numberValue)) {
    throw new Error(`Expected number at key "${key}".`)
  }
  return numberValue
}

export const parseP2PTime = (value: string): Date => {
  const normalized = value.replaceAll('/', '-').replace(' ', 'T') + '+09:00'
  const parsed = new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid P2P timestamp: "${value}".`)
  }

  return parsed
}

export const nullableNumber = (value: number): number | null => (value < 0 ? null : value)

export const parseQuake = (value: unknown): QuakeInsertInput => {
  if (!isObject(value)) {
    throw new Error('Expected quake data to be an object.')
  }

  const id = getString(value, 'id')
  const code = getNumber(value, 'code')
  const issue = getObject(value, 'issue')
  const earthquake = getObject(value, 'earthquake')
  const hypocenter = getObject(earthquake, 'hypocenter')

  return {
    id,
    code,
    issueTime: parseP2PTime(getString(issue, 'time')).toISOString(),
    earthquakeTime: parseP2PTime(getString(earthquake, 'time')).toISOString(),
    place: getString(hypocenter, 'name'),
    magnitude: nullableNumber(getNumber(hypocenter, 'magnitude')),
    maxScale: getNumber(earthquake, 'maxScale'),
    depth: nullableNumber(getNumber(hypocenter, 'depth')),
    latitude: nullableNumber(getNumber(hypocenter, 'latitude')),
    longitude: nullableNumber(getNumber(hypocenter, 'longitude')),
    domesticTsunami: typeof earthquake.domesticTsunami === 'string' ? earthquake.domesticTsunami : null,
    foreignTsunami: typeof earthquake.foreignTsunami === 'string' ? earthquake.foreignTsunami : null,
    raw: value
  }
}

export const extractPublisher = (raw: unknown): string | null => {
  if (!isObject(raw)) {
    return null
  }

  const issue = raw.issue
  if (!isObject(issue)) {
    return null
  }

  if (typeof issue.source === 'string') {
    return issue.source
  }

  if (isObject(issue.source) && typeof issue.source.name === 'string') {
    return issue.source.name
  }

  if (typeof issue.publisher === 'string') {
    return issue.publisher
  }

  if (typeof issue.sender === 'string') {
    return issue.sender
  }

  return null
}
