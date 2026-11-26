# Постоянный публичный IPv4. Живёт отдельно от сервера (свой корень и свой state), поэтому
# `terraform destroy` в infra/terraform удаляет сервер, а адрес остаётся за вами.
# Зачем: адрес сайта <ip>.sslip.io вшивается в образ web при сборке, и менять его при каждом пересоздании сервера нельзя.
#
# Стоит ~0,001 $ в час (~0,73 $ в месяц) всё время, пока существует, даже если сервер удалён.
resource "hcloud_primary_ip" "ipv4" {
  name        = var.name
  type        = "ipv4"
  location    = var.location
  auto_delete = false # не удалять IP вместе с сервером
  # assignee_id не задаём: IP создаётся свободным, к серверу его привяжет корень infra/terraform.

  delete_protection = var.protect

  labels = {
    project = "human-system-design"
    managed = "terraform"
  }
}
