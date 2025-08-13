import type { PcbHole, PcbBoard, PcbCutout } from "circuit-json"

interface ClipResult {
  shouldClip: boolean
  clippedGeometry?: {
    shape: "circle" | "polygon"
    center?: { x: number; y: number }
    radius?: number
    points?: { x: number; y: number }[]
  }
}

/**
 * Clips holes that intersect with the board boundary
 * For holes on the board edge, converts them to cutouts with clipped geometry
 */
export function clipHolesOnBoardBoundary(
  db: any,
  boardId: string
): void {
  const board = db.pcb_board.get(boardId)
  if (!board) return

  const holes = db.pcb_hole.list()
  
  for (const hole of holes) {
    const clipResult = getHoleClipResult(hole, board)
    
    if (clipResult.shouldClip) {
      // Remove the original hole
      db.pcb_hole.delete(hole.pcb_hole_id)
      
      // Create a cutout with the clipped geometry (only if geometry exists)
      if (clipResult.clippedGeometry) {
        if (clipResult.clippedGeometry.shape === "circle") {
          db.pcb_cutout.insert({
            shape: "circle",
            center: clipResult.clippedGeometry.center!,
            radius: clipResult.clippedGeometry.radius!,
            subcircuit_id: hole.subcircuit_id,
            pcb_group_id: hole.pcb_group_id,
          })
        } else if (clipResult.clippedGeometry.shape === "polygon") {
          db.pcb_cutout.insert({
            shape: "polygon",
            points: clipResult.clippedGeometry.points!,
            subcircuit_id: hole.subcircuit_id,
            pcb_group_id: hole.pcb_group_id,
          })
        }
      }
    }
  }
}

/**
 * Determines if a hole should be clipped and calculates the clipped geometry
 */
function getHoleClipResult(hole: PcbHole, board: PcbBoard): ClipResult {
  // For now, only handle circular holes
  if (hole.hole_shape !== "circle") {
    return { shouldClip: false }
  }

  const radius = hole.hole_diameter / 2
  const holeCenter = { x: hole.x, y: hole.y }
  
  // Calculate board boundaries
  const boardBounds = getBoardBounds(board)
  
  // Check if hole is completely outside the board
  if (isCircleCompletelyOutside(holeCenter, radius, boardBounds)) {
    return { shouldClip: false } // Keep holes completely outside as-is
  }
  
  // Check if hole intersects with any board edge
  const intersectsEdge = doesCircleIntersectRectangleBoundary(
    holeCenter,
    radius,
    boardBounds
  )
  
  if (!intersectsEdge) {
    return { shouldClip: false }
  }
  
  // Calculate clipped geometry
  const clippedGeometry = clipCircleToRectangle(
    holeCenter,
    radius,
    boardBounds
  )
  
  return {
    shouldClip: true,
    clippedGeometry
  }
}

/**
 * Get board boundaries as a rectangle
 */
function getBoardBounds(board: PcbBoard): { 
  left: number
  right: number
  top: number
  bottom: number
} {
  const halfWidth = board.width / 2
  const halfHeight = board.height / 2
  
  return {
    left: board.center.x - halfWidth,
    right: board.center.x + halfWidth,
    top: board.center.y + halfHeight,
    bottom: board.center.y - halfHeight,
  }
}

/**
 * Check if a circle is completely outside the board boundaries
 */
function isCircleCompletelyOutside(
  center: { x: number; y: number },
  radius: number,
  bounds: { left: number; right: number; top: number; bottom: number }
): boolean {
  return (
    center.x + radius < bounds.left ||
    center.x - radius > bounds.right ||
    center.y + radius < bounds.bottom ||
    center.y - radius > bounds.top
  )
}

/**
 * Check if a circle intersects with the boundary (edges) of a rectangle
 * or is completely outside the rectangle
 */
function doesCircleIntersectRectangleBoundary(
  center: { x: number; y: number },
  radius: number,
  bounds: { left: number; right: number; top: number; bottom: number }
): boolean {
  // Check if circle is completely inside
  if (
    center.x - radius > bounds.left &&
    center.x + radius < bounds.right &&
    center.y - radius > bounds.bottom &&
    center.y + radius < bounds.top
  ) {
    return false // Completely inside, no intersection with boundary
  }
  
  return true // Either intersects with boundary or is outside (both need clipping)
}

/**
 * Clip a circle to a rectangle, returning polygon points for the clipped area
 */
