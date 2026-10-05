# Refresh efficiency

New browser profiles poll healthy resource queries every 15 seconds. Remote agents and non-file Traefik providers still need polling because the local filesystem stream cannot observe them. This changes normal polling freshness from about five seconds to about fifteen seconds, plus request latency. Each outbound request keeps the existing URL and DNS validation and request deadline.

Existing profiles keep their saved interval, including the old automatically persisted five-second value. The application cannot distinguish that value from a deliberate preference, so it does not migrate it. Disabled polling stays disabled. A failed resource query makes one attempt, retains its last successful data and polls at the slower of the configured interval or 60 seconds. Failed queries do not retry on mount or focus. A successful recovery restores the normal interval. Network reconnection and explicit config changes can still trigger recovery.

Polling stops while the document is hidden. The local EventSource also closes, which stops its background reconnect attempts. On return, stale healthy resources refresh through TanStack Query's focus behavior. Local config queries refresh to reconcile filesystem events missed while disconnected. Failed resource queries keep their slower cadence.

Config mutations and local filesystem events use the same server-specific batch. A batch waits for 500 ms without another event, with a 1.5-second maximum delay during sustained changes. Local saves usually join the watcher event emitted after the watcher's 300 ms write stability check. The batch waits for any older in-flight snapshot, then fetches the changed state once. It does not cancel and restart requests for each file. Hidden batches only mark cached queries stale. Each browser tab owns its query cache and batch; tabs do not share requests.

## Measurements

These observations use production Next.js builds, real SQLite schemas, synthetic sessions and a local HTTP fixture. Each target returns 100 routers, 100 services and 100 middlewares. Remote requests pass through the real dashboard proxy and its outbound validation. Response bytes below are decoded JSON body bytes received by the browser, excluding headers, compression, SSE and static assets. They are not wire transfer measurements.

The baseline is commit `751ecce`. The new build includes shared queries, resource-map caching and request deadlines before this refresh change. Both foreground runs use Global Overview with a search that matches no rows. The requests still return all resources. This avoids table rendering costs obscuring the scheduling comparison. All measured tabs report `visible`. Fresh contexts have no saved polling interval and use the actual application defaults.

| Targets | Visible tabs | Baseline requests/min | New requests/min | Baseline body bytes/min | New body bytes/min |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | 1 | 33.00 | 12.00 | 474,973 | 172,723 |
| 5 | 1 | 166.99 | 60.00 | 2,406,446 | 863,617 |
| 10 | 1 | 348.97 | 119.99 | 5,020,411 | 1,727,234 |
| 10 | 4 | 1,223.90 | 479.98 | 17,621,875 | 6,908,935 |

The baseline window lasted 60.005 seconds. The new window lasted 60.003 seconds. Raw resource request counts were 33/167/349/1,224 before and 12/60/120/480 after. The scheduling model is 36 requests per target per minute before and 12 after. Actual counts include timer phase and browser work, so the model is not an observed benchmark. These reductions apply to new or unset profiles. Saved five-second profiles keep that interval.

Startup is separate. Single-tab startup fetched 3/15/30 resource responses for 1/5/10 targets in both builds, totaling 43,183/215,915/431,830 body bytes. Four-tab startup fetched 210 resource responses and 3,022,810 bytes before, compared with 120 responses and 1,727,320 bytes after. That startup window includes polling by earlier tabs while later tabs finish loading. Each tab also fetched the server list and local instance name once.

Actual hidden-tab checks use headed Chromium and raw Chrome DevTools Protocol, with `document.visibilityState === "hidden"` verified before each window. Playwright enables focus emulation in its primary session, so minimizing its windows did not produce real hidden pages. Separate emulated runs are not used as native visibility evidence. Both builds made zero resource requests and received zero resource body bytes for 1/5/10 hidden targets over 60-second windows. The same native check covers four hidden tabs with ten targets.

An initial run displayed every resource row, including 12,000 rows across four tabs. It observed 33/99/76/391 requests for the four scenarios and substantial rendering delays. That run did not record the exact window duration, so these counts are diagnostic observations only and are not used for per-minute rates.

A separate one-target failure window started after both builds showed an error. The fixture first returned successful results, then HTTP 503 responses. Over 60.001 seconds, the baseline made 60 resource attempts and the new build made 3. Both kept the previous count of 100 resources of each type visible. The failed-server screenshot records the new build's cached count and error badge. This failure run counts attempts; it does not measure response bytes.

## Config changes

The event benchmark opens Dashboard, Global Overview and a config editor in three visible tabs. It temporarily sets polling to ten minutes to isolate mutation and filesystem refreshes. A save and a ten-file burst run against the real config routes and watcher. Request counts include cancelled attempts and exclude startup. Save totals include the write POST.

| Event | Original baseline | Shared-query build before batching | Batched build |
| --- | ---: | ---: | ---: |
| Save | 9 | 12 | 10 |
| Ten-file burst | 60 | 90 | 9 |

The original Global Overview used separate query keys and ignored local filesystem invalidation. The shared-query build adds its three refreshes per file, which explains the higher correct baseline. Before batching, a save fetched the config list and open file twice, once for the mutation and once for its watcher event. After batching, each active query refreshes once per tab. The final ten filenames appeared in the cached file list, and Global Overview changed from 100 to 101 resources of each type after the burst.

Focused observer tests cover save/watcher coalescing, a sustained burst's maximum delay, a file change during an existing request, hidden invalidation followed by focus and preservation of cached data after failure. The production browser check captures desktop and mobile screenshots of the final state. Temporary benchmark scripts and raw observations live in `/tmp/traefikui-refresh-measurements/` during verification.
