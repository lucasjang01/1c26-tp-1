**Performance Test Report**

Date: 2026-05-05

Summary: results extracted from `perf/results` JSON files (baseline / load / stress for `rates`, `exchange`, `mixed`). Key metrics: requests, request rate (rps), latency percentiles (p50, p95, p99) and failures/errors.

---

**1) Rates**

- Baseline (`rates-base-20260504T225234Z.json`): requests=390, rps=4, p50=2 ms, p95=80.6 ms, p99=113.3 ms, failures=0
- Load (`rates-load-.json`): requests=7260, rps=17, p50=2 ms, p95=25.8 ms, p99=67.4 ms, failures=0
- Stress (`rates-stress-20260504T225234Z.json`): requests=45900, rps=77, p50=3 ms, p95=122.7 ms, p99=179.5 ms, failures=0

Observation: `rates` scales well up to the tested stress levels (200 rps). Latencies remain low and no errors observed.

**Grafana panels to attach (suggested):**
- Scenarios launched (panel: "Scenarios launched") — screenshot_rates_scenarios.png
- Requests per second (panel: "Requests / sec") — screenshot_rates_rps.png
- Response time p95/p99 (panel: "Response time (p95/p99)") — screenshot_rates_latency.png

---

**2) Exchange**

- Baseline (`exchange-base.json`): requests=180, rps=1, p50=596 ms, p95=727.9 ms, p99=772.9 ms, failures=0
- Load (`exchange-load-20260504T225234Z.json`): requests=7260, rps=17, p50=620.3 ms, p95=757.6 ms, p99=820.7 ms, failures=0
- Stress (`exchange-stress-20260504T225234Z.json`): requests=46200, rps≈77, requests with 2xx=34545, failures(vusers.failed)=11601, errors: `ERR_SOCKET_TIMEOUT`=10467, `ECONNRESET`=1134, http.5xx=52; p95≈3905.8 ms, p99≈7407.5 ms

Observation: `exchange` has much higher latencies (baseline ~600 ms). Under stress it degrades heavily with many socket timeouts and connection resets — the service cannot keep up at the highest phases.

Suggested Grafana panels: attach these from the dashboard
- Response time p95/p99 for `exchange` (panel: "Response time - exchange") — screenshot_exchange_latency.png
- Errors / Socket timeouts (panel: "Errors - artillery-api / exchange") — screenshot_exchange_errors.png
- Container CPU / Memory (`exchange-api-1`) (panel: "Container CPU") — screenshot_exchange_cpu.png

---

**3) Mixed (combined traffic)**

- Baseline (`mixed-base.json`): requests=720, rps=4, overall p50=3 ms, p95=685.5 ms, p99=742.6 ms, failures=0
- Load (`mixed-load-.json`): requests=29040, rps=69, p50=49.9 ms, p95=837.3 ms, p99=1249.1 ms, failures=0
- Stress (`mixed-stress-.json`): requests=76751, rps≈77, http.codes.200=37393, vusers.failed=39321, errors: `ERR_SOCKET_TIMEOUT`=38920, `ECONNRESET`=401, http.5xx=97; overall p95≈7407.5 ms, p99≈8186.6 ms

Observation: under mixed stress the system suffers heavy timeouts and failures similar to `exchange` stress. The majority of errors are socket timeouts targeting the `rates` and `accounts` endpoints (see counters). Combined load amplifies contention (CPU, I/O, or internal delays).

Suggested Grafana panels:
- Mixed scenario: Requests / sec (panel: "Mixed - Requests / sec") — screenshot_mixed_rps.png
- Mixed response time heatmap or p95/p99 (panel: "Mixed - Response time") — screenshot_mixed_latency.png
- Errors breakdown by endpoint (panel: "Errors by endpoint") — screenshot_mixed_errors.png
- cAdvisor / host resources (panel: "Host CPU / Mem") — screenshot_host_resources.png

---

Key recommendations

- Investigate source of `ERR_SOCKET_TIMEOUT` and `ECONNRESET` during stress: check server timeouts, upstream blocking (external calls or DB), and nginx timeouts.
- Inspect `exchange-api` CPU and memory during stress (Grafana panels suggested above). If CPU is saturated, consider scaling replicas or increasing resources.
- Tune timeouts and connection limits in `nginx` and the app (keepalive, socket timeouts) to reduce connection churn under high load.
- Re-run targeted tests after incremental changes (increase resources, reduce simulated latency) and compare the p95/p99 values.

Files used to produce this report (in `perf/results`):
- exchange-base.json
- exchange-load-20260504T225234Z.json
- exchange-stress-20260504T225234Z.json
- rates-base-20260504T225234Z.json
- rates-load-.json
- rates-stress-20260504T225234Z.json
- mixed-base.json
- mixed-load-.json
- mixed-stress-.json

If you want, I can: embed the actual screenshots into this report (you can place them at `perf/screenshots/` using the suggested filenames above), or generate a PDF. ¿Agregar las imágenes al reporte ahora?
