# Informe de Resultados — Pruebas de Carga (arVault)

**Fecha:** 2026-05-05

Este informe resume los resultados obtenidos en las ejecuciones de `baseline`, `load` y `stress` para los escenarios `rates`, `exchange` y `mixed`. Cada workload model responde a una pregunta del `Plan de Pruebas`; a continuación se entregan las respuestas basadas en los JSON en `perf/results/` y recomendaciones.

---

## Metadatos y archivos consultados

- `perf/results/rates-base-20260504T225234Z.json`
- `perf/results/rates-load-.json`
- `perf/results/rates-stress-20260504T225234Z.json`
- `perf/results/exchange-base.json`
- `perf/results/exchange-load-20260504T225234Z.json`
- `perf/results/exchange-stress-20260504T225234Z.json`
- `perf/results/mixed-base.json`
- `perf/results/mixed-load-.json`
- `perf/results/mixed-stress-.json`

---

## Formato de las respuestas
Para cada escenario se listan los workload models y a la pregunta asociada se responde con las métricas clave: requests, rps (aprox.), p50, p95, p99 y número de fallos. Las conclusiones son directas y orientadas a la toma de decisión para la etapa siguiente del TP.

---

## 1) Escenario `rates` (GET /rates)

Pregunta (Baseline): ¿Cuál es el comportamiento del sistema bajo carga mínima?

- Resultado (baseline): requests=390, rps≈4, p50=2 ms, p95=80.6 ms, p99=113.3 ms, fallos=0.
- Respuesta: Bajo carga mínima el endpoint responde muy rápido (mediana 2 ms) y sin errores.

Pregunta (Load): ¿Cómo se comporta bajo carga esperada (ramp → 20 rps)?

- Resultado (load): requests=7260, rps≈17, p50=2 ms, p95=25.8 ms, p99=67.4 ms, fallos=0.
- Respuesta: A 17–20 rps sostenidos el servicio mantiene latencias muy bajas y sin errores — comportamiento estable.

Pregunta (Stress): ¿Cuál es la capacidad máxima antes de degradarse?

- Resultado (stress): requests=45900, rps≈77, p50=3 ms, p95=122.7 ms, p99=179.5 ms, fallos=0.
- Respuesta: `rates` escala bien hasta los niveles de stress probados (promedio ~77 rps en la ejecución). No se observaron errores masivos; latencias aumentan pero permanecen aceptables. Punto de ruptura para `rates` no fue alcanzado en estas pruebas (soporta 200 rps escalonados en la configuración probada sin errores).

Conclusión `rates`: Endpoint robusto y de baja latencia; no es el cuello de botella.

Paneles recomendados para evidencia: "Scenarios launched", "Requests / sec", "Response time (p95/p99)".

---

## 2) Escenario `exchange` (POST /exchange)

Pregunta (Baseline): ¿Cuál es el comportamiento del sistema bajo carga mínima?

- Resultado (baseline): requests=180, rps=1, p50≈596 ms, p95≈727.9 ms, p99≈772.9 ms, fallos=0.
- Respuesta: Incluso en baseline el endpoint tiene latencia alta (≈600 ms mediana) atribuible a la lógica de negocio simulada (mock `transfer()`).

Pregunta (Load): ¿Cómo se comporta bajo carga esperada (20 rps)?

- Resultado (load): requests=7260, rps≈17, p50≈620.3 ms, p95≈757.6 ms, p99≈820.7 ms, fallos=0.
- Respuesta: A 17–20 rps la mediana/percentiles se mantienen en el rango de cientos de ms; aunque en este experimento no se reportan fallos masivos, la cola y latencia se elevan notablemente comparado con `rates`.

Pregunta (Stress): ¿Cuál es la capacidad máxima antes de degradarse?

- Resultado (stress): requests=46200, rps≈77; vusers.failed=11601; errores principales: `ERR_SOCKET_TIMEOUT`≈10467, `ECONNRESET`≈1134, http.5xx≈52; p95≈3905.8 ms, p99≈7407.5 ms.
- Respuesta: Bajo stress el endpoint se degrada gravemente: aparecen timeouts y resets, con altas latencias (segundos). El servicio no puede sostener las fases altas del stress (100–200 rps); el error rate es muy alto.

