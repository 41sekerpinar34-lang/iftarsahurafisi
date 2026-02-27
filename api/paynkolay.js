import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Sadece POST desteklenir' });

  const { amount, orderId, customer, card } = req.body;
  const SX = process.env.PAYNKOLAY_SX;
  const SECRET_KEY = process.env.PAYNKOLAY_SECRET_KEY;

  // Başarılı ve başarısız durumlarda kullanıcıyı sitemize (?status=success parametresiyle) geri yönlendiriyoruz.
  const hostUrl = `https://${req.headers.host || 'iftarsahurafisi.vercel.app'}`;
  const successUrl = `${hostUrl}/?status=success`;
  const failUrl = `${hostUrl}/?status=fail`;
  
  // Zaman Damgası Oluşturma (DD-MM-YYYY HH:mm:ss)
  const pad = (n) => n < 10 ? '0'+n : n;
  const now = new Date();
  const rnd = `${pad(now.getDate())}-${pad(now.getMonth()+1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // ÇÖZÜM 1: Tutarı Paynkolay'ın istediği gibi .00 (kuruşlu) formata zorluyoruz
  const formattedAmount = Number(amount).toFixed(2);

  // Şifreleme (Hash) İşlemi
  const hashString = `${SX}|${orderId}|${formattedAmount}|${successUrl}|${failUrl}|${rnd}||${SECRET_KEY}`;
  const hashData = crypto.createHash('sha512').update(hashString).digest('base64');

  // Form verilerini hazırlama
  const params = new URLSearchParams();
  params.append('sx', SX);
  params.append('clientRefCode', orderId);
  params.append('successUrl', successUrl);
  params.append('failUrl', failUrl);
  params.append('amount', formattedAmount); // Düzenlenmiş tutar gönderiliyor
  params.append('installmentNo', '1');
  params.append('cardHolderName', card.name);
  params.append('month', card.month);
  params.append('year', card.year);
  params.append('cvv', card.cvv);
  params.append('cardNumber', card.number);
  params.append('use3D', 'true');
  params.append('transactionType', 'SALES');
  params.append('rnd', rnd);
  params.append('hashDatav2', hashData);
  params.append('environment', 'API');
  params.append('currencyNumber', '949'); // TL

  try {
    // Gerçek Canlı (PROD) Ortam URL'sine İstek
    const paynkolayRes = await fetch('https://paynkolay.nkolayislem.com.tr/Vpos/v1/Payment', {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: params.toString()
    });
    
    // Paynkolay'ın gönderdiği yanıtı çek
    const htmlContent = await paynkolayRes.text();

    // Eğer HTML formu yerine bankadan dönen bir JSON Hata Mesajı varsa yakala ve kullanıcıya göster
    try {
      const jsonRes = JSON.parse(htmlContent);
      if (jsonRes.RESPONSE_CODE === 0) {
        return res.status(400).json({ message: jsonRes.RESPONSE_DATA || "Kredi kartı bilgilerinizde veya tutarda bir hata var." });
      }
    } catch (e) {
      // JSON parse edilemediyse başarılı bir 3D HTML formu dönmüş demektir, devam et.
    }
    
    res.status(200).json({ htmlContent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}