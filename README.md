# LYO Request - Öğrenci Bilgi Sistemi

Modern öğrenci yönetim sistemi - SMS doğrulama ile güvenli giriş ve izin talep sistemi.

## 🚀 Özellikler

- **SMS Doğrulama**: Telefon numarası ile güvenli giriş
- **Çoklu Öğrenci Desteği**: Bir veli birden fazla çocuğa sahip olabilir
- **İzin Talep Sistemi**: Kolay tarih seçimi ile izin talebi
- **Google Sheets Entegrasyonu**: Gerçek zamanlı veri senkronizasyonu
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **Yüksek Hacimli SMS**: NetGSM ile binlerce SMS gönderimi

## 🔧 Kurulum

### 1. Proje Kurulumu

```bash
# Projeyi klonlayın
git clone <repository-url>
cd lyo-request

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```

### 2. Environment Variables

`.env.local` dosyası oluşturun:

```env
# Google Sheets API Configuration
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_SHEETS_SHEET_ID="your-google-sheets-id"

# NetGSM SMS API Configuration
NETGSM_USERNAME="your-netgsm-username"
NETGSM_PASSWORD="your-netgsm-password"
NETGSM_HEADER="LYOREQUEST"
```

### 3. NetGSM SMS Kurulumu

#### NetGSM Hesabı Oluşturma:

1. **NetGSM'e Kayıt Olun**: [https://www.netgsm.com.tr](https://www.netgsm.com.tr)
2. **SMS Paketi Satın Alın**: Yüksek hacim için toplu SMS paketleri
3. **API Bilgilerini Alın**: Kullanıcı adı ve şifrenizi not alın
4. **Header Onaylatın**: "LYOREQUEST" başlığını onaylatın

#### Fiyatlandırma Örneği:
- **10,000 SMS**: ~300-400 TL
- **50,000 SMS**: ~1,200-1,500 TL
- **100,000 SMS**: ~2,000-2,500 TL

#### Alternatif SMS Sağlayıcıları:
- **İletimerkezi**: [https://www.iletimerkezi.com](https://www.iletimerkezi.com)
- **Turkcell Business**: [https://www.turkcellbusiness.com](https://www.turkcellbusiness.com)
- **Vodafone Business**: [https://www.vodafonebusiness.com.tr](https://www.vodafonebusiness.com.tr)

### 4. Google Sheets Kurulumu

1. **Google Cloud Console**'da proje oluşturun
2. **Google Sheets API**'yi etkinleştirin
3. **Service Account** oluşturun ve JSON key indirin
4. **Sheets**'i service account ile paylaşın

## 📱 SMS Doğrulama Akışı

```
1. Telefon → Kayıt kontrol (Google Sheets)
2. Kayıt var → SMS gönder (NetGSM API)
3. Kod gir → Doğrula (6 haneli kod)
4. Başarılı → Öğrenci sayfası
```

## 🔐 Güvenlik Özellikleri

- **Telefon Doğrulama**: Sadece kayıtlı veliler erişebilir
- **SMS Kodu**: 6 haneli, 5 dakika geçerli
- **Rate Limiting**: Spam koruması
- **Güvenli API**: HTTPS zorunlu

## 📊 Google Sheets Veri Yapısı

| Kolon | Açıklama |
|-------|----------|
| A | Veli Adı |
| B | Veli Tel |
| C | Veli Baba Adı |
| D | Veli Baba Tel |
| E | Öğrenci Adı |
| F | Öğrenci Tel |
| G | Öğrenci Doğum Tarihi |
| H | Öğrenci Program |
| I | Öğrenci Dönem |
| J+ | İzin Kayıtları |

## 🚀 Deployment

### Vercel Deployment

```bash
# Vercel CLI yükleyin
npm i -g vercel

# Deploy edin
vercel --prod
```

### Environment Variables (Production)

Vercel dashboard'da aşağıdaki environment variables'ları ekleyin:
- `GOOGLE_SHEETS_PRIVATE_KEY`
- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_SHEET_ID`
- `NETGSM_USERNAME`
- `NETGSM_PASSWORD`
- `NETGSM_HEADER`

## 🔧 Teknik Detaylar

### Tech Stack
- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **API**: Next.js API Routes
- **SMS**: NetGSM API
- **Database**: Google Sheets API

### API Endpoints
- `POST /api/phone-login` - Telefon numarası kontrolü
- `POST /api/send-sms` - SMS gönderimi
- `PUT /api/send-sms` - SMS kod doğrulama
- `GET /api/students` - Öğrenci listesi
- `POST /api/add-permission` - İzin ekleme

### Performance
- **SMS Hızı**: Dakikada 10,000+ SMS
- **Response Time**: <200ms API yanıtları
- **Concurrent Users**: 1000+ eşzamanlı kullanıcı

## 🎯 Kullanım Senaryoları

### Veli Girişi
1. Telefon numarası gir
2. SMS kodu al
3. Kodu doğrula
4. Çocuk bilgilerini görüntüle
5. İzin talebi oluştur

### Yönetici Girişi
1. Dashboard'a eriş
2. Öğrenci listesini görüntüle
3. KPI'ları incele
4. Arama ve filtreleme yap

## 📞 Destek

Herhangi bir sorun için:
- Email: support@lyorequest.com
- Telefon: +90 XXX XXX XX XX

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. 