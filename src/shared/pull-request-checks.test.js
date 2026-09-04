import { describe, expect, it } from "bun:test"
import { extractActionsRunId } from "./pull-request-checks"

describe("GitHub Actions run id extraction", () => {
  it("extracts the run id from an actions job URL", () => {
    expect(extractActionsRunId("https://github.com/owner/repo/actions/runs/123456789/job/987654321")).toBe(
      "123456789",
    )
    expect(extractActionsRunId("https://github.com/owner/repo/actions/runs/1")).toBe("1")
  })

  it("returns null for non-Actions or missing URLs", () => {
    expect(extractActionsRunId("https://circleci.com/gh/owner/repo/42")).toBeNull()
    expect(extractActionsRunId(undefined)).toBeNull()
    expect(extractActionsRunId("")).toBeNull()
    expect(extractActionsRunId("https://github.com/owner/repo/pull/9")).toBeNull()
  })
})
