# Общие proxy-заголовки. nginx стоит на краю, поэтому X-Forwarded-For - только реальный адрес
# клиента ($remote_addr), без цепочки от клиента (иначе её можно подделать и обойти лимиты по IP).
# Если перед nginx стоит балансировщик/ingress, добавьте в server{} (templates/default.conf.template):
#   set_real_ip_from 10.0.0.0/8;       # адреса доверенных балансировщиков
#   real_ip_header   X-Forwarded-For;  # или proxy_protocol
#   real_ip_recursive on;
# тогда $remote_addr станет адресом клиента, и заголовки ниже останутся корректными.
proxy_http_version 1.1;
proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $http_host;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
proxy_connect_timeout 5s;
proxy_read_timeout 60s;
proxy_send_timeout 60s;
