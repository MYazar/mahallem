# Mahallem — Seyrantepe Mahalle Gündemi

Seyrantepe Mahallesi (Kağıthane, İstanbul) sakinleri için harita tabanlı bir **ortak mahalle gündemi** uygulaması. Ana fikir: komşular mahallede gördükleri aksaklıkları ve eksiklikleri buraya girer, halka duyurur; diğer komşular destek verip yorum yazarak kamuoyu oluşturur.

> **Önemli:** Bu uygulama yalnızca ortak veritabanıyla (Supabase) çalışır. Duyurular, destekler ve yorumlar tarayıcıda saklanmaz; herkes aynı gündemi görür.

## Ana fikir

- **Görülen sorun kaydedilir:** haritada konum seçilir, kategori/açıklama/fotoğraf eklenir.
- **Halka duyurulur:** duyuru sosyal medyada paylaşılabilir veya bağlantısı kopyalanabilir.
- **Kamuoyu oluşur:** komşular "Destek ver" diyerek gündemi yükseltir, yorumlarıyla tartışmaya katılır.
- **Gündem görünür olur:** "Gündem" sıralaması en çok desteklenen sorunları üste taşır.

## Özellikler

- Seyrantepe Mahallesi sınırlarına sabitlenmiş interaktif harita (MapLibre GL JS + OpenFreeMap)
- Haritaya tıklayarak konum seçme ve sorun duyurusu oluşturma
- 8 kategori: yol, aydınlatma, çöp, su, park, trafik, gürültü, diğer
- Açıklama ve isteğe bağlı fotoğraf (tarayıcıda küçültülür)
- Harita üzerinde kategori renkli işaretler, kümeler (cluster) ve detay balonları
- **Kamuoyu desteği:** her kullanıcı bir duyuruya destek verebilir / desteğini geri alabilir
- **Kamuoyu yorumları:** duyuru detayında tartışma ve fikir paylaşımı
- **Gündem sıralaması:** "En yeni" ve "En çok desteklenen" görünümleri
- Sosyal medya paylaşımı (X, Facebook, WhatsApp, Telegram) ve bağlantı kopyalama
- Temel harita seçimi: Sokak, Uydu, Karanlık
- Kategori filtreleri, metin araması ve duyuru listesi
- Konumum butonu ile GPS konumunu gösterme
- Mahalle sınırı dışına duyuru eklemeyi engelleme
- Görünmez temel spam koruması: uygunsuz metin filtresi ve saatlik gönderim sınırı
- Değişiklikler diğer açık tarayıcılara anında yansır (realtime)
- Mobil uyumlu tasarım (mobilde açılır panel ve alt sayfa formu)

## Kurulum (çok basit anlatım)

Uygulamayı ilk açtığında seni bir **kurulum ekranı** karşılar. Sadece 3 şey yapman gerekir:

