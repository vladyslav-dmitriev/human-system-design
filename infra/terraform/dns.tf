# DNS в Cloudflare: A-записи поддоменов на IP сервера.
# Домен должен быть уже куплен и добавлен в Cloudflare (Cloudflare Registrar добавляет его сам).

# Зона (домен) ищется по имени: берём её zone_id.
data "cloudflare_zone" "main" {
  filter = {
    name = var.domain
  }
}

# app.<домен> (и дополнительные поддомены) -> IP сервера.
# proxied = false: режим «DNS only». Трафик идёт напрямую на сервер, поэтому Let's Encrypt (HTTP-01) проходит без сюрпризов.
# Оранжевое облако (прокси Cloudflare) включим позже, когда разберёмся с TLS.
# ttl = 60: при пересоздании сервера запись быстро обновляется во всех DNS-кэшах.
resource "cloudflare_dns_record" "host" {
  for_each = toset(concat([var.app_subdomain], var.extra_subdomains))

  zone_id = data.cloudflare_zone.main.zone_id
  name    = "${each.key}.${var.domain}"
  type    = "A"
  content = hcloud_server.main.ipv4_address
  ttl     = 60
  proxied = false
  comment = "managed by terraform (human-system-design)"
}
