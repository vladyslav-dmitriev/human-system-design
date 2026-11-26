output "ipv4" {
  description = "Постоянный IPv4. Подставляется в ingress.host (values-prod.yaml) как <ip>.sslip.io."
  value       = hcloud_primary_ip.ipv4.ip_address
}

output "sslip_host" {
  description = "Адрес сайта без своего домена."
  value       = "${hcloud_primary_ip.ipv4.ip_address}.sslip.io"
}
