import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST requests allowed' });

  const { subject, message, customerDetails, total } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // ertugrulornek7@gmail.com
        pass: process.env.GMAIL_PASS  // yblniiqtlphiiwfp
      }
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // Bildirim size gelecek
      subject: subject,
      text: `${message}\n\nMüşteri: ${customerDetails.name}\nTelefon: ${customerDetails.phone}\nTutar: ${total} TL`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Email gönderildi.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}