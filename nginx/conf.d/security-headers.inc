# Security-заголовки. Подключается в каждом location через include:
# add_header в location отменяет наследование add_header с уровня server.
# Файл с расширением .inc, чтобы nginx не подключил его как отдельный конфиг из conf.d/*.conf.

add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Frame-Options "DENY" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(self)" always;
# HSTS только если запрос пришёл по https (напрямую или через балансировщик): $hsts задан в default.conf
add_header Strict-Transport-Security $hsts always;
# frame-ancestors в Report-Only игнорируется, поэтому он идёт отдельной, боевой политикой
add_header Content-Security-Policy "frame-ancestors 'none'" always;
