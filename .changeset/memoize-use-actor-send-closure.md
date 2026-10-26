---
"@rbxts/xstate-react": patch
---

Fix `useActor` returning a fresh `send` closure on every render. The hook now memoizes the send
closure on `[actorRef]` (the same `useCallback` idiom its `getSnapshot`/`subscribe` already use),
so effects keyed on `[send, ...]` no longer tear down and re-fire on every snapshot-triggered
re-render. `useMachine` is fixed transitively (it delegates to `useActor`).
