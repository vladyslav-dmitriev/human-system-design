import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const endTimer = this.metrics.httpRequestDuration.startTimer();

    return next.handle().pipe(
      tap(() => {
        const route = req.route?.path || req.url;
        const method = req.method;
        const status = res.statusCode;

        this.metrics.httpRequestsTotal
          .labels(method, route, status.toString())
          .inc();

        endTimer({
          method,
          route,
          status: status.toString(),
        });
      }),
    );
  }
}
