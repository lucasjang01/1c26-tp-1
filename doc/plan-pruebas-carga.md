# Plan de Pruebas de Carga y Medición — arVault

## Objetivo

Obtener un panorama cuantitativo y reproducible del comportamiento del servicio bajo distintos regímenes de carga. Las mediciones deben permitir:

1. Establecer un **baseline** del estado actual del sistema antes de aplicar cualquier mejora.
2. Identificar los **puntos de ruptura** (saturación, degradación, crash).
3. Proveer la **línea de comparación** contra la cual medir el impacto de las tácticas implementadas (Redis, réplicas, etc.).
4. Correlacionar métricas de cliente (Artillery) y de contenedor (cAdvisor) en el dashboard de Grafana.

---

## 1. Estado Actual de la Infraestructura de Carga y Métricas

### Lo que ya está armado

| Componente | Archivo / Ubicación | Estado |
|---|---|---|
| Artillery con plugin StatsD | `perf/rates.yaml`, `perf/package.json` | Funcional, solo cubre `GET /rates` |
| Script de ejecución | `perf/run-scenario.sh` | Wrapper para correr escenarios |
| StatsD + Graphite | `docker-compose.yml` (graphite), `statsd.config.json`, `graphite.storage-schemas.conf` | Corriendo, retención de 6 h @ 10 s |
| cAdvisor | `docker-compose.yml` (cadvisor) | Corriendo, envía a StatsD con prefijo `cadvisor` |
| Grafana dashboard | `perf/dashboard.json` | 4 paneles: RPS, códigos HTTP, latencia cliente, CPU/memoria |

### Lo que falta

- **Escenarios de carga para los endpoints críticos** (`POST /exchange`, `PUT /rates`, carga mixta). El único escenario actual es `GET /rates`, que no ejercita la lógica de negocio real.
- **Instrumentación de la aplicación**: la app no emite ninguna métrica propia a StatsD.
- **Endpoint de healthcheck** (`/health`), necesario para healthcheck de Docker y para correlacionar disponibilidad con métricas.
- **Panel de Grafana con métricas de negocio y percentiles p95/p99** (el panel actual solo muestra mediana y máximo).
- **Anotaciones de Grafana** marcando inicio/fin de cada escenario de prueba para correlación visual.

---

## 2. Workload Models (Modelos de Carga)

Basado en Artillery Workload Models y la distinción load vs stress testing de los artículos provistos, se proponen 5 modelos diferenciados. Cada uno responde a una pregunta distinta.

### 2.1 Baseline (Smoke / Low-Constant)

**Pregunta:** ¿Cuál es el comportamiento del sistema bajo carga mínima, sin estrés?

- **Duración:** 3 minutos.
- **Carga:** 1 req/s constante.
- **Propósito:** Medir latencia base, verificar que no hay errores en condiciones ideales. Usado como referencia para comparar con cargas mayores.

### 2.2 Load Test (Carga Normal Sostenida)

**Pregunta:** ¿Cómo se comporta el sistema bajo la carga esperada en producción?

- **Duración:** 10 minutos.
- **Carga:** Ramp 1→20 req/s en 2 min, constante 20 req/s durante 8 min.
- **Propósito:** Observar comportamiento estable bajo carga esperada. Los problemas deben manifestarse como latencia elevada o tasa de error creciente.

### 2.3 Stress Test (Buscar el Punto de Quiebre)

**Pregunta:** ¿Cuál es la capacidad máxima del sistema antes de degradarse?

- **Duración:** 15 minutos.
- **Carga:** Ramp 1→200 req/s escalonado (10, 25, 50, 100, 200 req/s, 3 min en cada escalón).
- **Propósito:** Identificar el knee point de la curva de latencia y el RPS al que aparecen los primeros errores. Exhibe la race condition de `exchange()`.

### 2.4 Spike Test

**Pregunta:** ¿Cómo responde el sistema a un pico repentino de tráfico?

- **Duración:** 5 minutos.
- **Carga:** 2 req/s durante 1 min → salto instantáneo a 100 req/s durante 30 s → vuelta a 2 req/s durante el resto.
- **Propósito:** Observar la recuperación tras saturación. Con una sola instancia y sin rate limiting, se espera que el spike sature el event loop y la latencia tarde en volver al baseline incluso después de que la carga disminuya.

