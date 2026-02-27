import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Sadece POST desteklenir' });

  const { subject, message, customerDetails, total } = req.body;

  try {
    // ÇÖZÜM 2: Nodemailer ayarları Vercel Serverless ortamına uygun olarak güncellendi.
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL kullanımını zorunlu kılar
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS 
      }
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // Bildirim size geliyor
      subject: subject,
      text: `${message}\n\n-- MÜŞTERİ BİLGİLERİ --\nİsim: ${customerDetails.name}\nTelefon: ${customerDetails.phone}\nToplam Tutar: ${total} ₺`
    };

    // E-postanın gitmesini bekliyoruz
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Email gönderildi.' });
  } catch (error) {
    console.error("Mail Gönderim Hatası:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}