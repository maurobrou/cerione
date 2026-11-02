#!/usr/bin/env bash
# CERIONE · instala o servidor de WhatsApp (Evolution API) numa VM Ubuntu da Oracle Cloud.
# Uso (na VM):  bash instalar.sh            -> instala ou atualiza
#               bash instalar.sh dominio.com -> usa um domínio próprio em vez do endereço grátis sslip.io
set -euo pipefail
cd "$(dirname "$0")"
echo "== CERIONE · servidor de WhatsApp =="
if ! command -v docker >/dev/null 2>&1; then
  echo "-> Instalando o Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
fi
echo "-> Liberando as portas 80 e 443 no firewall da VM..."
for p in 80 443; do
  sudo iptables -C INPUT -p tcp --dport $p -m state --state NEW -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 5 -p tcp --dport $p -m state --state NEW -j ACCEPT
done
if command -v netfilter-persistent >/dev/null 2>&1; then sudo netfilter-persistent save >/dev/null 2>&1 || true
else sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent >/dev/null 2>&1 && sudo netfilter-persistent save >/dev/null 2>&1 || true; fi
if [ ! -f .env ]; then
  IP=$(curl -fsS https://api.ipify.org || curl -fsS https://ifconfig.me)
  DOMAIN="${1:-${IP//./-}.sslip.io}"
  KEY=$(openssl rand -hex 24); PG=$(openssl rand -hex 18)
  printf 'DOMAIN=%s\nEVOLUTION_KEY=%s\nPG_PASS=%s\n' "$DOMAIN" "$KEY" "$PG" > .env
  chmod 600 .env
elif [ -n "${1:-}" ]; then
  sed -i "s/^DOMAIN=.*/DOMAIN=$1/" .env
fi
set -a; . ./.env; set +a
echo "-> Subindo Evolution API, banco, cache e HTTPS (a primeira vez leva uns minutos)..."
sudo docker compose pull -q
sudo docker compose up -d
echo -n "-> Aguardando o HTTPS ficar pronto"
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null "https://$DOMAIN/"; then echo " ok"; break; fi
  echo -n "."; sleep 5
done
cat <<MSG

==============================================================
 Pronto. Coloque estes dois valores nos segredos do Supabase
 (Edge Functions -> Secrets). NÃO mande a chave por chat/e-mail.

   EVOLUTION_URL = https://$DOMAIN
   EVOLUTION_KEY = $EVOLUTION_KEY

 Para ver de novo depois:  cat ~/cerione-whatsapp/.env
==============================================================
MSG
