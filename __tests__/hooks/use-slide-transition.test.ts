import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useSlideTransition } from "@/hooks/use-slide-transition"

// Mock motion/react's useReducedMotion
vi.mock("motion/react", () => ({
  useReducedMotion: vi.fn(),
}))

import { useReducedMotion } from "motion/react"

const mockUseReducedMotion = vi.mocked(useReducedMotion)

describe("useSlideTransition", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("when user prefers reduced motion", () => {
    beforeEach(() => {
      mockUseReducedMotion.mockReturnValue(true)
    })

    it("should return zero duration transition", () => {
      const { result } = renderHook(() => useSlideTransition())

      expect(result.current).toEqual({ duration: 0 })
    })

    it("should not include ease property", () => {
      const { result } = renderHook(() => useSlideTransition())

      expect(result.current).not.toHaveProperty("ease")
    })
  })

  describe("when user does not prefer reduced motion", () => {
    beforeEach(() => {
      mockUseReducedMotion.mockReturnValue(false)
    })

    it("should return animated transition with 0.3s duration", () => {
      const { result } = renderHook(() => useSlideTransition())

      expect(result.current.duration).toBe(0.3)
    })

    it("should include custom ease curve", () => {
      const { result } = renderHook(() => useSlideTransition())

      expect(result.current.ease).toEqual([0.16, 1, 0.3, 1])
    })

    it("should return consistent values across renders", () => {
      const { result, rerender } = renderHook(() => useSlideTransition())

      const firstResult = result.current
      rerender()
      const secondResult = result.current

      expect(firstResult).toEqual(secondResult)
    })
  })

  describe("when reduced motion preference is null/undefined", () => {
    beforeEach(() => {
      mockUseReducedMotion.mockReturnValue(null as unknown as boolean)
    })

    it("should return animated transition (falsy = no preference)", () => {
      const { result } = renderHook(() => useSlideTransition())

      expect(result.current.duration).toBe(0.3)
      expect(result.current.ease).toEqual([0.16, 1, 0.3, 1])
    })
  })

  describe("accessibility compliance", () => {
    it("should respect prefers-reduced-motion media query", () => {
      // When reduced motion is preferred
      mockUseReducedMotion.mockReturnValue(true)
      const { result: reducedResult } = renderHook(() => useSlideTransition())

      // When reduced motion is not preferred
      mockUseReducedMotion.mockReturnValue(false)
      const { result: normalResult } = renderHook(() => useSlideTransition())

      // Reduced motion should have instant transition
      expect(reducedResult.current.duration).toBe(0)

      // Normal should have animated transition
      expect(normalResult.current.duration).toBeGreaterThan(0)
    })
  })
})
