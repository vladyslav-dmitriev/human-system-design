variable "server_name" {
  description = "Имя сервера и префикс имён связанных ресурсов."
  type        = string
  default     = "hsd-prod"
}

variable "server_type" {
  description = "Тариф Hetzner. cpx32: 4 vCPU, 8 ГБ RAM (x86). Смена тарифа делает resize на месте (сервер на минуту выключается, данные остаются). Смотрите в plan: должно быть `update in-place`, а не `replace`."
  type        = string
  default     = "cpx32"
}

variable "keep_disk" {
  description = "При смене тарифа не увеличивать диск. Тогда можно вернуться на тариф дешевле. Если поставить false, диск вырастет, и обратно уже не вернуться (диск нельзя уменьшить)."
  type        = bool
  default     = true
}

variable "location" {
  description = "Дата-центр Hetzner: hel1 (Хельсинки), nbg1 (Нюрнберг), fsn1 (Фалькенштайн). В консоли Hetzner Нюрнберг и Фалькенштайн дороже Хельсинки на ~6,5 $/мес. Доступность тарифа зависит от локации."
  type        = string
  default     = "hel1"
}

variable "image" {
  description = "Образ ОС."
  type        = string
  default     = "ubuntu-24.04"
}

variable "ssh_public_key_path" {
  description = "Публичный SSH-ключ (.pub), которым вы будете заходить на сервер. Приватный ключ Terraform не видит."
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "ssh_allowed_cidrs" {
  description = "Откуда разрешён SSH (порт 22). По умолчанию отовсюду; лучше сузить до своего IP, например [\"203.0.113.7/32\"]."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

variable "admin_user" {
  description = "Пользователь для входа по SSH (с sudo). Вход под root отключается."
  type        = string
  default     = "deploy"
}

variable "k3s_version" {
  description = "Версия k3s, например v1.33.5+k3s1 (смотреть на https://github.com/k3s-io/k3s/releases). Пусто = канал stable (плавающая версия, для прода лучше закрепить)."
  type        = string
  default     = ""
}

variable "protect" {
  description = "Защита сервера от случайного удаления и пересоздания (delete_protection + rebuild_protection). Включить, как только на сервере появятся данные."
  type        = bool
  default     = false
}
