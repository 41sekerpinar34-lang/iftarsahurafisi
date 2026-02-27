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

  // Şifreleme (Hash) İşlemi (Dokümantasyona göre)
  // sx + "|" + clientRefCode + "|" + amount + "|" + successUrl + "|" + failUrl + "|" + rnd + "|" + customerKey + "|" + merchantSecretKey
  const hashString = `${SX}|${orderId}|${amount}|${successUrl}|${failUrl}|${rnd}||${SECRET_KEY}`;
  const hashData = crypto.createHash('sha512').update(hashString).digest('base64');

  // Form verilerini hazırlama
  const params = new URLSearchParams();
  params.append('sx', SX);
  params.append('clientRefCode', orderId);
  params.append('successUrl', successUrl);
  params.append('failUrl', failUrl);
  params.append('amount', amount.toString());
  params.append('installmentNo', '1');
  params.append('cardHolderName', card.name);
  params.append('month', card.month);
  params.append('year', card.year);
  params.append('cvv', card.cvv);
  params.append('cardNumber', card.number);
  params.append('use3D', 'true'); // 3D Secure Şart
  params.append('transactionType', 'SALES');
  params.append('rnd', rnd);
  params.append('hashDatav2', hashData);
  params.append('environment', 'API');
  params.append('currencyNumber', '949'); // TL

  try {
    const paynkolayRes = await fetch('https://paynkolay.nkolayislem.com.tr/Vpos/v1/Payment', {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: params.toString()
    });
    
    // Paynkolay'ın gönderdiği 3D formunu çek
    const htmlContent = await paynkolayRes.text();
    
    res.status(200).json({ htmlContent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}