1. [Supabase](https://supabase.com) sitesinden ücretsiz bir proje oluştur.
2. Projenin **SQL Editor** bölümünde `supabase/schema.sql` dosyasının içeriğini çalıştır.
3. **Project Settings → API** sayfasındaki **Project URL** ve **anon public key** değerlerini kurulum ekranına yapıştır ve "Bağlan ve gündemi aç" de.

Ayrıca Supabase'de **Authentication → Providers → Anonymous Sign-Ins** seçeneğini açık olması gerekir; böylece ziyaretçiler şifre girmeden destek verip yorum yazabilir.

Artık herkes aynı duyuruları görür. Siteyi yayınlarken bu iki değeri tekrar girmek zorunda kalmamak için `.env` dosyasına da yazabilirsin:

```bash
cp .env.example .env
# VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değerlerini doldur
```

`.env` dosyası varsa kurulum ekranı görünmez; uygulama doğrudan ortak gündemi açar.

> Daha önce eski şemayı çalıştırdıysan ve fotoğraf yükleme / canlı güncelleme çalışmıyorsa `supabase/fix-extras.sql` dosyasını da SQL Editor'da çalıştır. Tekrar çalıştırmak güvenlidir.

## Çalıştırma

```bash
npm install
npm run dev
```

Ardından terminalde yazan adresi (varsayılan `http://localhost:5173`) tarayıcıda açın.

Üretim derlemesi:

```bash
npm run build
npm run preview
```

> Windows PowerShell `npm.ps1` çalıştırmayı engelliyorsa `cmd /c npm run dev` veya `npm.cmd run dev` kullanabilirsiniz.

## Vercel ile ücretsiz yayınlama (en kolay yol)

1. GitHub’da yeni bir repo aç (public olabilir). Adı örneğin `mahallem`.
2. Bilgisayarda proje klasöründe şunları çalıştır:

   ```bash
   git init
   git add .
   git commit -m "Mahalle gündemi"
   git branch -M main
   git remote add origin https://github.com/KULLANICI-ADIN/mahallem.git
   git push -u origin main
   ```

3. Vercel’e gir → **Add New… → Project** → GitHub repo’sunu seç → **Import**.
4. **Environment Variables** kısmına iki değer ekle:

   ```text
   VITE_SUPABASE_URL=https://dqtizbiiilmpwjfvoyye.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_pnfvwa4POGigh7RD4e8XYA_MJOItz2z
   ```

   Üç ortamı da işaretle: **Production, Preview, Development**.
5. **Deploy** de. Vercel Vite’ı otomatik tanır; build komutu `npm run build`, çıktı klasörü `dist` olarak gelir.
6. Site adresin şu olur: `https://proje-adi.vercel.app`

> `.env` dosyası repoda duruyor ama Vercel yayınında ayarların **dashboard’dan** okunur; yukarıdaki 4. adımı yapmayı unutma. Değişiklikten sonra **Deployments → Redeploy** gerekir.

Dilersen **Settings → Domains** bölümünden kendi alan adını da bağlayabilirsin.

## GitHub Pages (alternatif)

Proje GitHub Pages için de hazır (`.github/workflows/deploy.yml`, `base: './'` ve `.nojekyll` dosyası var). Repo → **Settings** → **Pages** → **Source: GitHub Actions** seçmen yeterli. Site adresi: `https://KULLANICI-ADIN.github.io/mahallem/`

⚠️ **service_role / secret key’i asla** `.env`’e, GitHub’a veya Vercel’e koymayın. Anon/public key herkese açıktır, sorun değildir.

## Veri ve gizlilik

- Uygulama **localStorage veri modu içermez**. Duyurular, destekler ve yorumlar Supabase veritabanındadır.
- Tarayıcıda yalnızca iki şey saklanır: Supabase bağlantı bilgileri (kurulum ekranından girilirse) ve anonim oturum. Bu, duyuru verisi değildir.
- Giriş yapan (anonim) kullanıcılar duyuru ekleyebilir, yorum yazabilir ve desteğini yönetebilir. Silme yetkisi yalnızca duyuruyu ekleyen kullanıcıdadır.
- Fotoğraflar yükleme sırasında en fazla 1000 px'e küçültülüp JPEG olarak saklanır ve `report-photos` deposuna yüklenir.
- Durum akışı (yeni / inceleniyor / çözüldü) yoktur; gündem tamamen halkın desteği ve yorumlarıyla şekillenir.

## Proje yapısı

```
src/
  components/
    MapView.tsx            MapLibre haritası, kümeler, balonlar, konum
    Sidebar.tsx            Gündem akışı, arama, filtre, sıralama
    ReportDetailModal.tsx  Duyuru detayı, destek ve kamuoyu yorumları
    ReportModal.tsx        Yeni sorun duyurusu formu
    ShareModal.tsx         Sosyal paylaşım penceresi
    SetupScreen.tsx        Supabase bağlantı kurulum ekranı
  data/
    seyrantepe.ts          Mahalle sınırı GeoJSON'u (OSM/Nominatim)
  lib/
    categories.ts          Kategori tanımları ve ikonları
    geo.ts                 Sınır kontrolü, zaman biçimlendirme
    image.ts               Fotoğraf küçültme
    moderation.ts          Temel spam koruması
    supabase.ts            Supabase istemcisi ve bağlantı ayarı
    reportsApi.ts          Ortak veri işlemleri (duyuru/destek/yorum)
    types.ts               Ortak tipler
  App.tsx                  Uygulama durumu ve akışlar
  index.css                Tüm arayüz stilleri
supabase/schema.sql        Veritabanı şeması ve güvenlik kuralları
```

## Sonraki adımlar (konuşulacak)

- Duyurular için e-posta / WhatsApp duyuru grubu entegrasyonu
- Haftalık gündem özeti ve en çok desteklenen sorunların listesi
- Harita üzerinde yoğunluk (heatmap) görünümü

## Veri kaynağı

Mahalle sınırı OpenStreetMap / Nominatim verisinden alınmıştır. Harita, OpenFreeMap üzerinden OpenStreetMap tabanlı vektör karolarla gösterilir.
