FROM node:20-alpine

# nginx corre junto a node en el mismo contenedor (necesario en Render,
# donde solo se expone un puerto por servicio)
RUN apk add --no-cache nginx

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

COPY nginx-render.conf /etc/nginx/http.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
CMD ["/entrypoint.sh"]
