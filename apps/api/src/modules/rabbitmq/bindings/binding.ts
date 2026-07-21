import { Queue } from '../types/exchanges.types';

/**
 * Класс для управления биндингами
 */
export class Binding {
  constructor(
    public readonly exchange: string,
    public readonly name: string,
    public readonly routingKey: string,
    public readonly arguments?: Record<string, any>,
    public readonly description?: string,
  ) {}

  /**
   * Создание биндинга из определения
   */
  static fromDefinition(def: Queue): Binding {
    return new Binding(
      def.exchange,
      def.name,
      def.routingKey,
      def.arguments,
      def.description,
    );
  }

  /**
   * Создание биндинга для multiple routing keys
   */
  static createMultiple(
    exchange: string,
    name: string,
    routingKeys: string[],
    description?: string,
  ): Binding[] {
    return routingKeys.map(
      (key) =>
        new Binding(
          exchange,
          name,
          key,
          undefined,
          description || `Binding for ${key}`,
        ),
    );
  }

  /**
   * Создание биндинга для fanout обменника
   */
  static createFanout(
    exchange: string,
    name: string,
    description?: string,
  ): Binding {
    return new Binding(
      exchange,
      name,
      '', // Fanout не использует routing key
      undefined,
      description || 'Fanout binding',
    );
  }

  /**
   * Создание биндинга с аргументами
   */
  static createWithArgs(
    exchange: string,
    name: string,
    routingKey: string,
    args: Record<string, any>,
    description?: string,
  ): Binding {
    return new Binding(exchange, name, routingKey, args, description);
  }

  /**
   * Проверка валидности биндинга
   */
  isValid(): boolean {
    return !!(this.exchange && this.name);
  }

  /**
   * Преобразование в строку для логирования
   */
  toString(): string {
    return `Binding(${this.exchange} -> ${this.name} [${this.routingKey}])`;
  }

  /**
   * Клонирование биндинга
   */
  clone(): Binding {
    return new Binding(
      this.exchange,
      this.name,
      this.routingKey,
      this.arguments ? { ...this.arguments } : undefined,
      this.description,
    );
  }

  /**
   * Сравнение биндингов
   */
  equals(other: Binding): boolean {
    return (
      this.exchange === other.exchange &&
      this.name === other.name &&
      this.routingKey === other.routingKey
    );
  }
}

/**
 * Коллекция биндингов
 */
export class BindingCollection {
  private bindings: Binding[] = [];

  constructor(bindings: Binding[] = []) {
    this.bindings = bindings;
  }

  add(binding: Binding): this {
    if (!this.has(binding)) {
      this.bindings.push(binding);
    }
    return this;
  }

  addMany(bindings: Binding[]): this {
    for (const binding of bindings) {
      this.add(binding);
    }
    return this;
  }

  remove(binding: Binding): this {
    this.bindings = this.bindings.filter((b) => !b.equals(binding));
    return this;
  }

  has(binding: Binding): boolean {
    return this.bindings.some((b) => b.equals(binding));
  }

  findByExchange(exchange: string): Binding[] {
    return this.bindings.filter((b) => b.exchange === exchange);
  }

  findByQueue(queue: string): Binding[] {
    return this.bindings.filter((b) => b.name === queue);
  }

  findByRoutingKey(routingKey: string): Binding[] {
    return this.bindings.filter((b) => b.routingKey === routingKey);
  }

  toArray(): Binding[] {
    return [...this.bindings];
  }

  get size(): number {
    return this.bindings.length;
  }

  isEmpty(): boolean {
    return this.bindings.length === 0;
  }
}
