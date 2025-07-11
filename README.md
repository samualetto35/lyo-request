# LYO Request - İzin Yönetim Sistemi 🎓

## ⚠️ ÖNEMLİ NOT: UI TASARIMI DEVAM ETMEKTEDİR

Bu sistem, Sabancı Üniversitesi Lise Yaz Okulu öğrencilerinin izin taleplerini yönetmek için geliştirilmiş bir web uygulamasıdır.

## 🚀 Özellikler

- ✅ Veli telefon numarası ile güvenli giriş
- 📱 SMS doğrulama sistemi
- 📝 İzin talebi oluşturma
- ✉️ Veli onay sistemi (SMS ile)
- 👥 Çoklu öğrenci desteği (Aynı veli birden fazla öğrenci için)
- 📊 Google Sheets entegrasyonu
- 🔒 Güvenli oturum yönetimi

## 🛠 Teknolojiler

- Next.js 14
- TypeScript
- Tailwind CSS
- Redis (Upstash)
- Google Sheets API
- Firebase SMS

## ⚙️ Kurulum

1. Repo'yu klonlayın:
\`\`\`bash
git clone https://github.com/yourusername/lyo-request.git
cd lyo-request
\`\`\`

2. Bağımlılıkları yükleyin:
\`\`\`bash
npm install
\`\`\`

3. Gerekli environment variable'ları ayarlayın:
\`\`\`env
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
GOOGLE_SHEETS_ID=your-sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email
GOOGLE_PRIVATE_KEY=your-private-key
\`\`\`

4. Development sunucusunu başlatın:
\`\`\`bash
npm run dev
\`\`\`

## 📱 SMS Doğrulama Sistemi

Sistem iki aşamalı doğrulama kullanır:
1. Veli girişi için SMS doğrulaması
2. İzin onayı için ikinci bir SMS doğrulaması

## 🔐 Güvenlik

- Tüm SMS kodları Redis'te şifreli olarak saklanır
- Oturum yönetimi güvenli çerezler ile yapılır
- Rate limiting ile brute force saldırılarına karşı koruma
- Tüm API endpointleri korumalıdır

## 📊 Google Sheets Entegrasyonu

Sistem tüm izin kayıtlarını otomatik olarak Google Sheets'e işler:
- Öğrenci bilgileri
- İzin talepleri
- Veli onayları
- Tarih ve saat damgaları

## 🌐 Deployment

Sistem Vercel üzerinde çalışacak şekilde optimize edilmiştir:
1. Vercel'de yeni proje oluşturun
2. Environment variable'ları ayarlayın
3. Deploy edin

## 🚧 Devam Eden Geliştirmeler

- [ ] UI/UX iyileştirmeleri
- [ ] Admin paneli geliştirmeleri
- [ ] İstatistik raporları
- [ ] Toplu SMS gönderimi
- [ ] Gelişmiş loglama sistemi

## 📄 Lisans

MIT

## 👥 Katkıda Bulunanlar

- [Adınız](https://github.com/yourusername)

## 📞 Destek

Sorularınız için issue açabilir veya doğrudan iletişime geçebilirsiniz. 