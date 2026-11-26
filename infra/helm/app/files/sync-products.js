"use strict";

// Синхронизирует таблицу "Product" с активными ценами Stripe.
// Делает то же, что ProductService.syncProducts (POST /billing/products/sync), но без сессии ADMIN:
// база на сервере одноразовая, и после каждого пересоздания таблица пуста, а api отвергает любой priceId,
// которого нет в "Product" (ошибка "Unknown or unavailable price").
//
// Запускается Job'ом после деплоя в образе api (его node_modules содержат pg).
// Нужны переменные окружения: DATABASE_URL и STRIPE_SECRET_KEY. Значения нигде не печатаются.
const { createRequire } = require("module");

// Скрипт лежит в /scripts (ConfigMap), а зависимости образа в /usr/src/app/node_modules (рабочий каталог образа)
const appRequire = createRequire(`${process.cwd()}/`);
const { Client } = require(
  appRequire.resolve("pg", {
    paths: [appRequire.resolve("@prisma/adapter-pg")],
  }),
);

const UPSERT = `
  INSERT INTO "Product" (id, "stripePriceId", name, price, "isActive")
  VALUES (gen_random_uuid()::text, $1, $2, $3, $4)
  ON CONFLICT ("stripePriceId") DO UPDATE
    SET name = EXCLUDED.name, price = EXCLUDED.price, "isActive" = EXCLUDED."isActive"
`;

async function main() {
  const key = process.env.STRIPE_SECRET_KEY || "";

  // Локально (minikube) и до появления реальных ключей там заглушки: тогда синхронизировать нечего
  if (!key || key.includes("placeholder")) {
    console.log(
      "STRIPE_SECRET_KEY не задан или заглушка: синхронизацию цен пропускаю",
    );
    return;
  }

  const response = await fetch(
    "https://api.stripe.com/v1/prices?active=true&limit=100&expand[]=data.product",
    { headers: { Authorization: `Bearer ${key}` } },
  );
  const body = await response.json();

  if (!response.ok) {
    const error = body.error || {};
    throw new Error(
      `Stripe ответил ${response.status}: ${error.type || "unknown"} ${error.message || ""}`,
    );
  }
  if (body.has_more) {
    console.warn(
      "В Stripe больше 100 активных цен: синхронизирована только первая страница",
    );
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    for (const price of body.data) {
      const name =
        price.product && typeof price.product === "object"
          ? price.product.name
          : String(price.product);
      await client.query(UPSERT, [
        price.id,
        name,
        price.unit_amount ?? 0,
        Boolean(price.active),
      ]);
    }

    await client.query("COMMIT");
    console.log(`Синхронизировано цен: ${body.data.length}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Синхронизация цен не удалась:", error.message);
  process.exit(1);
});
