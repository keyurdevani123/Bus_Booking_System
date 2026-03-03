#!/bin/bash
set -e

DOMAIN="keyurdevani.me"
EMAIL="devanikeyur19@gmail.com"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

# Install certbot via pip3 (works on Amazon Linux 2023)
if ! command -v certbot &>/dev/null; then
    echo "Installing certbot..."
    pip3 install certbot certbot-nginx --quiet
fi

# Only obtain cert if it doesn't exist yet
if [ ! -f "$CERT_PATH" ]; then
    echo "Obtaining SSL certificate for $DOMAIN..."
    certbot --nginx \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --redirect
    echo "Certificate obtained successfully."
else
    echo "Certificate already exists, attempting renewal if needed..."
    certbot renew --quiet --nginx || true
fi

# Set up daily auto-renewal cron
(crontab -l 2>/dev/null | grep -v certbot; echo "0 3 * * * certbot renew --quiet --nginx") | crontab -
echo "Auto-renewal cron set."
