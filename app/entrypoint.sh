#!/bin/sh
set -e

# Render inyecta PORT (por defecto 80 en local); node queda en 3000
PORT="${PORT:-80}"
sed -i "s/listen 80;/listen ${PORT};/" /etc/nginx/http.d/default.conf

# nginx en foreground y node en background dentro del mismo contenedor
node server.js &
nginx -g "daemon off;" &

# Si cualquiera de los dos muere, el contenedor se detiene (error visible en logs)
wait -n
