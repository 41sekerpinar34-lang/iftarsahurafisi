import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Sadece POST desteklenir' });

  const { amount, orderId, customer, card } = req.body;
  const SX = process.env.PAYNKOLAY_SX;
  const SECRET_KEY = process.env.PAYNKOLAY_SECRET_KEY;

  const hostUrl = `https://${req.headers.host || 'iftarsahurafisi.vercel.app'}`;
  const successUrl = `${hostUrl}/?status=success`;
  const failUrl = `${hostUrl}/?status=fail`;
  
  const pad = (n) => n < 10 ? '0'+n : n;
  const now = new Date();
  const rnd = `${pad(now.getDate())}-${pad(now.getMonth()+1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // Tutar kesinlikle .00 formatında olmalı
  const formattedAmount = Number(amount).toFixed(2);

  const hashString = `${SX}|${orderId}|${formattedAmount}|${successUrl}|${failUrl}|${rnd}||${SECRET_KEY}`;
  const hashData = crypto.createHash('sha512').update(hashString).digest('base64');

  const params = new URLSearchParams();
  params.append('sx', SX);
  params.append('clientRefCode', orderId);
  params.append('successUrl', successUrl);
  params.append('failUrl', failUrl);
  params.append('amount', formattedAmount);
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
  params.append('currencyNumber', '949');

  try {
    const paynkolayRes = await fetch('https://paynkolay.nkolayislem.com.tr/Vpos/v1/Payment', {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: params.toString()
    });
    
    const textContent = await paynkolayRes.text();

    // Dönen yanıtı JSON olarak ayrıştırmayı dene
    try {
      const jsonRes = JSON.parse(textContent);
      // RESPONSE_CODE 2 = 3D Secure Hazırlık Başarılı
      if (jsonRes.RESPONSE_CODE === 2 || jsonRes.RESPONSE_CODE === "2") {
        return res.status(200).json({ htmlContent: jsonRes.BANK_REQUEST_MESSAGE || jsonRes.HTML_STRING });
      } else if (jsonRes.RESPONSE_CODE === 0 || jsonRes.RESPONSE_CODE === "0") {
        return res.status(400).json({ message: jsonRes.RESPONSE_DATA || "Kredi kartı işlemi reddedildi." });
      }
    } catch(e) {
      // Eğer JSON parse edilemezse (doğrudan HTML form döndüyse)
      return res.status(200).json({ htmlContent: textContent });
    }
    
    res.status(200).json({ htmlContent: textContent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}