Conclusión `exchange`: Es el cuello de botella. Su latencia base (~600 ms) combinada con la naturaleza síncrona produce colas y timeouts bajo carga elevada. Requiere optimizaciones (p. ej. reducir latencia del `transfer`, externalizar estado, añadir réplicas, o limitar tasa de entrada).

Paneles recomendados: "Response time - exchange" (p95/p99), "Errors - artillery-api / exchange", "Container CPU / Mem (exchange-api-1)".

---

## 3) Escenario `mixed` (mix 60% rates / 30% exchange / 5% accounts / 5% log)

Pregunta (Baseline): ¿Cuál es el comportamiento del sistema bajo carga mínima en un perfil realista?

- Resultado (baseline): requests=720, rps≈4, p50=3 ms, p95≈685.5 ms, p99≈742.6 ms, fallos=0.
- Respuesta: La mediana es baja (por predominio de `rates`) pero los percentiles altos reflejan el impacto de los exchanges (p95 ≈ 685 ms).

Pregunta (Load): ¿Cómo se comporta bajo carga esperada (ramp → 20 rps total)?

- Resultado (load): requests=29040, rps≈69 (total mixto), p50≈49.9 ms, p95≈837.3 ms, p99≈1249.1 ms, fallos=0.
- Respuesta: Con mezcla realista la latencia se eleva (p95 cercano a 0.8–1.2 s). No hay fallos masivos en la carga de prueba `load`, pero la degradación de experiencia es evidente.

Pregunta (Stress): ¿Cuál es la capacidad máxima antes de degradarse en tráfico mixto?

- Resultado (stress): requests=76751, rps≈77; http.codes.200≈37393, vusers.failed≈39321, errores `ERR_SOCKET_TIMEOUT`≈38920, `ECONNRESET`≈401, http.5xx≈97; p95≈7407.5 ms, p99≈8186.6 ms.
- Respuesta: En stress combinado el sistema falla de forma masiva (tiempos de respuesta en segundos y tasas de fallo muy altas). La combinación de operaciones rápidas y lentas agrava la congestión.

Conclusión `mixed`: El comportamiento es dominado por el `exchange` bajo carga. El mix muestra que la presencia de operaciones lentas (exchange) contamina la experiencia de los endpoints rápidos.

Paneles recomendados: "Mixed - Requests / sec", "Mixed - Response time (p95/p99)", "Errors by endpoint", "Host CPU/Mem".

---

## Recomendaciones generales (prioritizadas)

1. **Reducir latencia de `exchange` (alto impacto):** revisar la implementación de `transfer()` (actual mock 200–400 ms), usar operaciones asíncronas no bloqueantes y/o externalizar latencia (worker, cola, microservicio). Esto reduce la base de latencia y la cola acumulada.
2. **Escalado horizontal:** añadir réplicas del API y balancear (nginx) para repartir carga de requests concurrentes.
3. **Persistencia rápida (Redis):** mover `state.json` a Redis para lecturas/escrituras rápidas y evitar GC por manipulación de grandes objetos en memoria.
4. **Bounded queues y circuit breakers:** rechazar solicitudes cuando el sistema alcanza un umbral para evitar colas infinitas y cascade fail.
5. **Tuning de timeouts/keepalive en nginx y clientes:** reducir resets y reintentos innecesarios.
6. **Instrumentación adicional:** emitir métricas internas (counters de éxito/fallo por endpoint) para correlacionar con Artillery y cAdvisor.

---

## Próximos pasos sugeridos

1. Implementar una mejora pequeña (p. ej. Redis para balances) y re-ejecutar `load` para medir p95/p99.
2. Si mejora no suficiente, desplegar 2–3 réplicas del API y repetir `load` y `stress`.
3. Incluir screenshots en este informe (carpeta `perf/screenshots/`) para evidencia visual en el repositorio.

---

Si querés, incrusto las capturas dentro de este Markdown (colocalas en `perf/screenshots/` con los nombres sugeridos) y genero además un PDF listo para entrega. ¿Lo hago ahora?

