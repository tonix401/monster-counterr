import { DetectCache, detectWalls } from './detectWalls'
import type { DetectParams, WallSegment } from './types'

/** Holds one map's grayscale pixels, so finding walls does not need the picture again. */
export class Analyzer {
  private gray: Float32Array = new Float32Array(0)
  private W = 0
  private H = 0
  private cache = new DetectCache()

  load(gray: Float32Array, W: number, H: number): void {
    this.gray = gray
    this.W = W
    this.H = H
    this.cache = new DetectCache()
  }

  /** Walls found in the picture */
  detect(params: DetectParams): WallSegment[] {
    return detectWalls(this.gray, this.W, this.H, params, this.cache)
  }
}
