import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Sadece POST desteklenir' });

  const { subject, message, customerDetails, total } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465, // SSL portu
      secure: true, // Güvenli bağlantı şart
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS 
      }
    });

    // Gönderimi doğrulama adımı
    await transporter.verify();

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: subject,
      text: `${message}\n\n-- MÜŞTERİ BİLGİLERİ --\nİsim: ${customerDetails.name}\nTelefon: ${customerDetails.phone}\nToplam Tutar: ${total} ₺`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email gönderildi: " + info.response);
    
    res.status(200).json({ success: true, message: 'Email gönderildi.' });
  } catch (error) {
    console.error("Mail Gönderim Hatası:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}