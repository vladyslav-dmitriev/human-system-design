# DNS-записи для отправки писем через Resend (домен var.domain, регион eu-west-1).
# Значения выдал кабинет Resend при добавлении домена (Domains -> домен -> DNS records). Это публичные данные, не секреты:
#   DKIM  - публичный ключ, которым получатель проверяет подпись письма;
#   rsend/send (CNAME) - SPF и обработка отказов/жалоб на стороне Resend (адреса возврата);
#   DMARC - политика p=none (только наблюдение): письма не отклоняются, пока вы не убедитесь, что SPF и DKIM проходят.
# Корневые MX и SPF домена не трогаем: Resend использует поддомен send, поэтому обычной почте на домене они не мешают.
# Если домен пересоздать в Resend, значения изменятся: поменяйте их здесь и выполните terraform apply.

locals {
  resend_dkim = "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDGRymAhV4OqzaNPsukwYzwdKBCgl3x4xTpo3o+Fta8d4AiRWxTivkJIHNx295ZrneJGxPnzMLENjPUBGV/ESOfgkpo/wojNkJdJZLrqowizYIvxPI4YHFE3MxZDl7BMZR6eJASh6C64SDPGgj/EXVHKzitA0lPagdKpk0Ml4ZJ9wIDAQAB"

  resend_cname = {
    rsend = "rsend-euw1.forge.rmta.net"
    send  = "send.forge.rmta.net"
  }
}

resource "cloudflare_dns_record" "resend_dkim" {
  zone_id = data.cloudflare_zone.main.zone_id
  name    = "resend._domainkey.${var.domain}"
  type    = "TXT"
  # Cloudflare принимает TXT в кавычках; длинное значение провайдер делит на части сам
  content = "\"${local.resend_dkim}\""
  ttl     = 3600
  comment = "managed by terraform (Resend DKIM)"
}

resource "cloudflare_dns_record" "resend_cname" {
  for_each = local.resend_cname

  zone_id = data.cloudflare_zone.main.zone_id
  name    = "${each.key}.${var.domain}"
  type    = "CNAME"
  content = each.value
  ttl     = 3600
  # Только DNS: Resend проверяет именно CNAME, оранжевое облако Cloudflare сломало бы проверку
  proxied = false
  comment = "managed by terraform (Resend SPF/return-path)"
}

resource "cloudflare_dns_record" "dmarc" {
  zone_id = data.cloudflare_zone.main.zone_id
  name    = "_dmarc.${var.domain}"
  type    = "TXT"
  content = "\"v=DMARC1; p=none;\""
  ttl     = 3600
  comment = "managed by terraform (DMARC, только наблюдение)"
}
