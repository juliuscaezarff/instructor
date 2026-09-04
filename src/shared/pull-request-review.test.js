import { describe, expect, it } from "bun:test"
import { MAX_REVIEW_BODY_CHARS } from "./pull-request-review"

describe("pull request review validation", () => {
  it("keeps a bounded, positive character limit", () => {
    expect(MAX_REVIEW_BODY_CHARS).toBeGreaterThan(0)
  })
})
