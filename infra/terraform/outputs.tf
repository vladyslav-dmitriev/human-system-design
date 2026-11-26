output "ipv4" {
  description = "Публичный IPv4 сервера."
  value       = hcloud_server.main.ipv4_address
}

output "ssh_command" {
  description = "Как зайти на сервер."
  value       = "ssh ${var.admin_user}@${hcloud_server.main.ipv4_address}"
}

output "sslip_host" {
  description = "Хост без своего домена: sslip.io превращает IP в DNS-имя. Подставляется в ingress.host в values-prod.yaml."
  value       = "${hcloud_server.main.ipv4_address}.sslip.io"
}

output "kubectl_tunnel" {
  description = "SSH-туннель до API k3s (порт 6443 снаружи закрыт). Держать открытым, пока работаете с kubectl."
  value       = "ssh -N -L 6443:127.0.0.1:6443 ${var.admin_user}@${hcloud_server.main.ipv4_address}"
}
