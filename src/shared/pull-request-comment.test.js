import { describe, expect, it } from "bun:test"
import { isCommentBodyEmpty, MAX_COMMENT_BODY_CHARS } from "./pull-request-comment"

describe("pull request comment validation", () => {
  it("treats whitespace-only text as empty", () => {
    expect(isCommentBodyEmpty("")).toBe(true)
    expect(isCommentBodyEmpty("   \n\t")).toBe(true)
    expect(isCommentBodyEmpty("Looks good")).toBe(false)
  })

  it("keeps a bounded, positive character limit", () => {
    expect(MAX_COMMENT_BODY_CHARS).toBeGreaterThan(0)
  })
})
