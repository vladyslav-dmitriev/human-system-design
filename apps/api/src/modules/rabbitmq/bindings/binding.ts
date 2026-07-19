import { BindingDefinition } from '../types/exchanges.types';

/**
 * Класс для управления биндингами
 */
export class Binding {
  constructor(
    public readonly sourceExchange: string,
    public readonly destinationQueue: string,
    public readonly routingKey: string,
    public readonly argumentsArr?: Record<string, any>,
    public readonly description?: string,
  ) {}

  /**
   * Создание биндинга из определения
   */
  static fromDefinition(def: BindingDefinition): Binding {
    return new Binding(
      def.sourceExchange,
      def.destinationQueue,
      def.routingKey,
      def.argumentsArr,
      def.description,
    );
  }

  /**
   * Создание биндинга для multiple routing keys
   */
  static createMultiple(
    sourceExchange: string,
    destinationQueue: string,
    routingKeys: string[],
    description?: string,
  ): Binding[] {
    return routingKeys.map(
      (key) =>
        new Binding(
          sourceExchange,
          destinationQueue,
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
    sourceExchange: string,
    destinationQueue: string,
    description?: string,
  ): Binding {
    return new Binding(
      sourceExchange,
      destinationQueue,
      '', // Fanout не использует routing key
      undefined,
      description || 'Fanout binding',
    );
  }

  /**
   * Создание биндинга с аргументами
   */
  static createWithArgs(
    sourceExchange: string,
    destinationQueue: string,
    routingKey: string,
    args: Record<string, any>,
    description?: string,
  ): Binding {
    return new Binding(
      sourceExchange,
      destinationQueue,
      routingKey,
      args,
      description,
    );
  }

  /**
   * Проверка валидности биндинга
   */
  isValid(): boolean {
    return !!(this.sourceExchange && this.destinationQueue);
  }

  /**
   * Преобразование в строку для логирования
   */
  toString(): string {
    return `Binding(${this.sourceExchange} -> ${this.destinationQueue} [${this.routingKey}])`;
  }

  /**
   * Клонирование биндинга
   */
  clone(): Binding {
    return new Binding(
      this.sourceExchange,
      this.destinationQueue,
      this.routingKey,
      this.argumentsArr ? { ...this.argumentsArr } : undefined,
      this.description,
    );
  }

  /**
   * Сравнение биндингов
   */
  equals(other: Binding): boolean {
    return (
      this.sourceExchange === other.sourceExchange &&
      this.destinationQueue === other.destinationQueue &&
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
    return this.bindings.filter((b) => b.sourceExchange === exchange);
  }

  findByQueue(queue: string): Binding[] {
    return this.bindings.filter((b) => b.destinationQueue === queue);
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
