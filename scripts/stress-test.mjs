/**
 * Suite Enterprise de Test de Estrés y Benchmark de Rendimiento
 * Prensa NexoraOne • Nexora One © Todos los derechos reservados
 */

const BASE_URL = process.env.TEST_URL || "http://127.0.0.1:3000";

const TEST_SCENARIOS = [
  {
    name: "⚡ Flashes Noticiosos (GET /api/flashes)",
    path: "/api/flashes?limit=10",
    method: "GET",
    concurrency: 25,
    totalRequests: 100,
  },
  {
    name: "📰 Feed RSS de Alto Tráfico (GET /api/feeds/rss)",
    path: "/api/feeds/rss",
    method: "GET",
    concurrency: 25,
    totalRequests: 100,
  },
  {
    name: "🤖 Feed Pro No-Code (GET /api/feeds/pro)",
    path: "/api/feeds/pro",
    method: "GET",
    concurrency: 25,
    totalRequests: 100,
  },
  {
    name: "🌐 API de Sindicación de Socios (GET /api/syndication)",
    path: "/api/syndication?limit=5",
    method: "GET",
    concurrency: 20,
    totalRequests: 80,
  },
  {
    name: "🧠 Memoria Editorial & Atlas (GET /api/nora-learning)",
    path: "/api/nora-learning",
    method: "GET",
    concurrency: 15,
    totalRequests: 60,
  },
];