function clipCircleToRectangle(
  center: { x: number; y: number },
  radius: number,
  bounds: { left: number; right: number; top: number; bottom: number }
): { shape: "polygon"; points: { x: number; y: number }[] } {
  const points: { x: number; y: number }[] = []
  
  // Generate circle points
  const numPoints = 32 // Number of points to approximate the circle
  for (let i = 0; i < numPoints; i++) {
    const angle = (i * 2 * Math.PI) / numPoints
    const x = center.x + radius * Math.cos(angle)
    const y = center.y + radius * Math.sin(angle)
    
    // Only include points that are inside the board bounds
    if (
      x >= bounds.left &&
      x <= bounds.right &&
      y >= bounds.bottom &&
      y <= bounds.top
    ) {
      points.push({ x, y })
    }
  }
  
  // Add intersection points with board edges
  addBoundaryIntersections(center, radius, bounds, points)
  
  // Sort points to form a proper polygon
  sortPointsClockwise(points, center)
  
  return { shape: "polygon", points }
}

/**
 * Add intersection points where the circle crosses board boundaries
 */
function addBoundaryIntersections(
  center: { x: number; y: number },
  radius: number,
  bounds: { left: number; right: number; top: number; bottom: number },
  points: { x: number; y: number }[]
): void {
  // Check intersection with each edge
  const edges = [
    { start: { x: bounds.left, y: bounds.bottom }, end: { x: bounds.right, y: bounds.bottom } }, // bottom
    { start: { x: bounds.right, y: bounds.bottom }, end: { x: bounds.right, y: bounds.top } }, // right
    { start: { x: bounds.right, y: bounds.top }, end: { x: bounds.left, y: bounds.top } }, // top
    { start: { x: bounds.left, y: bounds.top }, end: { x: bounds.left, y: bounds.bottom } }, // left
  ]
  
  for (const edge of edges) {
    const intersections = getLineCircleIntersections(edge.start, edge.end, center, radius)
    for (const intersection of intersections) {
      // Check if intersection point is actually on the edge segment
      if (isPointOnLineSegment(intersection, edge.start, edge.end)) {
        points.push(intersection)
      }
    }
  }
}

/**
 * Get intersection points between a line segment and a circle
 */
function getLineCircleIntersections(
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
  circleCenter: { x: number; y: number },
  radius: number
): { x: number; y: number }[] {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const fx = lineStart.x - circleCenter.x
  const fy = lineStart.y - circleCenter.y
  
  const a = dx * dx + dy * dy
  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - radius * radius
  
  const discriminant = b * b - 4 * a * c
  
  if (discriminant < 0) {
    return [] // No intersection
  }
  
  const sqrtDiscriminant = Math.sqrt(discriminant)
  const t1 = (-b - sqrtDiscriminant) / (2 * a)
  const t2 = (-b + sqrtDiscriminant) / (2 * a)
  
  const intersections: { x: number; y: number }[] = []
  
  if (t1 >= 0 && t1 <= 1) {
    intersections.push({
      x: lineStart.x + t1 * dx,
      y: lineStart.y + t1 * dy,
    })
  }
  
  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-10) {
    intersections.push({
      x: lineStart.x + t2 * dx,
      y: lineStart.y + t2 * dy,
    })
  }
  
  return intersections
}

/**
 * Check if a point lies on a line segment
 */
function isPointOnLineSegment(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): boolean {
  const epsilon = 1e-10
  
  // Check if point is collinear with the line
  const crossProduct = (point.y - lineStart.y) * (lineEnd.x - lineStart.x) - 
                      (point.x - lineStart.x) * (lineEnd.y - lineStart.y)
  
  if (Math.abs(crossProduct) > epsilon) {
    return false // Not collinear
  }
  
  // Check if point is within the segment bounds
  const dotProduct = (point.x - lineStart.x) * (lineEnd.x - lineStart.x) + 
                    (point.y - lineStart.y) * (lineEnd.y - lineStart.y)
  
  const squaredLength = (lineEnd.x - lineStart.x) * (lineEnd.x - lineStart.x) + 
                       (lineEnd.y - lineStart.y) * (lineEnd.y - lineStart.y)
  
  return dotProduct >= -epsilon && dotProduct <= squaredLength + epsilon
}

/**
 * Sort points in clockwise order around a center point
 */
function sortPointsClockwise(
  points: { x: number; y: number }[],
  center: { x: number; y: number }
): void {
  points.sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x)
    const angleB = Math.atan2(b.y - center.y, b.x - center.x)
    return angleA - angleB
  })
}
