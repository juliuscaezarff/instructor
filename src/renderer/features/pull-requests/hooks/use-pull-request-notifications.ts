import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useRef } from "react"
import { desktopNotificationsEnabledAtom, notifyWhenFocusedAtom } from "../../../lib/atoms"
import { trpc } from "../../../lib/trpc"
import { isDesktopApp } from "../../../lib/utils/platform"
import { desktopViewAtom } from "../../agents/atoms"
import { useDesktopNotifications } from "../../agents/hooks/use-desktop-notifications"
import type { PullRequestListResult, PullRequestSummary } from "../../../../main/lib/git/github/pull-requests"
import { pullRequestPendingSelectionAtom } from "../atoms"
import {
  diffPullRequestNotificationEvents,
  snapshotPullRequests,
  type PullRequestNotificationEvent,
} from "../pull-request-notification-events"

const POLL_INTERVAL_MS = 180_000

const EVENT_COPY: Record<
  PullRequestNotificationEvent["type"],
  (item: PullRequestSummary) => { title: string; body: string }
> = {
  merged: (item) => ({ title: "Pull request merged", body: `#${item.number} ${item.title}` }),
  closed: (item) => ({ title: "Pull request closed", body: `#${item.number} ${item.title}` }),
  review: (item) => ({ title: "New review on your pull request", body: `#${item.number} ${item.title}` }),
  checks_failing: (item) => ({ title: "Checks failing", body: `#${item.number} ${item.title}` }),
}

/**
 * Polls the pull request list in the background (independent of which tab is
 * active) so merge/close/review/check-failure events can be detected and
 * surfaced as native notifications, without adding a persistent history.
 * Mount once at the layout level, not inside the Pull Requests view itself.
 */
export function usePullRequestNotifications() {
  const notificationsEnabled = useAtomValue(desktopNotificationsEnabledAtom)
  const notifyWhenFocused = useAtomValue(notifyWhenFocusedAtom)
  const desktopView = useAtomValue(desktopViewAtom)
  const setDesktopView = useSetAtom(desktopViewAtom)
  const setPendingSelection = useSetAtom(pullRequestPendingSelectionAtom)
  const { showNotification } = useDesktopNotifications()

  const enabled = isDesktopApp() && notificationsEnabled

  const currentUserQuery = trpc.pullRequests.currentUser.useQuery(undefined, {
    enabled,
    staleTime: 5 * 60_000,
  })

  const listQuery = trpc.pullRequests.list.useQuery(
    {},
    {
      enabled,
      refetchInterval: enabled ? POLL_INTERVAL_MS : false,
      refetchOnWindowFocus: false,
    },
  )

  const snapshotRef = useRef<Map<string, PullRequestSummary> | null>(null)
  const unseenCountRef = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const result = listQuery.data as PullRequestListResult | undefined
    if (!result || result.status === "unavailable" || result.status === "no_repositories") return

    const currentUserLogin = currentUserQuery.data?.login ?? null
    const events = diffPullRequestNotificationEvents(snapshotRef.current, result.items, currentUserLogin)
    snapshotRef.current = snapshotPullRequests(result.items)
    if (events.length === 0) return

    if (desktopView !== "pull-requests") {
      unseenCountRef.current += events.length
      window.desktopApi?.setBadge(unseenCountRef.current)
    }

    if (!notifyWhenFocused && document.hasFocus()) return

    for (const event of events) {
      const copy = EVENT_COPY[event.type](event.item)
      showNotification(copy.title, copy.body, {
        priority: event.type === "checks_failing" ? "error" : "complete",
        data: { owner: event.item.owner, repository: event.item.repository, number: event.item.number },
      })
    }
  }, [enabled, listQuery.data, currentUserQuery.data, desktopView, notifyWhenFocused, showNotification])

  useEffect(() => {
    if (desktopView === "pull-requests" && unseenCountRef.current > 0) {
      unseenCountRef.current = 0
      window.desktopApi?.setBadge(null)
    }
  }, [desktopView])

  useEffect(() => {
    if (!isDesktopApp()) return
    return window.desktopApi?.onNotificationClick((data) => {
      const owner = typeof data.owner === "string" ? data.owner : null
      const repository = typeof data.repository === "string" ? data.repository : null
      const number = typeof data.number === "number" ? data.number : null
      if (!owner || !repository || !number) return
      setDesktopView("pull-requests")
      setPendingSelection({ owner, repository, number })
    })
  }, [setDesktopView, setPendingSelection])
}
