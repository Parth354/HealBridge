// packages/utils/src/geo.ts
export const metersToKm = (m?: number) => m==null ? '' : `${(m/1000).toFixed(1)} km`