async function runScenario(scenario) {
  console.log(`\n======================================================================`);
  console.log(`🚀 INICIANDO TEST: ${scenario.name}`);
  console.log(`   Configuración: ${scenario.totalRequests} peticiones | Concurrencia: ${scenario.concurrency}`);
  console.log(`======================================================================`);

  const latencies = [];
  let successfulRequests = 0;
  let failedRequests = 0;
  const statusCodes = {};
  let totalBytes = 0;

  const url = `${BASE_URL}${scenario.path}`;
  const startTime = Date.now();

  let requestIndex = 0;

  async function worker() {
    while (requestIndex < scenario.totalRequests) {
      const idx = requestIndex++;
      const reqStart = performance.now();
      try {
        const response = await fetch(url, {
          method: scenario.method,
          headers: {
            "User-Agent": "NexoraStressTester/1.0",
            Accept: "application/json, application/xml, text/html",
          },
        });

        const reqEnd = performance.now();
        const latency = reqEnd - reqStart;
        latencies.push(latency);

        const status = response.status;
        statusCodes[status] = (statusCodes[status] || 0) + 1;

        const body = await response.text();
        totalBytes += body.length;

        if (response.ok) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
      } catch (err) {
        const reqEnd = performance.now();
        latencies.push(reqEnd - reqStart);
        failedRequests++;
        statusCodes["NETWORK_ERROR"] = (statusCodes["NETWORK_ERROR"] || 0) + 1;
      }
    }
  }

  // Lanzar workers concurrentes
  const workers = Array.from({ length: scenario.concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeMs = Date.now() - startTime;
  const totalTimeSec = totalTimeMs / 1000;
  const rps = (scenario.totalRequests / totalTimeSec).toFixed(2);

  // Ordenar latencias para percentiles
  latencies.sort((a, b) => a - b);
  const minLatency = latencies[0]?.toFixed(2) || "0";
  const maxLatency = latencies[latencies.length - 1]?.toFixed(2) || "0";
  const avgLatency = (latencies.reduce((sum, v) => sum + v, 0) / latencies.length).toFixed(2);
  const p50 = latencies[Math.floor(latencies.length * 0.5)]?.toFixed(2) || "0";
  const p90 = latencies[Math.floor(latencies.length * 0.9)]?.toFixed(2) || "0";
  const p95 = latencies[Math.floor(latencies.length * 0.95)]?.toFixed(2) || "0";
  const p99 = latencies[Math.floor(latencies.length * 0.99)]?.toFixed(2) || "0";
  const successRate = ((successfulRequests / scenario.totalRequests) * 100).toFixed(1);

  console.log(`📊 RESULTADOS:`);
  console.log(`   - Peticiones Totales: ${scenario.totalRequests}`);
  console.log(`   - Éxito: ${successfulRequests} (${successRate}%) | Fallos: ${failedRequests}`);
  console.log(`   - Tiempo Total: ${totalTimeMs} ms (${totalTimeSec.toFixed(2)}s)`);
  console.log(`   - Throughput (RPS): ${rps} req/seg`);
  console.log(`   - Códigos HTTP: ${JSON.stringify(statusCodes)}`);
  console.log(`⏱️ LATENCIAS:`);
  console.log(`   - Mínima:  ${minLatency} ms`);
  console.log(`   - Promedio: ${avgLatency} ms`);
  console.log(`   - P50 (Mediana): ${p50} ms`);
  console.log(`   - P90: ${p90} ms`);
  console.log(`   - P95: ${p95} ms`);
  console.log(`   - P99: ${p99} ms`);
  console.log(`   - Máxima:  ${maxLatency} ms`);

  // Evaluación de cuellos de botella
  if (failedRequests > 0) {
    console.warn(`   ⚠️ ALERTA: Hubo ${failedRequests} solicitudes con error.`);
  } else if (parseFloat(avgLatency) < 20) {
    console.log(`   ✅ RENDIMIENTO ULTRA-ALTO: Respuesta sub-20ms bajo estrés.`);
  } else if (parseFloat(avgLatency) < 100) {
    console.log(`   ✅ RENDIMIENTO ÓPTIMO: Respuesta sub-100ms.`);
  } else {
    console.log(`   ℹ️ RENDIMIENTO ESTABLE: Latencia controlada.`);
  }

  return {
    name: scenario.name,
    totalRequests: scenario.totalRequests,
    concurrency: scenario.concurrency,
    successfulRequests,
    failedRequests,
    successRate: `${successRate}%`,
    rps: Number(rps),
    avgLatency: Number(avgLatency),
    p50: Number(p50),
    p95: Number(p95),
    p99: Number(p99),
    statusCodes,
  };
}

async function main() {
  console.log(`======================================================================`);
  console.log(`🏛️ PRENSA NEXORAONE • TEST DE ESTRÉS Y BENCHMARK DE RENDIMIENTO`);
  console.log(`   Host objetivo: ${BASE_URL}`);
  console.log(`   Fecha y Hora: ${new Date().toISOString()}`);
  console.log(`======================================================================`);

  // Verificar conectividad con el servidor antes de empezar
  try {
    const ping = await fetch(`${BASE_URL}/api/flashes?limit=1`, { signal: AbortSignal.timeout(5000) });
    console.log(`✅ Servidor en línea (HTTP ${ping.status}). Iniciando batería de estrés...\n`);
  } catch (err) {
    console.error(`❌ Error: No se puede conectar a ${BASE_URL}. Asegúrate de que el servidor esté activo.`);
    console.error(`   Detalle: ${err.message}`);
    process.exit(1);
  }

  const summary = [];
  for (const scenario of TEST_SCENARIOS) {
    const res = await runScenario(scenario);
    summary.push(res);
  }

  console.log(`\n======================================================================`);
  console.log(`📋 TABLA RESUMEN DE RENDIMIENTO BAJO ESTRÉS`);
  console.log(`======================================================================`);
  console.table(
    summary.map((s) => ({
      Escenario: s.name.split("(")[0].trim(),
      Reqs: s.totalRequests,
      Conc: s.concurrency,
      "Tasa Éxito": s.successRate,
      "RPS": s.rps,
      "Lat. Promedio": `${s.avgLatency} ms`,
      "P95": `${s.p95} ms`,
    }))
  );
  console.log(`\n✅ Batería de tests de estrés finalizada exitosamente.\n`);
}

main().catch((e) => {
  console.error("Fallo general en ejecución de test de estrés:", e);
  process.exit(1);
});
