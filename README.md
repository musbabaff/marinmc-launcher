<div align="center">

<img src="assets/logo.png" alt="MarinMC" width="120" />

# MarinMC Launcher

**MarinMC ağı için resmi, modern Minecraft launcher'ı — özel Fabric client modu, gerçek-zamanlı sosyal özellikler ve tek tıkla oyun.**

[![Version](https://img.shields.io/badge/sürüm-1.3.24-EAB308?style=for-the-badge)](https://github.com/musbabaff/marinmc-launcher/releases)
[![Minecraft](https://img.shields.io/badge/Minecraft-1.21.8-2D7DD2?style=for-the-badge)](https://minecraft.net)
[![Fabric](https://img.shields.io/badge/Fabric-Loader-7B6FFF?style=for-the-badge)](https://fabricmc.net)
[![License](https://img.shields.io/badge/lisans-MIT-10B981?style=for-the-badge)](LICENSE)
[![Build](https://img.shields.io/badge/CI-GitHub%20Actions-94A3B8?style=for-the-badge&logo=githubactions)](.github/workflows/build.yml)

[İndir](https://github.com/musbabaff/marinmc-launcher/releases/latest) · [Sunucu Kurulumu](server/DEPLOYMENT.md) · [Derleme](BUILD.md) · [Discord](https://discord.gg/marinmc)

</div>

---

## 📖 Hakkında

**MarinMC Launcher**, `oyna.marinmc.com` Minecraft ağı için geliştirilmiş; oyuncuların tek tıkla oyuna girmesini, arkadaşlarıyla gerçek-zamanlı sohbet etmesini, kozmetiklerini yönetmesini ve performanslı bir özel client kullanmasını sağlayan kapsamlı bir masaüstü ekosistemidir.

Üç ana parçadan oluşur:

| Parça | Teknoloji | Görev |
|-------|-----------|-------|
| **Launcher** | Electron + React + Vite + TailwindCSS | Masaüstü arayüz, oyun başlatma, sosyal/kozmetik/mağaza ekranları |
| **Backend API** | Node.js + Express + WebSocket + PostgreSQL | Kimlik doğrulama, arkadaşlık, sohbet, kozmetik, istatistik |
| **Client Mod** | Java 21 + Fabric (1.21.8) | Oyun-içi HUD, kozmetikler, performans, özel menüler |

---

## ✨ Özellikler

### 🚀 Launcher
- **Tek tıkla oyna** — Java tespiti, mod indirme/doğrulama (MD5), otomatik kurulum
- **Microsoft (premium) ve offline giriş**, çoklu profil desteği
- **Otomatik güncelleme** (electron-updater, diferansiyel indirme) — profiller/ayarlar korunur
- **Sosyal:** gerçek arkadaşlık isteği sistemi, karşılıklı ekleme/silme, canlı online durumu, DM + lobi sohbeti (WebSocket)
- **Kozmetikler:** skin/pelerin/kanat önizleme, 3D karakter görünümü
- **Mod yöneticisi** (Modrinth), sürüm seçimi, **galeri** (oyun-içi F2 ekran görüntüleri otomatik listelenir), profil/istatistik/başarımlar
- **Akıllı JVM optimizasyonu** (RAM'e göre G1GC), Discord RPC
- Çerçevesiz premium arayüz, video arka plan, tam Türkçe + İngilizce

### 🎮 Client Mod (MarinMC Client)
- **HUD modülleri:** FPS, CPS, Keystrokes, Koordinat, Pusula, Ping, Hız, Zırh, İksir, Crosshair, Hasar göstergesi… — sürükle-bırak **HUD editörü** ile tam özelleştirme (ölçek, renk, saydamlık, kenar)
- **Mekanikler:** Freelook (360°), Zoom (basılı tut), Toggle Sneak/Sprint, **Fullbright**, Block Outline, TNT menzili, 1.7 vuruş animasyonları
- **Sohbet makroları** (tuşa atanabilir), **kayıt göstergesi**
- **Gerçek ayarlar:** General/Performance toggle'ları gerçek oyun seçeneklerine bağlı (Reduced Particles, FPS Boost, Raw Mouse Input…)
- Paketli performans modları: **Sodium · Lithium · Iris · FerriteCore · ImmediatelyFast · EntityCulling · Dynamic FPS** ve dahası
- Optimize edilmiş animasyonlu menü arka planı, özel başlık ekranı, kozmetik render (GeckoLib)

---

## 📥 Kurulum (Oyuncular için)

1. [**Releases**](https://github.com/musbabaff/marinmc-launcher/releases/latest) sayfasından işletim sistemine uygun dosyayı indir:
   - Windows → `MarinMC-Launcher-Setup-x.x.x.exe`
   - macOS → `.dmg` · Linux → `.AppImage`
2. Kur ve aç — gerisini launcher halleder (Java, modlar, client mod otomatik gelir).
3. Microsoft veya offline hesabınla giriş yap, **OYNA**'ya bas.

> Güncellemeler otomatik gelir; profillerin, ayarların ve oyun dosyaların korunur.

---

## 🛠️ Geliştirme & Derleme

```bash
git clone https://github.com/musbabaff/marinmc-launcher.git
cd marinmc-launcher
git lfs pull          # LFS varlıkları (mod jar, video)
npm install
npm run dev           # launcher'ı geliştirme modunda çalıştır
```

> Bu repo büyük binary'ler için **Git LFS** kullanır (`*.jar`, `*.mp4`). `git lfs install` kurulu olmalı.

Sürümler **GitHub Actions** ile otomatik üretilir: `v*` etiketi push'lanınca Windows/macOS/Linux derlenir ve release oluşturulur. Ayrıntılı talimatlar: **[BUILD.md](BUILD.md)**

---

## 🌐 Sunucu / API

Backend (REST + WebSocket + PostgreSQL) kalıcı bir VPS'te çalışır. Kapsamlı kurulum (Node, PostgreSQL/Neon, PM2, Nginx, TLS, domain) rehberi: **[server/DEPLOYMENT.md](server/DEPLOYMENT.md)**

- Üretim API'si: `https://api.marinmc.com` (kök adres markalı bir durum sayfası gösterir)
- Oyun sunucusu: `oyna.marinmc.com`

> WebSocket gerektirdiği için backend serverless değil, **kalıcı bir sunucuda** çalışmalıdır.

---

## 🧱 Proje Yapısı

```
marinmc-launcher/
├── electron/            # Electron ana süreç (main, ipc, tray, updater, splash)
├── src/                 # React arayüz (pages, components, stores, lib)
├── assets/              # Logo, ikonlar, video (LFS), client mod jar (LFS)
├── server/              # Node.js backend (Express + WS + DB)  → DEPLOYMENT.md
├── marinmc-client-mod/  # Fabric client modu (Java 21)
├── scripts/             # Asset/araç script'leri
├── .github/workflows/   # CI/CD (build.yml)
└── electron-builder.yml # Paketleme yapılandırması
```

---

## 🧰 Teknoloji

**Launcher:** Electron 28 · React 18 · TypeScript · Vite · TailwindCSS · Zustand · Framer Motion · i18next
**Backend:** Node.js · Express · ws · PostgreSQL (pg) · Zod · Helmet · express-rate-limit
**Mod:** Java 21 · Fabric Loom · Mixin · GeckoLib

---

## 🔒 Güvenlik

- Microsoft token'ları Mojang'a karşı doğrulanır (sahte giriş engellenir)
- Oturum token'ları süre dolumlu (30 gün), CORS allowlist, rate-limit, parametreli SQL
- IPC dosya işlemlerinde path traversal/symlink koruması, indirme host allowlist'i
- Güvenlik açığı bildirimi: [SECURITY.md](SECURITY.md)

---

## 🤝 Katkı

[CONTRIBUTING.md](CONTRIBUTING.md) ve PR şablonuna göz at.

## 📜 Lisans

[MIT Lisansı](LICENSE) ile lisanslanmıştır.

---

<div align="center">

**MarinMC** · [marinmc.com](https://marinmc.com) · [Discord](https://discord.gg/marinmc) · `oyna.marinmc.com`

</div>
