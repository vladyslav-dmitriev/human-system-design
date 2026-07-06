import { Injectable } from '@nestjs/common';
import client from 'prom-client';

@Injectable()
export class MetricsService {
  public readonly register = new client.Registry();

  // ====== DEFAULT METRICS ======
  constructor() {
    client.collectDefaultMetrics({
      register: this.register,
    });
  }

  // ====== HTTP ======
  public httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [this.register],
  });

  public httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [this.register],
  });

  // ====== REDIS ======
  public redisCacheHitsMisses = new client.Counter({
    name: 'redis_cache_hits_misses',
    help: 'Redis cache hits/misses',
    labelNames: ['result'],
    registers: [this.register],
  });

  // ====== DATABASE ======
  public dbQueryDuration = new client.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation', 'model'],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 2],
    registers: [this.register],
  });

  // ====== HELPERS ======
  getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}
