# Derleme Rehberi (BUILD)

Bu belge MarinMC Launcher'ın üç parçasını (launcher, client mod, backend) kaynaktan
derlemeyi ve yeni sürüm yayınlamayı anlatır.

## Gereksinimler

| Araç | Sürüm | Kullanım |
|------|-------|----------|
| Node.js | 20+ | Launcher (renderer + electron) |
| npm | 10+ | Bağımlılıklar |
| Git + **Git LFS** | — | `*.jar` ve `*.mp4` LFS ile saklanır |
| JDK | 21 | Client mod (Fabric) |
| (opsiyonel) ffmpeg | — | Arka plan videosu/karelerini optimize etmek |

> Klonladıktan sonra LFS varlıklarını çek: `git lfs install && git lfs pull`

---

## 1) Launcher

```bash
npm install

# Geliştirme (Vite + Electron, hot reload)
npm run dev

# Üretim derlemesi (yerel)
npm run build:win      # Windows  -> release/MarinMC-Launcher-Setup-x.x.x.exe
# npm run build:mac    # macOS    -> .dmg
# npm run build:linux  # Linux    -> .AppImage
```

Derleme adımları:
- `build:renderer` → `tsc && vite build` (React arayüz → `dist/`)
- `build:electron` → `tsc -p tsconfig.node.json` + splash/tray-icon/icon dosyalarını `dist-electron/`'a kopyalar
- `electron-builder` → kurulum paketini `release/`'a üretir (yapılandırma: `electron-builder.yml`)

> Not: 77 MB'lık client mod jar'ı **installer'a gömülmez** (çalışma anında GitHub LFS'ten indirilir). Bu, kurulum boyutunu ve otomatik güncelleme süresini düşürür.

---

## 2) Client Mod (Fabric)

```bash
cd marinmc-client-mod
./gradlew build        # jar -> build/libs/marinmc-client-mod-1.0.0.jar
```

Yeni mod sürümü yayınlamak için:
1. `./gradlew build`
2. Jar'ı `assets/`'e kopyala: `cp build/libs/marinmc-client-mod-1.0.0.jar ../assets/`
3. Yeni MD5'i hesapla ve `electron/ipc/game.ts` içindeki `marinmc-client-mod` kaydının `md5` değerini güncelle:
   ```bash
   node -e "const c=require('crypto'),fs=require('fs');console.log(c.createHash('md5').update(fs.readFileSync('../assets/marinmc-client-mod-1.0.0.jar')).digest('hex'))"
   ```
4. Launcher bu jar'ı şu LFS adresinden indirir:
   `https://media.githubusercontent.com/media/musbabaff/marinmc-launcher/main/assets/marinmc-client-mod-1.0.0.jar`

> Arka plan kareleri (`bg_frames`) ffmpeg ile arkaplan.mp4'ten üretilir; az/küçük kare = az lag + küçük jar. Örnek:
> `ffmpeg -i assets/arkaplan.mp4 -t 12 -vf "fps=8,scale=512:288" -pix_fmt rgb24 .../bg_frames/frame_%d.png`
> (kare hızını `AnimatedBackgroundRenderer.FRAME_DURATION` ile eşleştir.)

---

## 3) Backend / API

Bkz. **[server/DEPLOYMENT.md](server/DEPLOYMENT.md)** — VPS'te Node + PostgreSQL + PM2 + Nginx + TLS kurulumu.

```bash
cd server
npm install
npm start              # http://localhost:3000 (PORT env ile değişir)
```

---

## 4) Sürüm Yayınlama (CI/CD)

Sürümler **GitHub Actions** ile otomatik üretilir (`.github/workflows/build.yml`):

```bash
# 1. Sürümü yükselt
#    package.json "version" ve src/lib/constants.ts APP_VERSION
# 2. Commit + push
git add -A && git commit -m "release: vX.Y.Z" && git push origin main
# 3. Etiket oluştur ve push'la -> Actions Windows/macOS/Linux derler + Release oluşturur
git tag vX.Y.Z
git push origin vX.Y.Z
```

- `main`'e her push → derleme (artifact üretir).
- `v*` etiketi → derleme **+ otomatik GitHub Release** (exe/dmg/AppImage/latest.yml eklenir).
- Checkout `lfs: true` ile yapılır, böylece LFS varlıkları (jar/video) derlemeye dahil olur.

> Manuel release gerekirse: yerelde `npm run build:win` sonrası `gh release create vX.Y.Z release/*.exe release/*.blockmap release/latest.yml`.
