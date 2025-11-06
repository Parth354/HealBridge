import dayjs from 'dayjs'
export const toISODate = (d: Date|number|string) => dayjs(d).format('YYYY-MM-DD')
export const toTime = (d: Date|number|string) => dayjs(d).format('HH:mm')
export const isPast = (iso: string) => dayjs(iso).isBefore(dayjs())
export const addDaysISO = (iso: string, days: number) => dayjs(iso).add(days,'day').format('YYYY-MM-DD')
