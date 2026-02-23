import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Phone, MapPin, CreditCard, Moon, Sun, Users, User, Building, CheckCircle, Share2, X, Landmark, Lock, Camera, Settings, LogOut, Save, Edit3, Loader2 } from 'lucide-react';

// Firebase Importları
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// ----------------------------------------------------------------------
// BURAYA KENDİ FİREBASE BİLGİLERİNİZİ YAPIŞTIRIN
// (Firebase Console > Project Settings > Web App kısmından aldığınız bilgiler)
// ----------------------------------------------------------------------
const fallbackFirebaseConfig = {
  apiKey: "AIzaSyAgpZAb7RnDh97R4nAM1Bvur5DnQiHn130",
  authDomain: "ramazaniftar-77d16.firebaseapp.com",
  projectId: "ramazaniftar-77d16",
  storageBucket: "ramazaniftar-77d16.firebasestorage.app",
  messagingSenderId: "308029182150",
  appId: "1:308029182150:web:c743edaf73e405212d07c7"
};

// Firebase Başlatma (Güvenli Çapraz Ortam Kurulumu)
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : fallbackFirebaseConfig;
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// İlk Kurulum Verileri (Eğer veritabanı boşsa bunlar yüklenecek)
const initialDonationOptions = [
  { id: 'iftar_1', order: 1, title: '1 Talebeye İftar', price: 400, type: 'iftar', imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=500&auto=format&fit=crop', desc: 'Bir talebenin günlük iftar bedeli' },
  { id: 'iftar_masa', order: 2, title: '1 Masaya İftar', price: 1200, type: 'iftar', imageUrl: 'https://images.unsplash.com/photo-1618218168350-6e7c81151b64?q=80&w=500&auto=format&fit=crop', desc: 'Bir masadaki talebelerin iftar bedeli' },
  { id: 'iftar_butun', order: 3, title: 'Bütün Talebeye İftar', price: 10000, type: 'iftar', imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=500&auto=format&fit=crop', desc: 'Tüm kursun günlük iftar bedeli' },
  { id: 'sahur_1', order: 4, title: '1 Talebeye Sahur', price: 200, type: 'sahur', imageUrl: 'https://images.unsplash.com/photo-1505346220862-2f311ebf6727?q=80&w=500&auto=format&fit=crop', desc: 'Bir talebenin günlük sahur bedeli' },
  { id: 'sahur_masa', order: 5, title: '1 Masaya Sahur', price: 400, type: 'sahur', imageUrl: 'https://images.unsplash.com/photo-1414235077428-338988a2e8c0?q=80&w=500&auto=format&fit=crop', desc: 'Bir masadaki talebelerin sahur bedeli' },
  { id: 'sahur_butun', order: 6, title: 'Bütün Talebeye Sahur', price: 5000, type: 'sahur', imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=500&auto=format&fit=crop', desc: 'Tüm kursun günlük sahur bedeli' }
];

export default function App() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationText, setNotificationText] = useState('');
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef(null);
  const [editingImageId, setEditingImageId] = useState(null);

  // --- 1. FIREBASE KİMLİK DOĞRULAMA (ANONİM) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Kimlik doğrulama hatası:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. VERİTABANINDAN VERİ ÇEKME ---
  useEffect(() => {
    if (!user) return;

    // Koleksiyon referansı
    const optionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'ramazan_options');

    const unsubscribe = onSnapshot(optionsRef, (snapshot) => {
      if (snapshot.empty) {
        // Eğer veritabanı boşsa, ilk varsayılan verileri yükle
        initialDonationOptions.forEach(async (opt) => {
          await setDoc(doc(optionsRef, opt.id), opt);
        });
      } else {
        // Veritabanından gelen güncel verileri ekrana yansıt
        const fetchedOptions = [];
        snapshot.forEach((doc) => {
          fetchedOptions.push({ id: doc.id, ...doc.data() });
        });
        
        // Sıralamaya göre diz
        fetchedOptions.sort((a, b) => a.order - b.order);
        setOptions(fetchedOptions);
        setLoading(false);
      }
    }, (error) => {
      console.error("Veri çekme hatası:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // URL Hash değişikliklerini dinle (Admin paneline giriş için)
  useEffect(() => {
    const checkAdminHash = () => setIsAdmin(window.location.hash === '#admin');
    checkAdminHash();
    window.addEventListener('hashchange', checkAdminHash);
    return () => window.removeEventListener('hashchange', checkAdminHash);
  }, []);

  // --- SEPET VE KULLANICI FONKSİYONLARI ---

  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem);
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
    
    setNotificationText(`${item.title} eklendi.`);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const updateQuantity = (id, delta) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === id) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => setCart((prevCart) => prevCart.filter((item) => item.id !== id));

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleShare = async () => {
    const text = `Şekerpınar Nazmi Balcı Erkek Öğrenci Yurdu Ramazan-ı Şerif İftar ve Sahur kampanyasına sen de destek ol!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'İftar ve Sahur Bağışı', text: text, url: window.location.href.replace('#admin', '') });
      } catch (err) {
        console.log('Paylaşım iptal edildi.', err);
      }
    } else {
      navigator.clipboard.writeText(text + " " + window.location.href.replace('#admin', ''));
      alert("Bağlantı kopyalandı!");
    }
  };

  // --- ADMİN FONKSİYONLARI (FİREBASE KAYITLI) ---

  const handleImageEditClick = (id) => {
    setEditingImageId(id);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Resmi Base64 formatına çevirip veritabanına kaydetmek için FileReader kullanıyoruz
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        updateOption(editingImageId, 'imageUrl', base64String);
      };
      reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = '';
  };

  const updateOption = async (id, field, value) => {
    // 1. Ekranı anında güncelle (hızlı deneyim için)
    setOptions(prevOptions => 
      prevOptions.map(opt => 
        opt.id === id ? { ...opt, [field]: field === 'price' ? Number(value) : value } : opt
      )
    );

    // 2. Firebase'e Kalıcı Olarak Kaydet
    if (user) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'ramazan_options', id);
        await setDoc(docRef, { [field]: field === 'price' ? Number(value) : value }, { merge: true });
      } catch (error) {
        console.error("Güncelleme hatası: ", error);
        alert("Bir hata oluştu, lütfen sayfayı yenileyip tekrar deneyin.");
      }
    }
  };

  const exitAdmin = () => {
    window.location.hash = ''; // Hash'i temizle, ana sayfaya dön
  };

  // Yükleme Ekranı
  if (loading) {
    return (
      <div className="min-h-screen bg-[#071d15] flex flex-col items-center justify-center text-[#d4af37] gap-4">
        <Loader2 className="w-12 h-12 animate-spin" />
        <h2 className="text-xl font-bold tracking-widest">Afiş Yükleniyor...</h2>
      </div>
    );
  }

  // --- ADMİN PANELİ GÖRÜNÜMÜ ---
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#05150f] font-sans text-gray-100 p-4 md:p-8">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        
        <div className="max-w-5xl mx-auto">
          {/* Admin Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-[#0a2e21] p-6 rounded-2xl border border-[#d4af37]/30 shadow-xl gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#d4af37] p-3 rounded-full text-[#05150f]">
                <Settings className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#d4af37]">Afiş Yönetim Paneli</h1>
                <p className="text-gray-400 text-sm">Bağış kutucuklarını, fiyatları ve resimleri buradan düzenleyebilirsiniz.</p>
              </div>
            </div>
            <button 
              onClick={exitAdmin}
              className="bg-[#0f3626] border border-[#d4af37]/50 px-6 py-3 rounded-xl text-[#d4af37] font-bold flex items-center gap-2 hover:bg-[#114b32] transition-colors whitespace-nowrap"
            >
              <LogOut className="w-5 h-5" /> Siteye Dön
            </button>
          </div>

          {/* Uyarı Mesajı */}
          <div className="bg-green-900/20 border border-green-500/30 text-green-200 p-4 rounded-xl mb-8 flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              <strong>Bulut Bağlantısı Aktif!</strong> Yaptığınız tüm resim, isim ve fiyat değişiklikleri anında veritabanına kaydedilir. Sitenize giren tüm kullanıcılar otomatik olarak en güncel halini görecektir. <i>(İpucu: Resimlerinizi yüklerken çok büyük boyutlu olmamasına özen gösterin).</i>
            </p>
          </div>

          {/* İçerik Düzenleyici */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Bağış Seçenekleri (Kartlar)</h2>
            
            {options.map((option) => (
              <div key={option.id} className="bg-[#0c2a1e] border border-[#d4af37]/20 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start shadow-lg">
                
                {/* Resim Düzenleme Kısmı */}
                <div className="w-full md:w-1/3 flex flex-col gap-3">
                  <div className="relative h-48 rounded-lg overflow-hidden border-2 border-[#114b32] group bg-black">
                    <img src={option.imageUrl} alt={option.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleImageEditClick(option.id)}
                        className="bg-[#d4af37] text-[#05150f] font-bold py-2 px-4 rounded-full flex items-center gap-2 transform hover:scale-105 transition-transform"
                      >
                        <Camera className="w-5 h-5" /> Resmi Değiştir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Metin Düzenleme Kısmı */}
                <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-xs text-gray-400 mb-1 block">Başlık</label>
                    <div className="relative">
                      <Edit3 className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                      <input 
                        type="text" 
                        value={option.title}
                        onChange={(e) => updateOption(option.id, 'title', e.target.value)}
                        className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-2.5 pl-10 text-white focus:outline-none focus:border-[#d4af37]" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Fiyat (₺)</label>
                    <input 
                      type="number" 
                      value={option.price}
                      onChange={(e) => updateOption(option.id, 'price', e.target.value)}
                      className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#d4af37] font-mono" 
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Tür</label>
                    <select 
                      value={option.type}
                      onChange={(e) => updateOption(option.id, 'type', e.target.value)}
                      className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="iftar">İftar</option>
                      <option value="sahur">Sahur</option>
                    </select>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="text-xs text-gray-400 mb-1 block">Açıklama (İsteğe Bağlı)</label>
                    <textarea 
                      value={option.desc}
                      onChange={(e) => updateOption(option.id, 'desc', e.target.value)}
                      rows="2"
                      className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#d4af37] resize-none" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- ANA KULLANICI GÖRÜNÜMÜ ---
  return (
    <div className="min-h-screen bg-[#071d15] font-sans text-gray-100 relative overflow-hidden flex justify-center">

      {/* Arka Plan Süslemeleri */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#d4af37] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#d4af37] rounded-full blur-[120px]"></div>
      </div>

      {/* Ana Konteyner - Afiş Görünümü */}
      <div className="w-full max-w-3xl bg-gradient-to-b from-[#0a2e21] to-[#05150f] shadow-2xl relative z-10 min-h-screen flex flex-col border-x-4 border-[#d4af37]/30">
        
        {/* Üst Kısım - Başlıklar */}
        <header className="text-center pt-8 pb-4 px-4 relative">
          <Moon className="absolute top-6 left-6 text-[#d4af37] w-12 h-12 opacity-80" />
          <Sun className="absolute top-6 right-6 text-[#d4af37] w-12 h-12 opacity-80 animate-spin-slow" style={{ animationDuration: '20s' }} />
          
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#d4af37] mb-2 tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            ŞEKERPINAR
          </h1>
          <h2 className="text-lg md:text-xl font-semibold text-white tracking-widest border-y-2 border-[#d4af37] inline-block py-2 px-6 mb-4">
            NAZMİ BALCI ERKEK ÖĞRENCİ YURDU
          </h2>
          <div className="bg-[#114b32] border border-[#d4af37]/50 rounded-full py-2 px-4 mx-auto max-w-lg shadow-lg">
            <h3 className="text-[#d4af37] font-bold text-lg md:text-xl">RAMAZAN-I ŞERİF İFTAR VE SAHUR</h3>
            <p className="text-white text-sm">KAYITLARIMIZ DEVAM EDİYOR</p>
          </div>
        </header>

        {/* Bağış Seçenekleri Izgarası */}
        <main className="flex-grow p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {options.map((option) => (
              <div 
                key={option.id}
                onClick={() => addToCart(option)}
                className="bg-[#0c2a1e] border border-[#d4af37]/50 rounded-2xl p-2 flex flex-col items-center cursor-pointer transform transition-all hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(212,175,55,0.2)] relative group"
              >
                {/* Kart Başlığı */}
                <div className="bg-gradient-to-r from-[#e8c678] via-[#d4af37] to-[#b38f25] w-full text-center py-2 rounded-t-xl mb-2 shadow-sm">
                  <h4 className="font-bold text-sm md:text-base text-[#05150f]">{option.title}</h4>
                </div>
                
                {/* Resim Alanı */}
                <div className="w-full h-40 bg-[#05150f] rounded-lg overflow-hidden relative border-2 border-[#114b32] group-hover:border-[#d4af37]/70 transition-colors">
                  <img 
                    src={option.imageUrl} 
                    alt={option.title} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                  />
                  {/* Karartma Efekti */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                
                {/* Fiyat Etiketi */}
                <div className="mt-[-20px] bg-[#05150f] border-2 border-[#d4af37] text-[#d4af37] font-bold text-xl py-1.5 px-6 rounded-full shadow-lg flex items-center justify-center gap-2 relative z-10 w-11/12 group-hover:bg-[#d4af37] group-hover:text-[#05150f] transition-colors">
                  {option.price.toLocaleString('tr-TR')} ₺
                  <Plus className="w-5 h-5 opacity-80" />
                </div>

                {/* Eğer sepette varsa ufak bir rozet göster */}
                {cart.find(c => c.id === option.id) && (
                  <div className="absolute -top-3 -right-3 bg-red-600 text-white text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full border-2 border-[#05150f] shadow-lg animate-bounce">
                    {cart.find(c => c.id === option.id).quantity}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Hadis-i Şerif */}
          <div className="mt-8 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg p-6 text-center shadow-inner relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a2e21] px-4">
              <span className="text-[#d4af37] text-2xl">❝</span>
            </div>
            <p className="text-[#d4af37] font-medium text-lg italic leading-relaxed">
              "Kim bir oruçluya iftar ettirirse, ona (oruçlunun) sevabı kadar sevap verilir. Oruçlunun sevabından da hiçbir şey eksilmez."
            </p>
            <p className="text-gray-400 text-sm mt-2">(Tirmizi, Savm 82; İbn Mâce, Sıyâm 45) <strong className="text-white">Hadis-i Şerif</strong></p>
          </div>
        </main>

        {/* Alt Kısım - İletişim ve IBAN */}
        <footer className="bg-[#05150f] p-6 border-t border-[#d4af37]/30 flex flex-col gap-4 relative z-20">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-[#d4af37]">
            <div className="flex items-center gap-2 bg-[#0f3626] py-2 px-6 rounded-full border border-[#d4af37]/20 shadow-md">
              <Phone className="w-5 h-5" />
              <span className="font-bold tracking-wider">0505 916 80 33</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-center text-gray-300 bg-[#0f3626] py-3 px-4 rounded-lg border border-[#d4af37]/20">
            <MapPin className="w-5 h-5 text-[#d4af37] shrink-0" />
            <span className="text-sm">Cumhuriyet, Namık Kemal Cd. No:25, 41444 Çayırova/Kocaeli</span>
          </div>

          <div className="bg-gradient-to-r from-[#114b32] to-[#0f3626] border-2 border-[#d4af37] p-4 rounded-xl text-center shadow-lg relative overflow-hidden mt-2">
            <div className="absolute -right-4 -top-4 opacity-10">
              <Building className="w-24 h-24" />
            </div>
            <div className="flex flex-col md:flex-row items-center justify-center gap-3">
              <CreditCard className="w-8 h-8 text-[#d4af37] shrink-0" />
              <div>
                <p className="text-[#d4af37] font-semibold text-xs mb-1 uppercase tracking-wider">
                  Şekerpınar Eğitim Çağındaki Öğrencilere Yardım Derneği
                </p>
                <div className="flex items-center justify-center gap-2 bg-[#05150f]/50 py-1.5 px-3 rounded mt-1">
                  <span className="text-[#d4af37] font-bold text-sm">TR</span>
                  <span className="text-white font-mono text-base md:text-lg font-bold tracking-widest break-all">
                    78 0021 0000 0003 3265 5000 01
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Sabit Alt Butonlar (Sepet & Paylaş) */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <button 
          onClick={handleShare}
          className="bg-[#0f3626] text-[#d4af37] border border-[#d4af37] p-4 rounded-full shadow-xl hover:bg-[#154a35] transition-colors flex items-center justify-center"
        >
          <Share2 className="w-6 h-6" />
        </button>
        
        <button 
          onClick={() => setIsCartOpen(true)}
          className="bg-gradient-to-r from-[#d4af37] to-[#b38f25] text-[#05150f] p-4 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-105 transition-transform flex items-center justify-center relative"
        >
          <ShoppingCart className="w-8 h-8" />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full border-2 border-[#05150f]">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* Tost Bildirimi */}
      {showNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#d4af37] text-[#05150f] px-6 py-3 rounded-full font-bold shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-5 h-5" />
          {notificationText}
        </div>
      )}

      {/* Sepet / Bağış Paneli Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-[#0a2e21] h-full shadow-2xl flex flex-col border-l border-[#d4af37]/30 animate-slide-left">
            
            {/* Modal Başlık */}
            <div className="p-5 border-b border-[#d4af37]/20 flex justify-between items-center bg-[#05150f]">
              <h2 className="text-2xl font-bold text-[#d4af37] flex items-center gap-2">
                <ShoppingCart /> Bağış Listem
              </h2>
              <button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* Modal İçerik */}
            <div className="flex-grow overflow-y-auto p-5">
              {checkoutStep === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                      <ShoppingCart className="w-16 h-16 opacity-20" />
                      <p className="text-lg">Henüz bağış seçmediniz.</p>
                      <button 
                        onClick={() => setIsCartOpen(false)}
                        className="text-[#d4af37] border border-[#d4af37] px-6 py-2 rounded-full hover:bg-[#d4af37]/10 transition-colors"
                      >
                        Seçenekleri Gör
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={item.id} className="bg-[#0f3626] border border-[#d4af37]/30 rounded-lg p-4 flex flex-col gap-3 shadow-md">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <img src={item.imageUrl} alt={item.title} className="w-12 h-12 rounded object-cover border border-[#d4af37]/30" />
                              <div>
                                <h3 className="text-white font-bold">{item.title}</h3>
                                <p className="text-[#d4af37] font-semibold text-xs">Birim: {item.price.toLocaleString('tr-TR')} ₺</p>
                              </div>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 p-1">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-3 bg-[#05150f] rounded-full px-2 py-1">
                              <button 
                                onClick={() => updateQuantity(item.id, -1)}
                                className="bg-[#114b32] w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-[#155d3f]"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="font-bold text-lg w-6 text-center text-white">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, 1)}
                                className="bg-[#d4af37] w-8 h-8 rounded-full flex items-center justify-center text-[#05150f] hover:bg-[#e8c678]"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="text-xl font-bold text-[#d4af37]">
                              {(item.price * item.quantity).toLocaleString('tr-TR')} ₺
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ÖDEME SEÇENEKLERİ EKRANI */}
              {checkoutStep === 'payment' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Sekmeler */}
                  <div className="flex gap-2 p-1 bg-[#05150f] rounded-lg border border-[#d4af37]/20">
                    <button 
                      onClick={() => setPaymentMethod('credit_card')}
                      className={`flex-1 py-3 px-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'credit_card' ? 'bg-[#d4af37] text-[#05150f]' : 'text-gray-400 hover:text-white'}`}
                    >
                      <CreditCard className="w-4 h-4" /> Kredi Kartı
                    </button>
                    <button 
                      onClick={() => setPaymentMethod('transfer')}
                      className={`flex-1 py-3 px-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'transfer' ? 'bg-[#d4af37] text-[#05150f]' : 'text-gray-400 hover:text-white'}`}
                    >
                      <Landmark className="w-4 h-4" /> Havale/EFT
                    </button>
                  </div>

                  {paymentMethod === 'credit_card' ? (
                    // KREDİ KARTI FORMU
                    <div className="bg-[#0f3626] p-5 rounded-xl border border-[#d4af37]/30 shadow-lg space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[#d4af37] font-bold">Kart Bilgileri</h3>
                        <div className="flex gap-1">
                          <div className="w-8 h-5 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold">VISA</div>
                          <div className="w-8 h-5 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold">MASTER</div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Kart Üzerindeki İsim</label>
                        <input type="text" placeholder="Ad Soyad" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]" />
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Kart Numarası</label>
                        <input type="text" placeholder="0000 0000 0000 0000" maxLength="19" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37] font-mono" />
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs text-gray-400 mb-1 block">Son Kul. (AA/YY)</label>
                          <input type="text" placeholder="MM/YY" maxLength="5" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37] text-center" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-400 mb-1 block">CVC</label>
                          <input type="text" placeholder="123" maxLength="3" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37] text-center" />
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-gray-400">
                        <Lock className="w-4 h-4 text-[#d4af37]" />
                        <span>Ödemeleriniz 256-bit SSL sertifikası ile korunmaktadır.</span>
                      </div>
                    </div>
                  ) : (
                    // HAVALE / EFT BİLGİLERİ
                    <div className="bg-[#0f3626] p-5 rounded-xl border border-[#d4af37]/30 shadow-lg">
                      <h3 className="text-[#d4af37] font-bold mb-2 flex items-center gap-2">
                        <Landmark className="w-5 h-5" /> Banka Hesap Bilgileri
                      </h3>
                      <p className="text-sm text-gray-300 mb-4">Lütfen aşağıdaki IBAN numarasına toplam tutarı gönderiniz. Açıklama kısmına "Ramazan Bağışı - Adınız Soyadınız" yazmayı unutmayınız.</p>
                      
                      <div className="bg-[#05150f] p-4 rounded-lg border border-[#d4af37]/20 relative">
                        <p className="text-xs text-gray-400 mb-1">Alıcı Adı:</p>
                        <p className="text-[#d4af37] text-sm font-semibold mb-4 leading-tight">Şekerpınar Eğitim Çağındaki Öğrencilere Yardım Derneği</p>
                        <p className="text-xs text-gray-400 mb-1">IBAN:</p>
                        <div className="bg-[#114b32]/50 p-2 rounded flex items-center justify-between">
                          <p className="text-white font-mono font-bold tracking-wider select-all cursor-pointer text-sm md:text-base">
                            TR78 0021 0000 0003 3265 5000 01
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-[#0f3626] p-4 rounded-xl border border-[#d4af37]/30 space-y-4">
                    <h3 className="text-[#d4af37] font-bold text-sm">İletişim Bilgileriniz</h3>
                    <input type="text" placeholder="Adınız Soyadınız" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]" />
                    <input type="tel" placeholder="Telefon Numaranız" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]" />
                  </div>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                  <div className="w-24 h-24 bg-[#d4af37] rounded-full flex items-center justify-center text-[#05150f] shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                    <CheckCircle className="w-16 h-16" />
                  </div>
                  <h2 className="text-3xl font-bold text-[#d4af37]">Allah Kabul Etsin</h2>
                  <p className="text-gray-300">
                    {paymentMethod === 'credit_card' 
                      ? "Bağış işleminiz başarıyla gerçekleştirildi. Makbuzunuz SMS ile iletilecektir." 
                      : "Bağış niyetiniz alınmıştır. Havale/EFT işlemini gerçekleştirdikten sonra bağışınız kursumuza ulaşacaktır."}
                  </p>
                  <p className="text-sm text-[#d4af37] font-semibold bg-[#114b32] px-4 py-2 rounded-full">
                    Bize destek olduğunuz için teşekkür ederiz.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Alt Kısım (Toplam ve Buton) */}
            {cart.length > 0 && checkoutStep !== 'success' && (
              <div className="p-5 border-t border-[#d4af37]/30 bg-[#05150f]">
                <div className="flex justify-between items-center mb-4 bg-[#0f3626] p-3 rounded-lg border border-[#d4af37]/20">
                  <span className="text-gray-300 font-semibold">Toplam Bağış:</span>
                  <span className="text-2xl font-bold text-[#d4af37]">{totalAmount.toLocaleString('tr-TR')} ₺</span>
                </div>
                
                {checkoutStep === 'cart' ? (
                  <button 
                    onClick={() => setCheckoutStep('payment')}
                    className="w-full bg-gradient-to-r from-[#d4af37] to-[#b38f25] text-[#05150f] font-bold text-lg py-4 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-[1.02] transition-transform"
                  >
                    Bağışı Tamamla
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setCheckoutStep('cart')}
                      className="w-1/3 bg-[#0f3626] text-white font-bold py-4 rounded-xl border border-[#d4af37]/30 hover:bg-[#114b32]"
                    >
                      Geri
                    </button>
                    <button 
                      onClick={() => {
                        setCheckoutStep('success');
                        setTimeout(() => {
                          setCart([]);
                        }, 3000);
                      }}
                      className="w-2/3 bg-gradient-to-r from-[#d4af37] to-[#b38f25] text-[#05150f] font-bold text-lg py-4 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                      {paymentMethod === 'credit_card' ? 'Ödemeyi Tamamla' : 'Niyet Ettim'}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {checkoutStep === 'success' && (
              <div className="p-5 bg-[#05150f]">
                 <button 
                    onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }}
                    className="w-full bg-[#0f3626] text-[#d4af37] border border-[#d4af37]/50 font-bold text-lg py-4 rounded-xl hover:bg-[#114b32] transition-colors"
                  >
                    Ana Sayfaya Dön
                  </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tailwind Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-left {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-left {
          animation: slide-left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}} />
    </div>
  );
}