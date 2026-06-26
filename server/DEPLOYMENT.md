# MarinMC Backend — Sunucu (VPS/VDS) Kurulum Rehberi

Bu rehber, MarinMC launcher'ın backend'ini (REST API + WebSocket + PostgreSQL)
kendi sunucunda (VPS/VDS) sıfırdan yayına almanı ve launcher'ı buna bağlamanı
adım adım anlatır. Hedef domain örneği: **`api.marinmc.com`**.

---

## 0) Önce şunu bil: neden Vercel değil, VPS?

Backend hem REST API hem de **canlı WebSocket** (sohbet, arkadaş durumu, emote)
sunuyor. WebSocket **kalıcı (persistent) bir process** ister. Vercel'in serverless
fonksiyonları kısa ömürlüdür ve WebSocket upgrade'ini sürdüremez — bu yüzden
sohbet/sosyal özellikler Vercel'de çalışmaz. **Bir VPS/VDS üzerinde kalıcı Node
process (PM2) + Nginx + TLS** doğru mimaridir. Bu rehber onu kurar.

> Sadece REST isteseydin Vercel yeterdi; ama bu projede WS şart, o yüzden VPS.

**Mimari:**
```
Launcher (Electron)
   │  HTTPS  ->  https://api.marinmc.com/api/...
   │  WSS    ->  wss://api.marinmc.com/ws
   ▼
[ Nginx :443 (TLS) ]  --reverse proxy-->  [ Node/Express+ws :3000 ]  -->  [ PostgreSQL :5432 ]
```

---

## 1) İhtiyaçların

- **VPS/VDS:** Ubuntu 22.04 LTS (en az 1 vCPU / 1–2 GB RAM yeterli). Sağlayıcı:
  Hetzner, Contabo, DigitalOcean, Linode, Türkiye için Natro/Turhost VDS vb.
