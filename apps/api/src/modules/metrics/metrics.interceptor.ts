import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { MetricsService } from './metrics.service';

const METRICS_ROUTE = '/metrics';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    // Note: 401/403 thrown by guards and 404s for unmatched routes never reach
    // interceptors (guards run before, the router 404 happens outside), so
    // totals and 4xx counts are understated for those cases.
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Skip the scrape endpoint itself.
    if (req.route?.path === METRICS_ROUTE || req.path === METRICS_ROUTE) {
      return next.handle();
    }

    const endTimer = this.metrics.httpRequestDuration.startTimer();
    let recorded = false;

    const record = (status: number) => {
      if (recorded) return;
      recorded = true;

      // Never use req.url: it contains ids/query strings (unbounded cardinality).
      const route: string =
        (req.route?.path as string | undefined) || 'unknown';
      const method: string = req.method;
      const statusLabel = String(status);

      this.metrics.httpRequestsTotal.labels(method, route, statusLabel).inc();
      endTimer({ method, route, status: statusLabel });
    };

    return next.handle().pipe(
      tap({ next: () => record(res.statusCode) }),
      catchError((error) => {
        // Exception filters run after interceptors, so res.statusCode is not
        // yet set for errors: derive it from the exception.
        const status = error instanceof HttpException ? error.getStatus() : 500;
        record(status);

        return throwError(() => error);
      }),
    );
  }
}
