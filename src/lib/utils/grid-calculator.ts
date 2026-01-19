import { GridPoint } from '@/lib/types'

/**
 * Calculate grid points centered around a location
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude  
 * @param gridSize - Grid size (3, 5, 7 etc.)
 * @param distanceKm - Distance between points in kilometers
 * @returns Array of GridPoint objects
 */
export function calculateGridPoints(
    centerLat: number,
    centerLng: number,
    gridSize: number,
    distanceKm: number
): GridPoint[] {
    const points: GridPoint[] = []
    const halfGrid = Math.floor(gridSize / 2)

    // Earth's approximate degrees per km
    const latDegreePerKm = 1 / 111.32
    const lngDegreePerKm = 1 / (111.32 * Math.cos(centerLat * Math.PI / 180))

    for (let row = -halfGrid; row <= halfGrid; row++) {
        for (let col = -halfGrid; col <= halfGrid; col++) {
            points.push({
                row,
                col,
                lat: centerLat + (row * distanceKm * latDegreePerKm),
                lng: centerLng + (col * distanceKm * lngDegreePerKm),
                enabled: true,
            })
        }
    }

    return points
}

/**
 * Generate grid points from a template (for custom selection)
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude
 * @param points - Array of {row, col, enabled} objects
 * @param distanceKm - Distance between points in kilometers
 * @returns Array of GridPoint objects with calculated lat/lng
 */
export function generateGridPointsFromTemplate(
    centerLat: number,
    centerLng: number,
    points: Array<{ row: number; col: number; enabled: boolean }>,
    distanceKm: number
): GridPoint[] {
    const latDegreePerKm = 1 / 111.32
    const lngDegreePerKm = 1 / (111.32 * Math.cos(centerLat * Math.PI / 180))

    return points.map(point => ({
        row: point.row,
        col: point.col,
        lat: centerLat + (point.row * distanceKm * latDegreePerKm),
        lng: centerLng + (point.col * distanceKm * lngDegreePerKm),
        enabled: point.enabled,
    }))
}

/**
 * Convert miles to kilometers
 */
export function milesToKm(miles: number): number {
    return miles * 1.60934
}

/**
 * Convert kilometers to miles
 */
export function kmToMiles(km: number): number {
    return km / 1.60934
}

/**
 * Get enabled points count
 */
export function getEnabledPointsCount(points: GridPoint[]): number {
    return points.filter(p => p.enabled).length
}
