import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Phone, MapPin, CreditCard, Moon, Sun, Users, User, Building, CheckCircle, Share2, X, Landmark, Lock, Camera, Settings, LogOut, Save, Edit3, Loader2, AlertTriangle, MessageCircle, List, Check, XCircle, CreditCard as CardIcon, Link } from 'lucide-react';

// Firebase Importları
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

const fallbackFirebaseConfig = {
  apiKey: "AIzaSyAgpZAb7RnDh97R4nAM1Bvur5DnQiHn130",
  authDomain: "ramazaniftar-77d16.firebaseapp.com",
  projectId: "ramazaniftar-77d16",
  storageBucket: "ramazaniftar-77d16.firebasestorage.app",
  messagingSenderId: "308029182150",
  appId: "1:308029182150:web:c743edaf73e405212d07c7"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : fallbackFirebaseConfig;
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// İstenilen Varsayılan Fiyatlandırmalar
const initialDonationOptions = [
  { id: 'iftar_1', order: 1, title: '1 Talebeye İftar', price: 400, type: 'iftar', imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=500&auto=format&fit=crop', desc: 'Bir talebenin günlük iftar bedeli' },
  { id: 'iftar_masa', order: 2, title: '1 Masaya İftar', price: 1600, type: 'iftar', imageUrl: 'https://images.unsplash.com/photo-1618218168350-6e7c81151b64?q=80&w=500&auto=format&fit=crop', desc: 'Bir masadaki talebelerin iftar bedeli' },
  { id: 'iftar_butun', order: 3, title: 'Bütün Talebeye İftar', price: 2000, type: 'iftar', imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=500&auto=format&fit=crop', desc: 'Tüm kursun günlük iftar bedeli' },
  { id: 'sahur_1', order: 4, title: '1 Talebeye Sahur', price: 200, type: 'sahur', imageUrl: 'https://images.unsplash.com/photo-1505346220862-2f311ebf6727?q=80&w=500&auto=format&fit=crop', desc: 'Bir talebenin günlük sahur bedeli' },
  { id: 'sahur_masa', order: 5, title: '1 Masaya Sahur', price: 800, type: 'sahur', imageUrl: 'https://images.unsplash.com/photo-1414235077428-338988a2e8c0?q=80&w=500&auto=format&fit=crop', desc: 'Bir masadaki talebelerin sahur bedeli' },
  { id: 'sahur_butun', order: 6, title: 'Bütün Talebeye Sahur', price: 10000, type: 'sahur', imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=500&auto=format&fit=crop', desc: 'Tüm kursun günlük sahur bedeli' }
];

export default function App() {
  const [options, setOptions] = useState(initialDonationOptions); 
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [urlGroupId, setUrlGroupId] = useState(null);

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationText, setNotificationText] = useState('');
  const [checkoutStep, setCheckoutStep] = useState('cart'); 
  const [paymentMethod, setPaymentMethod] = useState('credit_card'); 
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  
  const [cardInfo, setCardInfo] = useState({ name: '', number: '', month: '', year: '', cvv: '' });
  const [paynkolayHtml, setPaynkolayHtml] = useState(''); 

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState('donations');
  const [selectedAdminGroup, setSelectedAdminGroup] = useState('default');
  const [customGroups, setCustomGroups] = useState([]);
  const fileInputRef = useRef(null);
  const [editingImageId, setEditingImageId] = useState(null);
  const [donationsList, setDonationsList] = useState([]); 

  // Yüklenme (Loading) State'i eklendi
  const [isDataLoading, setIsDataLoading] = useState(true);

  // --- 1. KİMLİK DOĞRULAMA VE URL KONTROLÜ ---
  useEffect(() => {
    // ÇÖZÜM 3: HTML Siteleri için ?grup=10 parametresini yakalama
    const searchParams = new URLSearchParams(window.location.search);
    let potentialGroup = searchParams.get('grup') || searchParams.get('group') || searchParams.get('id');

    // Eğer parametre yoksa, klasik /10 (Vercel) yolunu da destekle
    if (!potentialGroup) {
      const path = window.location.pathname;
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (!lastPart.includes('.html') && lastPart !== 'admin') {
          potentialGroup = lastPart;
        }
      }
    }

    if (potentialGroup) {
      setUrlGroupId(potentialGroup);
    }

    // Paynkolay 3D Başarılı Dönüş Kontrolü
    if (searchParams.get('status') === 'success') {
      setIsCartOpen(true);
      setCheckoutStep('success');
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Kimlik doğrulama hatası:", error);
      } finally {
        setAuthChecked(true);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. VERİ ÇEKME İŞLEMLERİ ---
  useEffect(() => {
    if (!user) return; 

    const activeGroupId = isAdmin && selectedAdminGroup !== 'default' ? selectedAdminGroup : (urlGroupId || 'default');
    
    let optionsRef;
    if (activeGroupId === 'default') {
      optionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'ramazan_options');
    } else {
      optionsRef = collection(db, 'artifacts', appId, 'public', 'data', `ramazan_group_${activeGroupId}`);
    }

    const unsubOptions = onSnapshot(optionsRef, (snapshot) => {
      if (snapshot.empty && activeGroupId === 'default') {
        initialDonationOptions.forEach(async (opt) => {
          try { await setDoc(doc(optionsRef, opt.id), opt); } catch(err) { }
        });
        setIsDataLoading(false); // Yükleme bitti
      } else {
        const fetchedOptionsMap = {};
        snapshot.forEach((doc) => { fetchedOptionsMap[doc.id] = doc.data(); });
        const mergedOptions = initialDonationOptions.map(initialOpt => ({ ...initialOpt, ...(fetchedOptionsMap[initialOpt.id] || {}) }));
        mergedOptions.sort((a, b) => a.order - b.order);
        setOptions(mergedOptions);
        setIsDataLoading(false); // Yükleme bitti
      }
    });

    let unsubDonations = () => {};
    let unsubGroups = () => {};
    
    if (isAdmin) {
      const donationsRef = collection(db, 'artifacts', appId, 'public', 'data', 'ramazan_donations');
      unsubDonations = onSnapshot(donationsRef, (snapshot) => {
        const data = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setDonationsList(data);
      });

      const groupsRef = collection(db, 'artifacts', appId, 'public', 'data', 'ramazan_group_list');
      unsubGroups = onSnapshot(groupsRef, (snapshot) => {
        const list = [];
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setCustomGroups(list);
      });
    }

    return () => { unsubOptions(); unsubDonations(); unsubGroups(); };
  }, [user, isAdmin, selectedAdminGroup, urlGroupId]);

  useEffect(() => {
    const checkAdminHash = () => setIsAdmin(window.location.hash === '#admin');
    checkAdminHash();
    window.addEventListener('hashchange', checkAdminHash);
    return () => window.removeEventListener('hashchange', checkAdminHash);
  }, []);

  // --- SEPET FONKSİYONLARI ---
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

  const updateQuantity = (id, delta) => setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item));
  const removeFromCart = (id) => setCart(prev => prev.filter((item) => item.id !== id));
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleShare = async () => {
    const text = `Şekerpınar Nazmi Balcı Erkek Öğrenci Yurdu Ramazan-ı Şerif İftar ve Sahur kampanyasına sen de destek ol!`;
    const link = window.location.href.replace('#admin', '');
    if (navigator.share) {
      try { await navigator.share({ title: 'İftar ve Sahur Bağışı', text: text, url: link }); } catch (err) {}
    } else {
      navigator.clipboard.writeText(text + " " + link);
      alert("Bağlantı kopyalandı!");
    }
  };

  // --- ÖDEME VE API FONKSİYONLARI ---
  const handleCheckoutSubmit = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      alert("Lütfen adınızı ve telefon numaranızı giriniz.");
      return;
    }

    if (!user) { alert("Veritabanı bağlantı hatası!"); return; }

    const donationData = {
      customerInfo,
      items: cart,
      totalAmount,
      paymentMethod,
      groupId: urlGroupId || 'default',
      status: 'pending', 
      createdAt: serverTimestamp(),
    };

    if (paymentMethod === 'credit_card') {
      if (!cardInfo.name || !cardInfo.number || !cardInfo.month || !cardInfo.year || !cardInfo.cvv) {
        alert("Lütfen kredi kartı bilgilerini eksiksiz giriniz."); return;
      }
      
      try {
        setCheckoutStep('paynkolay_3d'); 
        
        const donationsRef = collection(db, 'artifacts', appId, 'public', 'data', 'ramazan_donations');
        const docRef = await addDoc(donationsRef, donationData);

        const response = await fetch('/api/paynkolay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmount,
            orderId: docRef.id, 
            customer: customerInfo,
            card: cardInfo
          })
        });

        const data = await response.json();
        
        if (response.ok && data.htmlContent) {
          setPaynkolayHtml(data.htmlContent);
        } else {
          throw new Error(data.message || "Ödeme başlatılamadı.");
        }
      } catch (err) {
        console.error("Paynkolay hatası:", err);
        alert(err.message || "Ödeme sistemiyle bağlantı kurulamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.");
        setCheckoutStep('payment');
      }
    } else {
      // Havale / EFT İşlemi
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'ramazan_donations'), donationData);

        // ÇÖZÜM 2: E-Postanın başarılı şekilde gönderilmesini bekle ve hataları yakala
        try {
          const emailRes = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: "YENİ BAĞIŞ: Havale/EFT Bildirimi",
              message: `${customerInfo.name} isimli kişi ${totalAmount} ₺ tutarında Havale bağışı bildiriminde bulundu. Lütfen banka hesabınızı ve admin panelinizi kontrol edin.`,
              customerDetails: customerInfo,
              total: totalAmount
            })
          });
          const emailData = await emailRes.json();
          if(!emailData.success) console.error("Mail API Hatası:", emailData.error);
        } catch(emailError) {
          console.error("Mail gönderilemedi ama bağış alındı", emailError);
        }
        
        setCheckoutStep('success');
        setCart([]);
        setCustomerInfo({ name: '', phone: '' });
      } catch (err) {
        alert("İşlem sırasında bir hata oluştu.");
      }
    }
  };

  // --- ADMİN PANELİ FONKSİYONLARI ---
  const handleCreateNewGroup = async () => {
    const groupName = prompt("Özel fiyatlandırma için linkin sonuna eklenecek kısa ismi giriniz (Boşluk kullanmayın, örn: 10, indirim1):");
    if (!groupName || groupName.trim() === '') return;
    const cleanName = groupName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ramazan_group_list', cleanName), { created: serverTimestamp() });
      const newGroupRef = collection(db, 'artifacts', appId, 'public', 'data', `ramazan_group_${cleanName}`);
      for (const opt of initialDonationOptions) {
        await setDoc(doc(newGroupRef, opt.id), opt);
      }
      setSelectedAdminGroup(cleanName);
      alert(`Başarılı! Artık sitenizin sonuna ?grup=${cleanName} yazarak bu özel fiyatlandırmayı görebilirsiniz.`);
    } catch (e) {
      alert("Grup oluşturulurken hata oluştu.");
    }
  };

  const handleImageEditClick = (id) => {
    setEditingImageId(id);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; const MAX_HEIGHT = 800;
          let width = img.width; let height = img.height;
          if (width > height && width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } 
          else if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          updateOption(editingImageId, 'imageUrl', compressedBase64);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = '';
  };

  const updateOption = async (id, field, value) => {
    if (!user) { alert("Firebase veritabanına bağlanılamadı!"); return; }
    setOptions(prev => prev.map(opt => opt.id === id ? { ...opt, [field]: field === 'price' ? Number(value) : value } : opt));
    try {
      const targetCollection = selectedAdminGroup === 'default' ? 'ramazan_options' : `ramazan_group_${selectedAdminGroup}`;
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', targetCollection, id);
      await setDoc(docRef, { [field]: field === 'price' ? Number(value) : value }, { merge: true });
    } catch (error) { console.error("Güncelleme hatası: ", error); }
  };

  const handleDonationStatus = async (donation, newStatus) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'ramazan_donations', donation.id);
      await updateDoc(docRef, { status: newStatus });
      
      const durumMetni = newStatus === 'approved' ? 'ONAYLANDI' : 'REDDEDİLDİ';
      const msg = `Selamun Aleyküm ${donation.customerInfo.name},\nŞekerpınar Nazmi Balcı Erkek Öğrenci Yurdu'na yapmış olduğunuz ${donation.totalAmount}₺ tutarındaki Ramazan bağış işleminiz *${durumMetni}*.\nAllah kabul etsin.`;

      if (donation.customerInfo.phone) {
        let cleanPhone = donation.customerInfo.phone.replace(/\D/g, ''); 
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1); 
        if (!cleanPhone.startsWith('90')) cleanPhone = '90' + cleanPhone; 
        
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
      }
    } catch (err) {
      alert("İşlem başarısız oldu.");
    }
  };

  // VERİLER YÜKLENİRKEN GÖSTERİLECEK EKRAN
  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-[#071d15] flex flex-col items-center justify-center text-[#d4af37] gap-4">
        <Loader2 className="w-12 h-12 animate-spin" />
        <h2 className="text-xl font-bold tracking-widest text-center">Afiş Bilgileri<br/>Hazırlanıyor...</h2>
      </div>
    );
  }

  // --- ADMİN PANELİ GÖRÜNÜMÜ ---
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#05150f] font-sans text-gray-100 p-4 md:p-8">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-[#0a2e21] p-6 rounded-2xl border border-[#d4af37]/30 shadow-xl gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#d4af37] p-3 rounded-full text-[#05150f]">
                <Settings className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#d4af37]">Yönetim Paneli</h1>
                <p className="text-gray-400 text-sm">Bağışları yönetin ve afiş fiyatlarını düzenleyin.</p>
              </div>
            </div>
            <button onClick={() => window.location.hash = ''} className="bg-[#0f3626] border border-[#d4af37]/50 px-6 py-3 rounded-xl text-[#d4af37] font-bold flex items-center gap-2 hover:bg-[#114b32] transition-colors whitespace-nowrap">
              <LogOut className="w-5 h-5" /> Siteye Dön
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6 bg-[#0a2e21] p-2 rounded-xl border border-white/5">
            <button onClick={() => setAdminTab('donations')} className={`flex-1 min-w-[200px] py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${adminTab === 'donations' ? 'bg-[#d4af37] text-[#05150f]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <List className="w-5 h-5" /> Gelen Bağışlar
              {donationsList.filter(d => d.status === 'pending').length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                  {donationsList.filter(d => d.status === 'pending').length} Yeni
                </span>
              )}
            </button>
            <button onClick={() => setAdminTab('settings')} className={`flex-1 min-w-[200px] py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${adminTab === 'settings' ? 'bg-[#d4af37] text-[#05150f]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Edit3 className="w-5 h-5" /> Afiş Ayarları
            </button>
          </div>

          {!user && authChecked && (
            <div className="bg-red-900/40 border-2 border-red-500 text-red-200 p-5 rounded-xl mb-6 flex items-start gap-4 shadow-lg">
              <AlertTriangle className="w-8 h-8 text-red-400 shrink-0 mt-1 animate-pulse" />
              <div>
                <h3 className="font-bold text-lg mb-1 text-red-300">Firebase Kimlik Doğrulama Hatası!</h3>
                <p className="text-sm">Lütfen Firebase Console üzerinden Authentication &gt; Anonymous (Anonim) girişi etkinleştirin.</p>
              </div>
            </div>
          )}

          {adminTab === 'donations' && (
            <div className="bg-[#0c2a1e] rounded-2xl border border-[#d4af37]/30 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#05150f] text-[#d4af37] border-b border-[#d4af37]/30">
                      <th className="p-4 font-semibold text-sm">Tarih / Grup</th>
                      <th className="p-4 font-semibold text-sm">Bağışçı / İletişim</th>
                      <th className="p-4 font-semibold text-sm">Bağış İçeriği</th>
                      <th className="p-4 font-semibold text-sm">Tutar / Yöntem</th>
                      <th className="p-4 font-semibold text-sm">Durum</th>
                      <th className="p-4 font-semibold text-sm text-center">İşlem (WP)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donationsList.length === 0 ? (
                      <tr><td colSpan="6" className="text-center p-8 text-gray-400">Henüz bir bağış bulunmuyor.</td></tr>
                    ) : (
                      donationsList.map((donation) => {
                        const dateObj = donation.createdAt?.toDate ? donation.createdAt.toDate() : new Date();
                        const dateStr = dateObj.toLocaleDateString('tr-TR') + ' ' + dateObj.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
                        
                        return (
                          <tr key={donation.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4 text-sm text-gray-300 whitespace-nowrap">
                              {dateStr}
                              {donation.groupId && donation.groupId !== 'default' && (
                                <div className="mt-1 text-xs text-[#d4af37] border border-[#d4af37]/50 inline-block px-2 py-0.5 rounded">Grup: {donation.groupId}</div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-white">{donation.customerInfo.name}</div>
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Phone className="w-3 h-3"/> {donation.customerInfo.phone}</div>
                            </td>
                            <td className="p-4 text-sm">
                              {donation.items.map(item => (
                                <div key={item.id} className="text-gray-300">• {item.quantity}x {item.title}</div>
                              ))}
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-[#d4af37] text-lg">{donation.totalAmount} ₺</div>
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                {donation.paymentMethod === 'credit_card' ? <><CardIcon className="w-3 h-3 text-blue-400"/> Paynkolay K.Kartı</> : <><Landmark className="w-3 h-3 text-green-400"/> Havale/EFT</>}
                              </div>
                            </td>
                            <td className="p-4">
                              {donation.status === 'pending' && <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-3 py-1 rounded-full text-xs font-bold">Onay Bekliyor</span>}
                              {donation.status === 'approved' && <span className="bg-green-500/20 text-green-500 border border-green-500/50 px-3 py-1 rounded-full text-xs font-bold">Onaylandı</span>}
                              {donation.status === 'rejected' && <span className="bg-red-500/20 text-red-500 border border-red-500/50 px-3 py-1 rounded-full text-xs font-bold">Reddedildi</span>}
                            </td>
                            <td className="p-4 text-center">
                              {donation.status === 'pending' ? (
                                <div className="flex justify-center gap-2">
                                  <button onClick={() => handleDonationStatus(donation, 'approved')} className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition-colors flex items-center gap-1" title="Onayla ve Bildir">
                                    <Check className="w-4 h-4" /> <MessageCircle className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDonationStatus(donation, 'rejected')} className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg transition-colors flex items-center gap-1" title="Reddet ve Bildir">
                                    <XCircle className="w-4 h-4" /> <MessageCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500 italic">İşlem Tamamlandı</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'settings' && (
            <div className="space-y-6">
              
              <div className="bg-[#0f3626] border border-[#d4af37]/50 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex-grow w-full md:w-auto">
                  <label className="text-[#d4af37] text-sm font-bold mb-2 block flex items-center gap-2">
                    <Link className="w-4 h-4" /> Hangi Grubu Düzenliyorsunuz?
                  </label>
                  <select 
                    value={selectedAdminGroup} 
                    onChange={(e) => setSelectedAdminGroup(e.target.value)}
                    className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="default">⭐ Varsayılan Afiş (Ana Site / Genel)</option>
                    {customGroups.map(g => (
                      <option key={g.id} value={g.id}>🔗 Özel Grup: /{g.id}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-6">
                  <button onClick={handleCreateNewGroup} className="bg-[#d4af37] text-[#05150f] font-bold py-3 px-6 rounded-lg shadow-md hover:scale-105 transition-transform whitespace-nowrap">
                    + Yeni Özel Link Ekle
                  </button>
                </div>
              </div>

              {selectedAdminGroup !== 'default' && (
                <div className="bg-blue-900/20 border border-blue-500/30 text-blue-200 p-4 rounded-xl flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm">Şu an <strong>/{selectedAdminGroup}</strong> uzantılı özel grubun fiyatlarını düzenliyorsunuz. Sitenizin sonuna ?grup={selectedAdminGroup} yazarak test edebilirsiniz.</p>
                </div>
              )}

              {options.map((option) => (
                <div key={option.id} className="bg-[#0c2a1e] border border-[#d4af37]/20 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start shadow-lg">
                  <div className="w-full md:w-1/3 flex flex-col gap-3">
                    <div className="relative h-48 rounded-lg overflow-hidden border-2 border-[#114b32] group bg-black">
                      <img src={option.imageUrl} alt={option.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleImageEditClick(option.id)} className="bg-[#d4af37] text-[#05150f] font-bold py-2 px-4 rounded-full flex items-center gap-2 transform hover:scale-105 transition-transform">
                          <Camera className="w-5 h-5" /> Resmi Değiştir
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-xs text-gray-400 mb-1 block">Başlık</label>
                      <div className="relative">
                        <Edit3 className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <input type="text" value={option.title} onChange={(e) => updateOption(option.id, 'title', e.target.value)} className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-2.5 pl-10 text-white focus:outline-none focus:border-[#d4af37]" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Fiyat (₺)</label>
                      <input type="number" value={option.price} onChange={(e) => updateOption(option.id, 'price', e.target.value)} className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#d4af37] font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Tür</label>
                      <select value={option.type} onChange={(e) => updateOption(option.id, 'type', e.target.value)} className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#d4af37]">
                        <option value="iftar">İftar</option>
                        <option value="sahur">Sahur</option>
                      </select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-xs text-gray-400 mb-1 block">Açıklama</label>
                      <textarea value={option.desc} onChange={(e) => updateOption(option.id, 'desc', e.target.value)} rows="2" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#d4af37] resize-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- ANA KULLANICI GÖRÜNÜMÜ ---
  return (
    <div className="min-h-screen bg-[#071d15] font-sans text-gray-100 relative overflow-hidden flex justify-center">

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#d4af37] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#d4af37] rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-3xl bg-gradient-to-b from-[#0a2e21] to-[#05150f] shadow-2xl relative z-10 min-h-screen flex flex-col border-x-4 border-[#d4af37]/30">
        
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

        <main className="flex-grow p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {options.map((option) => (
              <div key={option.id} onClick={() => addToCart(option)} className="bg-[#0c2a1e] border border-[#d4af37]/50 rounded-2xl p-2 flex flex-col items-center cursor-pointer transform transition-all hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(212,175,55,0.2)] relative group">
                <div className="bg-gradient-to-r from-[#e8c678] via-[#d4af37] to-[#b38f25] w-full text-center py-2 rounded-t-xl mb-2 shadow-sm">
                  <h4 className="font-bold text-sm md:text-base text-[#05150f]">{option.title}</h4>
                </div>
                
                <div className="w-full h-40 bg-[#05150f] rounded-lg overflow-hidden relative border-2 border-[#114b32] group-hover:border-[#d4af37]/70 transition-colors">
                  <img src={option.imageUrl} alt={option.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                
                <div className="mt-[-20px] bg-[#05150f] border-2 border-[#d4af37] text-[#d4af37] font-bold text-xl py-1.5 px-6 rounded-full shadow-lg flex items-center justify-center gap-2 relative z-10 w-11/12 group-hover:bg-[#d4af37] group-hover:text-[#05150f] transition-colors">
                  {option.price.toLocaleString('tr-TR')} ₺ <Plus className="w-5 h-5 opacity-80" />
                </div>

                {cart.find(c => c.id === option.id) && (
                  <div className="absolute -top-3 -right-3 bg-red-600 text-white text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full border-2 border-[#05150f] shadow-lg animate-bounce">
                    {cart.find(c => c.id === option.id).quantity}
                  </div>
                )}
              </div>
            ))}
          </div>

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

        <footer className="bg-[#05150f] p-6 border-t border-[#d4af37]/30 flex flex-col gap-4 relative z-20">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-[#d4af37]">
            <div className="flex items-center gap-2 bg-[#0f3626] py-2 px-6 rounded-full border border-[#d4af37]/20 shadow-md">
              <Phone className="w-5 h-5" /> <span className="font-bold tracking-wider">0505 916 80 33</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-center text-gray-300 bg-[#0f3626] py-3 px-4 rounded-lg border border-[#d4af37]/20">
            <MapPin className="w-5 h-5 text-[#d4af37] shrink-0" />
            <span className="text-sm">Cumhuriyet, Namık Kemal Cd. No:25, 41444 Çayırova/Kocaeli</span>
          </div>
          <div className="bg-gradient-to-r from-[#114b32] to-[#0f3626] border-2 border-[#d4af37] p-4 rounded-xl text-center shadow-lg relative overflow-hidden mt-2">
            <div className="absolute -right-4 -top-4 opacity-10"><Building className="w-24 h-24" /></div>
            <div className="flex flex-col md:flex-row items-center justify-center gap-3">
              <CreditCard className="w-8 h-8 text-[#d4af37] shrink-0" />
              <div>
                <p className="text-[#d4af37] font-semibold text-xs mb-1 uppercase tracking-wider">Şekerpınar Eğitim Çağındaki Öğrencilere Yardım Derneği</p>
                <div className="flex items-center justify-center gap-2 bg-[#05150f]/50 py-1.5 px-3 rounded mt-1">
                  <span className="text-[#d4af37] font-bold text-sm">TR</span>
                  <span className="text-white font-mono text-base md:text-lg font-bold tracking-widest break-all">78 0021 0000 0003 3265 5000 01</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        <button onClick={handleShare} className="bg-[#0f3626] text-[#d4af37] border border-[#d4af37] p-4 rounded-full shadow-xl hover:bg-[#154a35] transition-colors flex items-center justify-center">
          <Share2 className="w-6 h-6" />
        </button>
        <button onClick={() => setIsCartOpen(true)} className="bg-gradient-to-r from-[#d4af37] to-[#b38f25] text-[#05150f] p-4 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-105 transition-transform flex items-center justify-center relative">
          <ShoppingCart className="w-8 h-8" />
          {totalItems > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full border-2 border-[#05150f]">{totalItems}</span>}
        </button>
      </div>

      {showNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#d4af37] text-[#05150f] px-6 py-3 rounded-full font-bold shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-5 h-5" /> {notificationText}
        </div>
      )}

      {/* Sepet / Ödeme Paneli */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-[#0a2e21] h-full shadow-2xl flex flex-col border-l border-[#d4af37]/30 animate-slide-left">
            
            <div className="p-5 border-b border-[#d4af37]/20 flex justify-between items-center bg-[#05150f]">
              <h2 className="text-2xl font-bold text-[#d4af37] flex items-center gap-2">
                {checkoutStep === 'paynkolay_3d' ? <Lock className="text-green-400" /> : <ShoppingCart />} 
                {checkoutStep === 'paynkolay_3d' ? 'Güvenli Ödeme' : 'Bağış Listem'}
              </h2>
              {checkoutStep !== 'paynkolay_3d' && (
                <button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} className="text-gray-400 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
              )}
            </div>

            <div className="flex-grow overflow-y-auto p-5">
              
              {/* ADIM 1: SEPET */}
              {checkoutStep === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                      <ShoppingCart className="w-16 h-16 opacity-20" />
                      <p className="text-lg">Henüz bağış seçmediniz.</p>
                      <button onClick={() => setIsCartOpen(false)} className="text-[#d4af37] border border-[#d4af37] px-6 py-2 rounded-full hover:bg-[#d4af37]/10 transition-colors">Seçenekleri Gör</button>
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
                            <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-5 h-5" /></button>
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-3 bg-[#05150f] rounded-full px-2 py-1">
                              <button onClick={() => updateQuantity(item.id, -1)} className="bg-[#114b32] w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-[#155d3f]"><Minus className="w-4 h-4" /></button>
                              <span className="font-bold text-lg w-6 text-center text-white">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="bg-[#d4af37] w-8 h-8 rounded-full flex items-center justify-center text-[#05150f] hover:bg-[#e8c678]"><Plus className="w-4 h-4" /></button>
                            </div>
                            <div className="text-xl font-bold text-[#d4af37]">{(item.price * item.quantity).toLocaleString('tr-TR')} ₺</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ADIM 2: BİLGİ VE ÖDEME YÖNTEMİ */}
              {checkoutStep === 'payment' && (
                <div className="space-y-6 animate-fade-in">
                  
                  <div className="bg-[#0f3626] p-4 rounded-xl border border-[#d4af37]/30 space-y-4">
                    <h3 className="text-[#d4af37] font-bold text-sm flex items-center gap-2"><User className="w-4 h-4" /> İletişim Bilgileriniz</h3>
                    <input 
                      type="text" placeholder="Adınız Soyadınız" required
                      value={customerInfo.name} onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]" 
                    />
                    <input 
                      type="tel" placeholder="Telefon Numaranız (05...)" required
                      value={customerInfo.phone} onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]" 
                    />
                  </div>

                  <div className="flex gap-2 p-1 bg-[#05150f] rounded-lg border border-[#d4af37]/20">
                    <button onClick={() => setPaymentMethod('credit_card')} className={`flex-1 py-3 px-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'credit_card' ? 'bg-[#d4af37] text-[#05150f]' : 'text-gray-400 hover:text-white'}`}>
                      <CreditCard className="w-4 h-4" /> Kredi Kartı
                    </button>
                    <button onClick={() => setPaymentMethod('transfer')} className={`flex-1 py-3 px-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'transfer' ? 'bg-[#d4af37] text-[#05150f]' : 'text-gray-400 hover:text-white'}`}>
                      <Landmark className="w-4 h-4" /> Havale/EFT
                    </button>
                  </div>

                  {paymentMethod === 'credit_card' ? (
                    <div className="bg-[#0f3626] p-5 rounded-xl border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)] space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-blue-400 font-bold flex items-center gap-1"><Lock className="w-4 h-4"/> Paynkolay Güvencesiyle</h3>
                        <div className="flex gap-1">
                          <div className="w-8 h-5 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold">VISA</div>
                          <div className="w-8 h-5 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold">MASTER</div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Kart Üzerindeki İsim</label>
                        <input type="text" value={cardInfo.name} onChange={e => setCardInfo({...cardInfo, name: e.target.value})} placeholder="Ad Soyad" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white focus:border-[#d4af37] focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Kart Numarası</label>
                        <input type="text" value={cardInfo.number} onChange={e => setCardInfo({...cardInfo, number: e.target.value.replace(/\D/g,'')})} placeholder="0000 0000 0000 0000" maxLength="16" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white font-mono focus:border-[#d4af37] focus:outline-none" />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs text-gray-400 mb-1 block">Son Kul. (AA)</label>
                          <input type="text" value={cardInfo.month} onChange={e => setCardInfo({...cardInfo, month: e.target.value.replace(/\D/g,'')})} placeholder="AA" maxLength="2" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white text-center focus:border-[#d4af37] focus:outline-none" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-400 mb-1 block">Yıl (YYYY)</label>
                          <input type="text" value={cardInfo.year} onChange={e => setCardInfo({...cardInfo, year: e.target.value.replace(/\D/g,'')})} placeholder="YYYY" maxLength="4" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white text-center focus:border-[#d4af37] focus:outline-none" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-400 mb-1 block">CVC</label>
                          <input type="text" value={cardInfo.cvv} onChange={e => setCardInfo({...cardInfo, cvv: e.target.value.replace(/\D/g,'')})} placeholder="123" maxLength="3" className="w-full bg-[#05150f] border border-[#d4af37]/30 rounded-lg p-3 text-white text-center focus:border-[#d4af37] focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#0f3626] p-5 rounded-xl border border-[#d4af37]/30 shadow-lg">
                      <h3 className="text-[#d4af37] font-bold mb-2 flex items-center gap-2"><Landmark className="w-5 h-5" /> Banka Hesap Bilgileri</h3>
                      <p className="text-sm text-gray-300 mb-4">Aşağıdaki IBAN numarasına ödemeyi gönderip "Niyet Ettim" butonuna basınız.</p>
                      <div className="bg-[#05150f] p-4 rounded-lg border border-[#d4af37]/20 relative">
                        <p className="text-xs text-gray-400 mb-1">Alıcı Adı:</p>
                        <p className="text-[#d4af37] text-sm font-semibold mb-4 leading-tight">Şekerpınar Eğitim Çağındaki Öğrencilere Yardım Derneği</p>
                        <p className="text-xs text-gray-400 mb-1">IBAN:</p>
                        <div className="bg-[#114b32]/50 p-2 rounded"><p className="text-white font-mono font-bold tracking-wider select-all cursor-pointer text-sm">TR78 0021 0000 0003 3265 5000 01</p></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ADIM 3: PAYNKOLAY 3D SECURE YÜKLENİYOR / IFRAME */}
              {checkoutStep === 'paynkolay_3d' && (
                <div className="h-full flex flex-col items-center animate-fade-in bg-white rounded-xl overflow-hidden">
                  {paynkolayHtml ? (
                    <iframe 
                      title="Güvenli Ödeme" 
                      srcDoc={paynkolayHtml} 
                      className="w-full h-full min-h-[500px]" 
                      frameBorder="0" 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 space-y-4">
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                      <p className="text-gray-800 font-bold">Bankanıza Bağlanılıyor...</p>
                      <p className="text-sm text-gray-500 text-center">Lütfen bekleyin, 3D Secure sistemine yönlendiriliyorsunuz.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ADIM 4: BAŞARILI SONUÇ */}
              {checkoutStep === 'success' && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                  <div className="w-24 h-24 bg-[#d4af37] rounded-full flex items-center justify-center text-[#05150f] shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                    <CheckCircle className="w-16 h-16" />
                  </div>
                  <h2 className="text-3xl font-bold text-[#d4af37]">Allah Kabul Etsin</h2>
                  <p className="text-gray-300">
                    Bağış niyetiniz alınmıştır. İşleminiz kontrol edildikten sonra onaylanacak ve size WhatsApp üzerinden bilgi verilecektir.
                  </p>
                  <p className="text-sm text-[#d4af37] font-semibold bg-[#114b32] px-4 py-2 rounded-full">Bize destek olduğunuz için teşekkür ederiz.</p>
                </div>
              )}
            </div>

            {/* Modal Alt Kısım */}
            {cart.length > 0 && checkoutStep !== 'success' && checkoutStep !== 'paynkolay_3d' && (
              <div className="p-5 border-t border-[#d4af37]/30 bg-[#05150f]">
                <div className="flex justify-between items-center mb-4 bg-[#0f3626] p-3 rounded-lg border border-[#d4af37]/20">
                  <span className="text-gray-300 font-semibold">Toplam Bağış:</span>
                  <span className="text-2xl font-bold text-[#d4af37]">{totalAmount.toLocaleString('tr-TR')} ₺</span>
                </div>
                
                {checkoutStep === 'cart' ? (
                  <button onClick={() => setCheckoutStep('payment')} className="w-full bg-gradient-to-r from-[#d4af37] to-[#b38f25] text-[#05150f] font-bold text-lg py-4 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-[1.02] transition-transform">Bağışı Tamamla</button>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => setCheckoutStep('cart')} className="w-1/3 bg-[#0f3626] text-white font-bold py-4 rounded-xl border border-[#d4af37]/30 hover:bg-[#114b32]">Geri</button>
                    <button onClick={handleCheckoutSubmit} className="w-2/3 bg-gradient-to-r from-[#d4af37] to-[#b38f25] text-[#05150f] font-bold text-lg py-4 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                      {paymentMethod === 'credit_card' ? 'Ödemeye Geç' : 'Niyet Ettim (Havale)'}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {checkoutStep === 'success' && (
              <div className="p-5 bg-[#05150f]">
                 <button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} className="w-full bg-[#0f3626] text-[#d4af37] border border-[#d4af37]/50 font-bold text-lg py-4 rounded-xl hover:bg-[#114b32] transition-colors">Ana Sayfaya Dön</button>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-left { animation: slide-left 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}} />
    </div>
  );
}