# Mahallem — Seyrantepe Mahalle Gündemi

Seyrantepe Mahallesi (Kağıthane, İstanbul) için harita tabanlı ortak gündem uygulaması. Kullanıcılar mahalledeki aksaklıkları haritada işaretler; diğer kullanıcılar destek verip yorum yazabilir. Duyurular, destekler ve yorumlar Supabase veritabanında tutulur; tarayıcıda saklanan bir veri modu yoktur.

## Özellikler

- Seyrantepe sınırlarına sabitlenmiş etkileşimli harita (MapLibre GL JS + OpenFreeMap)
- Haritaya tıklayarak konum seçme, kategori/açıklama/fotoğraf ekleme
- Kategori renkli işaretler, kümeler ve duyuru balonları
- Duyuru detayı, kamuoyu desteği ve yorumlar
- “En yeni” ve “Gündem” sıralamaları
- Kategori filtreleri, metin araması ve duyuru listesi
- Sosyal medya paylaşımı ve bağlantı kopyalama
- Sokak, uydu ve karanlık harita seçenekleri
- Anonim oturum, RLS, realtime güncelleme ve fotoğraf deposu
- Mobil uyumlu arayüz

## Teknoloji

React + TypeScript + Vite, MapLibre GL JS, Supabase (Postgres, anon auth, RLS, RPC, realtime, storage).

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` dosyasını Supabase projesinin değerleriyle doldur:

```text
VITE_SUPABASE_URL=https://<proje>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

Supabase projesinde `supabase/schema.sql` çalıştırılır ve anonim giriş (Anonymous Sign-Ins) etkinleştirilir. Yalnızca anon/public key kullanılır; service_role veya secret key depoya eklenmez.

Geliştirme sunucusu:

```bash
npm run dev
```

Üretim derlemesi:

```bash
npm run build
npm run preview
```

## Yayın

GitHub Pages dağıtımı `.github/workflows/deploy.yml` ile yapılır. Deponun Secrets bölümünde şu iki değer tanımlanır:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`main` branch’ine yapılan her push siteyi yeniden derleyip yayınlar. Derleme `base: './'` ayarını ve `.nojekyll` dosyasını kullanır.

## Veri yapısı

- `reports`: duyurular
- `report_endorsements`: komşu destekleri
- `report_comments`: yorumlar
- RPC: `endorse_report`, `unendorse_report`, `add_comment`

Durum akışı (yeni / inceleniyor / çözüldü) bulunmaz; gündem destek ve yorumlarla şekillenir.

## Proje yapısı

```text
src/
  components/  Harita, gündem paneli, duyuru ve detay pencereleri
  data/        Mahalle sınırı GeoJSON verisi
  lib/         Supabase istemcisi, veri işlemleri, yardımcılar
  App.tsx      Uygulama akışı
  index.css    Arayüz stilleri
supabase/
  schema.sql   Tablolar, RLS, RPC ve trigger’lar
  fix-extras.sql  Depo ve realtime tamamlayıcısı
```

## Veri kaynağı

Mahalle sınırı OpenStreetMap / Nominatim verisinden alınmıştır. Harita, OpenFreeMap üzerinden OpenStreetMap tabanlı vektör karolarla gösterilir.
