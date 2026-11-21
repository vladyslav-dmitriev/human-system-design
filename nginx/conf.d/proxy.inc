# Общие proxy-заголовки. X-Forwarded-For дописывается к цепочке (api берёт IP клиента при trust proxy).
# Если перед этим nginx стоит балансировщик, настройте set_real_ip_from/real_ip_header,
# иначе клиентом будет считаться балансировщик.
proxy_http_version 1.1;
proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $http_host;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
proxy_connect_timeout 5s;
proxy_read_timeout 60s;
proxy_send_timeout 60s;
