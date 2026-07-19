export class RabbitMQLogger {
  private readonly context: string;

  constructor(context: string = 'RabbitMQ') {
    this.context = context;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  error(message: string, error?: any): void {
    const errorMeta =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
    console.error(this.formatMessage('ERROR', message, errorMeta));
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }

  fatal(message: string, error?: any): void {
    const errorMeta =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
    console.error(this.formatMessage('FATAL', message, errorMeta));
  }
}
