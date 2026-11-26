output "ipv4" {
  description = "Публичный IPv4 сервера."
  value       = hcloud_server.main.ipv4_address
}

output "ssh_command" {
  description = "Как зайти на сервер."
  value       = "ssh ${var.admin_user}@${hcloud_server.main.ipv4_address}"
}

output "app_host" {
  description = "Адрес приложения. Подставляется в ingress.host (values-prod.yaml) и в NEXT_PUBLIC_API_CLIENT_URL."
  value       = cloudflare_dns_record.host[var.app_subdomain].name
}

output "hosts" {
  description = "Все созданные DNS-имена."
  value       = [for r in cloudflare_dns_record.host : r.name]
}

output "kubectl_tunnel" {
  description = "SSH-туннель до API k3s (порт 6443 снаружи закрыт). Держать открытым, пока работаете с kubectl."
  value       = "ssh -N -L 6443:127.0.0.1:6443 ${var.admin_user}@${hcloud_server.main.ipv4_address}"
}