- **Domain:** `marinmc.com` (veya elindeki). Alt alan adı `api.marinmc.com` kullanacağız.
- **Sunucunun sabit IP'si** (VPS panelinden öğren, örn. `203.0.113.10`).
- Bilgisayarından SSH erişimi (Windows'ta PowerShell `ssh` ya da PuTTY).

---

## 2) Sunucuya bağlan ve temel kurulum

```bash
ssh root@203.0.113.10            # kendi IP'n

apt update && apt upgrade -y
apt install -y git curl ufw nginx

# Güvenlik duvarı: sadece SSH + HTTP + HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### Node.js 20 (LTS) kurulumu
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # v20.x görmelisin
```

### (İsteğe bağlı ama önerilir) ayrı bir kullanıcı
```bash
adduser marin
usermod -aG sudo marin
# Sonraki adımları 'marin' kullanıcısıyla yapabilirsin (su - marin)
```

---

## 3) PostgreSQL kurulumu

İki seçenek var. **A** kendi sunucunda; **B** ücretsiz yönetilen (Neon).

### Seçenek A — VPS üzerinde PostgreSQL (kendi kontrolün)
```bash
apt install -y postgresql postgresql-contrib

sudo -u postgres psql <<'SQL'
CREATE DATABASE marinmc;
CREATE USER marin WITH ENCRYPTED PASSWORD 'GUCLU_BIR_SIFRE_KOY';
GRANT ALL PRIVILEGES ON DATABASE marinmc TO marin;
ALTER DATABASE marinmc OWNER TO marin;
SQL
```
Bağlantı dizesi (DATABASE_URL):
```
postgresql://marin:GUCLU_BIR_SIFRE_KOY@localhost:5432/marinmc
```
> Yerelde (`localhost`) çalıştığı için SSL gerektirmez. Kod, `DATABASE_URL` varsa
> Postgres'e bağlanır; yoksa SQLite dosyası kullanır (geliştirme için).

### Seçenek B — Neon (yönetilen, ücretsiz başlangıç)
1. https://neon.tech → proje oluştur → bir connection string al
   (`postgresql://...@...neon.tech/...?sslmode=require`).
2. Bunu doğrudan `DATABASE_URL` olarak kullan. Kod zaten Neon/Supabase için
   `ssl: { rejectUnauthorized: false }` ayarını içeriyor (`server/src/db.js`).

> Tablolar ilk çalıştırmada otomatik oluşturulur (`ensureDbInitialized`), elle
> migration gerekmez.

---

## 4) Backend'i kur ve yapılandır

```bash
cd /opt
git clone https://github.com/musbabaff/marinmc-launcher.git
cd marinmc-launcher/server
npm install --omit=dev
```

### `.env` dosyası oluştur
`/opt/marinmc-launcher/server/.env`:
```ini
PORT=3000
DATABASE_URL=postgresql://marin:GUCLU_BIR_SIFRE_KOY@localhost:5432/marinmc

# CORS: launcher file:// origin göndermez (otomatik izinli). Web panelin varsa ekle:
# CORS_ORIGINS=https://panel.marinmc.com,https://marinmc.com
```
> `.env` dosyasını **asla** repoya commit'leme (zaten dotenv ile okunuyor).

### Manuel ilk test
```bash
node src/server.js
# Beklenen: "[DB] Connecting to PostgreSQL..." ve
#           "[Server] Express API and WS server running on http://localhost:3000"
# Başka terminalde:  curl http://localhost:3000/health   ->  {"status":"ok",...}
# Ctrl+C ile durdur.
```

---

## 5) PM2 ile kalıcı çalıştırma

```bash
npm install -g pm2
cd /opt/marinmc-launcher/server
pm2 start src/server.js --name marinmc-api
pm2 save
pm2 startup        # çıktıdaki komutu kopyalayıp çalıştır (boot'ta otomatik başlar)

pm2 logs marinmc-api      # canlı log
pm2 restart marinmc-api   # güncelleme sonrası
```

---

## 6) Domain & DNS

Domain panelinde (GoDaddy, Cloudflare, Namecheap, vb.) **A kaydı** ekle:

| Tip | Ad (Host) | Değer (Hedef)   | TTL  |
|-----|-----------|-----------------|------|
| A   | `api`     | `203.0.113.10`  | Auto |

Bu, `api.marinmc.com` → VPS IP eşleşmesini sağlar. Yayılması birkaç dakika–saat
sürebilir. Kontrol: `ping api.marinmc.com` IP'ni göstermeli.

> Cloudflare kullanıyorsan: WebSocket'ler için proxy (turuncu bulut) açık olabilir
> (Cloudflare WS destekler), ama ilk kurulumda **DNS only (gri bulut)** yapman
> sertifika/WS sorunlarını eler. Sonra istersen proxy'yi açarsın.

---

## 7) Nginx reverse proxy (HTTP + WebSocket upgrade)

`/etc/nginx/sites-available/marinmc-api`:
```nginx
server {
    listen 80;
    server_name api.marinmc.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket upgrade başlıkları (chat/emote için ŞART)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WS bağlantıları uzun sürebilir
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```
Etkinleştir:
```bash
ln -s /etc/nginx/sites-available/marinmc-api /etc/nginx/sites-enabled/
nginx -t          # syntax OK olmalı
systemctl reload nginx
```
Test: `curl http://api.marinmc.com/health` → `{"status":"ok"}`.

---

## 8) HTTPS / TLS (Let's Encrypt) — `wss://` için zorunlu

Launcher `https`/`wss` kullanır; TLS olmadan tarayıcı/Electron WS'i reddeder.
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.marinmc.com
# E-posta gir, şartları kabul et, "redirect (HTTP->HTTPS)" seç.
```
Certbot Nginx config'ini otomatik 443 + sertifika ile günceller ve **otomatik
yenileme** kurar. Test:
```bash
curl https://api.marinmc.com/health     # {"status":"ok"}
certbot renew --dry-run                  # otomatik yenileme testi
```

Artık şunlar canlı:
- REST: `https://api.marinmc.com/api/...`
- WS:   `wss://api.marinmc.com/ws`  (ve `/emotes`)
- Kozmetik dosyaları: `https://api.marinmc.com/cosmetics/...`

---

## 9) Launcher'ı bu sunucuya bağla

Launcher production'da varsayılan olarak **`https://api.marinmc.com/api`** kullanır
(kodda merkezîleştirildi). Domain'in farklıysa build sırasında değiştir:

1. Proje kökünde `.env` oluştur (`.env.example`'ı kopyala):
   ```ini
   VITE_API_URL=https://api.marinmc.com/api
   ```
2. CSP'yi kontrol et: `index.html` içindeki `connect-src` listesinde domain'in
   ekli olmalı (`https://api.marinmc.com wss://api.marinmc.com`). Farklı domain
   kullanıyorsan oraya da ekle.
3. Electron tarafı için (kozmetik/connectivity) gerekiyorsa ortam değişkeni:
   `MARINMC_API_URL=https://api.marinmc.com/api`.
4. Launcher'ı yeniden derle/paketle:
   ```bash
   npm run build:win      # (veya build:mac / build:linux)
   ```

> Kullanıcı tarafında ayrıca Ayarlar > API URL ile çalışma anında override
> mümkündür (localStorage `marinmc_api_url`).

---

## 10) Doğrulama (uçtan uca)

```bash
# REST sağlık
curl https://api.marinmc.com/health

# Online sayısı (launcher'ın connectivity testi de bunu kullanır)
curl https://api.marinmc.com/api/stats/online-count

# WebSocket testi (sunucuda):
cd /opt/marinmc-launcher/server && node src/test_ws.js   # bağlanmayı dener
```
Launcher'ı aç → giriş yap → Sohbet/Arkadaşlar sekmesinde bağlantı kurulmalı,
ana sayfada online sayısı gelmeli, sunucu listesi API'den dolmalı.

---

## 11) Güvenlik & bakım notları

- **`.env` gizli kalsın** (DATABASE_URL, şifreler). Repoya girmesin.
- Token'lar artık 30 gün sonra dolar; CORS allowlist'li; gelen WS mesajları
  doğrulanıyor (bu sürümde eklendi). Yine de:
  - PostgreSQL'i dışarıya açma (sadece `localhost`), ya da yönetilen DB kullan.
  - `ufw` yalnız 22/80/443 açık olsun.
- **Güncelleme akışı:**
  ```bash
  cd /opt/marinmc-launcher && git pull
  cd server && npm install --omit=dev
  pm2 restart marinmc-api
  ```
- **Loglar:** `pm2 logs marinmc-api`, Nginx: `/var/log/nginx/{access,error}.log`.
- **Yedek:** `pg_dump marinmc > yedek_$(date +%F).sql` (cron'a bağlanabilir).

---

## 12) Sık karşılaşılan sorunlar

| Belirti | Sebep / Çözüm |
|--------|----------------|
| Sohbet bağlanmıyor, REST çalışıyor | Nginx'te `Upgrade`/`Connection` başlıkları eksik → 7. adımı kontrol et |
| `wss://` bağlanmıyor | TLS yok ya da sertifika hatası → 8. adım (certbot) |
| CORS hatası (web panel) | `CORS_ORIGINS` env'ine origin ekle, PM2 restart |
| 502 Bad Gateway | Node düşmüş → `pm2 logs`, `pm2 restart marinmc-api` |
| DB bağlanmıyor | `DATABASE_URL` yanlış / Postgres çalışmıyor → `systemctl status postgresql` |
| Launcher hâlâ eski URL'e gidiyor | `.env`'de `VITE_API_URL` ayarla ve **yeniden build** et; CSP'yi güncelle |

---

Hazır. `api.marinmc.com` ayağa kalktığında launcher otomatik oraya bağlanır.
