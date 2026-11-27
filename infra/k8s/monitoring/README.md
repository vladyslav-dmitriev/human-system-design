Здесь лежит SealedSecret `grafana-cloud` (namespace monitoring): ID экземпляров Prometheus и Loki и токен Grafana Cloud.
Создаётся командой `infra/scripts/seal-secrets.sh --grafana` (значения вводятся в терминале, в git попадает только шифртекст).
Файл `grafana-cloud.yaml` подхватывает Application `monitoring`.
