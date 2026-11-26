# Токен Hetzner сюда НЕ пишем. Провайдер сам читает переменную окружения HCLOUD_TOKEN:
#   export HCLOUD_TOKEN=...   (в вашем терминале, не в файле и не в чате)
provider "hcloud" {}

# Токен Cloudflare тоже только из окружения: export CLOUDFLARE_API_TOKEN=...
# Права токена: Zone -> DNS -> Edit и Zone -> Zone -> Read, ограничить одной зоной (вашим доменом).
provider "cloudflare" {}
