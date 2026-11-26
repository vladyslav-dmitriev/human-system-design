# Три ресурса: SSH-ключ, файрвол и сам сервер.
# Terraform сравнивает этот код с реальностью в Hetzner и вносит разницу (`plan` показывает, `apply` применяет).

# 1. SSH-ключ: Hetzner положит его на сервер при создании.
resource "hcloud_ssh_key" "admin" {
  name       = "${var.server_name}-admin"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

# 2. Файрвол Hetzner. Всё входящее, чего нет в правилах, блокируется на уровне сети, до сервера.
#    Порт 6443 (API Kubernetes) намеренно не открыт: в кластер ходим через SSH-туннель.
resource "hcloud_firewall" "server" {
  name = "${var.server_name}-fw"

  rule {
    description = "SSH"
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = var.ssh_allowed_cidrs
  }

  rule {
    description = "HTTP (Let's Encrypt HTTP-01 и редирект на https)"
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }

  rule {
    description = "HTTPS"
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }

  rule {
    description = "ping"
    direction   = "in"
    protocol    = "icmp"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }
}

# Постоянный IPv4, созданный отдельно (infra/terraform/ip). Здесь мы только читаем его по имени
# и привязываем к серверу. Пока `ip/` не применён, plan здесь упадёт с «primary IP not found».
data "hcloud_primary_ip" "ipv4" {
  name = var.primary_ipv4_name
}

# 3. Сервер. cloud-init (user_data) выполнится один раз при первом старте: пользователь, защита SSH, k3s.
resource "hcloud_server" "main" {
  name         = var.server_name
  server_type  = var.server_type
  image        = var.image
  location     = var.location
  keep_disk    = var.keep_disk # resize тарифа не трогает диск, поэтому откат на дешёвый тариф возможен
  ssh_keys     = [hcloud_ssh_key.admin.id]
  firewall_ids = [hcloud_firewall.server.id]

  delete_protection  = var.protect
  rebuild_protection = var.protect # Hetzner требует, чтобы обе защиты совпадали

  public_net {
    ipv4_enabled = true
    ipv4         = data.hcloud_primary_ip.ipv4.id # постоянный адрес, переживает destroy сервера
    ipv6_enabled = true
  }

  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    admin_user     = var.admin_user
    ssh_public_key = trimspace(file(pathexpand(var.ssh_public_key_path)))
    # Закреплённая версия, если задана, иначе плавающий канал stable.
    k3s_install_env = var.k3s_version != "" ? "INSTALL_K3S_VERSION='${var.k3s_version}'" : "INSTALL_K3S_CHANNEL=stable"
  })

  labels = {
    project = "human-system-design"
    managed = "terraform"
  }

  lifecycle {
    # user_data выполняется только при создании. Если разрешить Terraform сравнивать его,
    # любая правка cloud-init пересоздаст сервер вместе с диском и базой.
    ignore_changes = [user_data]
  }
}
