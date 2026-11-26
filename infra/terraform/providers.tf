# Токен Hetzner сюда НЕ пишем. Провайдер сам читает переменную окружения HCLOUD_TOKEN:
#   export HCLOUD_TOKEN=...   (в вашем терминале, не в файле и не в чате)
provider "hcloud" {}
