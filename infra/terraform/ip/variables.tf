variable "name" {
  description = "Имя Primary IP. Основной корень (infra/terraform) ищет IP по этому имени: переменная primary_ipv4_name там должна совпадать."
  type        = string
  default     = "hsd-prod-ipv4"
}

variable "location" {
  description = "Локация IP. Должна совпадать с локацией сервера (variable location в infra/terraform), иначе Hetzner не даст привязать IP."
  type        = string
  default     = "hel1"
}

variable "protect" {
  description = "Защита IP от случайного удаления. Чтобы удалить IP намеренно, поставьте false, сделайте apply, затем destroy."
  type        = bool
  default     = true
}
