/**
 * Заголовки web-сервера → api: общий секрет и IP клиента.
 * Только для серверного кода (auth.ts, api-server.ts). Секрет читается из
 * `INTERNAL_API_SECRET` без префикса `NEXT_PUBLIC_`: Next не подставляет такие
 * переменные в клиентский бандл, в браузере значение всегда `undefined`.
 * `server-only` роняет сборку, если модуль импортирован из клиентского кода.
 */
import "server-only";

type HeaderSource = { get(name: string): string | null };

/** Первый адрес из `x-forwarded-for` (его ставит nginx), иначе `x-real-ip` */
export function getClientIp(source: HeaderSource | null | undefined) {
  if (!source) return undefined;

  const forwarded = source.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;

  return source.get("x-real-ip")?.trim() || undefined;
}

/** `X-Internal-Secret` и `X-Client-IP` (пустые значения не отправляются) */
export function buildInternalHeaders(
  source: HeaderSource | null | undefined,
): Record<string, string> {
  const secret = process.env.INTERNAL_API_SECRET;
  const ip = getClientIp(source);

  return {
    ...(secret ? { "X-Internal-Secret": secret } : {}),
    ...(ip ? { "X-Client-IP": ip } : {}),
  };
}