### 2.5 Soak / Endurance Test (opcional)

**Pregunta:** ¿El sistema degrada con el tiempo bajo carga moderada?

- **Duración:** 20 minutos (suficiente para observar tendencia; el plan original decía 60 min).
- **Carga:** 10 req/s constante.
- **Propósito:** Observar si CPU o memoria crecen sostenidamente, lo que indicaría un leak. Con 20 min y el panel de Resources en Grafana la tendencia es visible sin esperar una hora.

---

## 3. Escenarios de Artillery a Implementar

Cada uno de los 5 workload models se ejecutará sobre cada uno de los siguientes escenarios para aislar el comportamiento por tipo de operación.

### 3.1 `perf/rates.yaml` (ya existe)

- **Target:** `GET /rates`
- **Característica:** Solo lectura, no ejercita persistencia ni transfers. Baseline del costo de un request sin lógica.

### 3.2 `perf/exchange.yaml` (nuevo)

- **Target:** `POST /exchange` con bodies variados (distintos pares de monedas y montos).
- **Característica:** Operación crítica. Expone race condition, latencia de 400–800 ms del mock `transfer()`, escritura eventual del log.
- **Payload:** rotación entre pares ARS/USD, USD/EUR, BRL/ARS con `baseAmount` aleatorio en un rango realista.

### 3.3 `perf/mixed.yaml` (nuevo)

- **Target:** Mix realista de endpoints con pesos:
  - 60% `GET /rates`
  - 30% `POST /exchange`
  - 5% `GET /accounts`
  - 5% `GET /log`
- **Característica:** Representa el perfil de tráfico real. Expone la falta de bulkhead: `GET /log` bloquea el event loop y degrada a los `POST /exchange`.

### 3.4 `perf/rates-write.yaml` (opcional)

- **Target:** `PUT /rates`
- **Característica:** Operación administrativa de baja frecuencia en producción. Útil para verificar que las escrituras en `rates.json` (cada 5 s) no bloquean lecturas.

---

## 4. Métricas a Capturar

### 4.1 Métricas de cliente (Artillery → StatsD, prefijo `artillery-api`)

Ya emitidas por el plugin. Usar en el dashboard actualizado:

- **`scenarioCounts.*`** — Rate de escenarios disparados.
- **`codes.*`** — Distribución de códigos HTTP (2xx, 4xx, 5xx).
- **`errors.*`** — Errores de red/timeout.
- **`pendingRequests`** — Backpressure del cliente.
- **`scenarioDuration.min/median/p95/p99/max`** — Latencias percibidas.
- **`requestTimer.*`** — Latencia por request HTTP individual.

**Falta agregar al dashboard:** p95 y p99 (actualmente solo median y max). El p95/p99 es el que el usuario real experimenta; la mediana esconde los problemas de cola larga.

### 4.2 Métricas de contenedor (cAdvisor → StatsD, prefijo `cadvisor`)

Ya emitidas y visibles en el panel "Resources" del dashboard:

- **CPU cumulative usage** (convertido a % mediante `derivative()` de Graphite).
- **Memory working set**.

Seleccionar el contenedor de interés con la variable `$container` del dashboard (opciones: `exchange-api-1`, `exchange-api-2`, `exchange-api-3`, `exchange-nginx-1`).

### 4.3 Métricas de aplicación (opcionales, no requeridas para el TP)

La app no emite métricas propias. Para el TP es suficiente con las métricas de Artillery (4.1) y cAdvisor (4.2). Si se quiere agregar instrumentación a futuro, el punto de entrada es agregar `hot-shots` a la app y emitir contadores de exchange exitoso/fallido desde `exchangeController.js`.

---

## 5. Dashboard de Grafana — Ajustes al Dashboard Existente

El dashboard actual (`perf/dashboard.json`) tiene 4 paneles. Se proponen dos cambios puntuales:

### Panel "Response time" — agregar p95 y p99
Actualmente solo muestra mediana y máximo. Se agregan:
- `stats.gauges.$server.scenarioDuration.p95` → `'p95'`
- `stats.gauges.$server.scenarioDuration.p99` → `'p99'`

El p95/p99 es la métrica relevante: la mediana oculta la cola larga que el usuario real experimenta.

### Panel "Requests state" — agregar 5xx
Actualmente muestra 200, errores Artillery y requests pendientes. Se agrega:
- `sumSeries(stats.gauges.$server.codes.5*)` → `'5xx'`

Estos dos cambios ya están aplicados en `perf/dashboard.json`.

---

## 6. Plan de Ejecución

### Fase A — Setup (pre-pruebas)

1. ~~Agregar cliente StatsD~~ (omitido — Artillery + cAdvisor son suficientes para el TP).
2. ~~`GET /health`~~ (ya existe en `app/app.js`).
3. Escenarios Artillery ya creados: `perf/exchange.yaml`, `perf/mixed.yaml`.
4. Dashboard actualizado: `perf/dashboard.json` (p95/p99 y 5xx ya incluidos).

Ver `perf/guia-ejecucion.md` para el paso a paso completo.

### Fase B — Captura del baseline (estado "arVault como vino")

**Importante:** esta fase se ejecuta SIN modificar la lógica del servicio, solo con instrumentación y scripts de carga. El objetivo es fotografiar el estado actual para comparación futura.

Para cada escenario (`rates`, `exchange`, `mixed`) correr cada workload model (baseline, load, stress, spike, soak) y exportar:
- Report JSON de Artillery (`artillery run --output report.json`).
- Screenshot o export del dashboard de Grafana al finalizar cada prueba.

Guardar los resultados versionados en `perf/results/baseline/`.

### Fase C — Análisis del baseline

Producir un informe (`doc/informe-baseline.md`) con:
- Latencia p50/p95/p99 por escenario y workload.
- Punto de quiebre (RPS al que aparece el primer 5xx o p99 > 2 s).
- Evidencia visual del memory leak en el soak test.
- Evidencia visual de la race condition en el stress test (comparar `app.exchange.success.count` contra la variación esperada de saldos).
- Comparación contra los QA objetivo definidos en el análisis arquitectónico.

---

## 7. Comandos y Herramientas

### Ejecutar un escenario

```bash
cd perf
./run-scenario.sh exchange local
# internamente: artillery run --environment local --output ../results/exchange-TIMESTAMP.json exchange.yaml
```

### Generar reporte HTML a partir del JSON

```bash
artillery report -o report.html perf/results/exchange-TIMESTAMP.json
```

### Acceso a las herramientas (con `docker compose up`)

| Servicio | URL |
|---|---|
| API (vía Nginx) | http://localhost:5555 |
| Graphite web | http://localhost:8090 |
| Grafana | http://localhost:80 |
| cAdvisor | http://localhost:8080 |

### Importar el dashboard en Grafana

1. Configurar datasource Graphite apuntando a `http://graphite:80` (dentro de la red de Docker) o a `http://localhost:8090` (desde el host).
2. Importar `perf/dashboard.json`.

---

## 8. Criterios de Éxito de Esta Fase

La fase de medición se considera completa cuando:

1. Existen escenarios Artillery que ejercen los 3 endpoints críticos (`rates`, `exchange`, mixto). ✓
2. El dashboard de Grafana incluye: p95/p99 de latencia, distribución de códigos HTTP (200 vs 5xx), CPU% y memoria% por contenedor. ✓
3. Hay resultados capturados de al menos 3 workload models (baseline, load, stress) × 3 escenarios que puede re-ejecutarse de forma reproducible.
4. El informe de baseline documenta al menos: latencias por escenario, punto de quiebre (RPS al que aparecen 5xx), comparación antes/después de las mejoras.

---

## 9. Qué NO se va a hacer en esta fase

Para mantener la comparabilidad del baseline con las mejoras posteriores, en esta fase **no se va a modificar la lógica del servicio**. Específicamente:

- No se corrige la race condition.
- No se cambia la persistencia JSON por Redis / DB.
- No se agregan réplicas ni rate limiting.
- No se implementa autenticación.

Todas esas mejoras son el objeto de la siguiente fase del TP. El único código que se modifica aquí es:
- Agregar cliente StatsD e instrumentación (no cambia comportamiento, solo observa).
- Agregar endpoint `/health` (nuevo endpoint, no altera los existentes).
- Agregar healthcheck y restart policy en `docker-compose.yml` (cambia resiliencia del contenedor, pero no el código de la app).
