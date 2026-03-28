import React, { useState, useEffect } from 'react';
import {
  ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Button,
  Container, Grid, Card, CardMedia, CardContent, CardActions, IconButton, Badge,
  Box, Chip, Drawer, Divider, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Radio, RadioGroup, FormControlLabel, FormControl, Snackbar,
  Stepper, Step, StepLabel, Checkbox, Paper, MenuItem, Rating, Avatar
} from '@mui/material';
import { ShoppingCart, Laptop, Cpu, X, User, LogOut, Plus, Minus, Trash2, CreditCard, CheckCircle, Truck, Tag, ArrowLeft, ChevronRight, Search, MessageSquare, AlertTriangle, Mail } from 'lucide-react';

// --- MOTYW APLIKACJI ---
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ffffffff' },
    secondary: { main: '#ffffffff' },
    background: { default: '#e8ebeeff', paper: '#4e82b9ff' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 }
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
    },
  },
});

const API_BASE_URL = 'http://127.0.0.1:8000';

// ==========================================
// KOMPONENT MENU KONTA
// ==========================================
const AccountMenu = ({ user, userData, onClose, onLogout, onOpenOrders, onOpenProfile }) => {
  const displayName = userData?.imie || userData?.first_name || user?.username || 'Użytkownik';
  const email = userData?.email || '';

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 60,
        right: 20,
        width: 280,
        zIndex: 1300,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'background.paper', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Zalogowany jako</Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{displayName}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>{email}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}><X size={18} /></IconButton>
      </Box>

      <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <User size={16} />
          <Typography variant="body2">{userData?.imie || '-'} {userData?.nazwisko || ''}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <Typography variant="body2">{userData?.nr_tel || 'Brak telefonu'}</Typography>
        </Box>
      </Box>

      <Box sx={{ p: 1 }}>
        <Button fullWidth sx={{ justifyContent: 'flex-start', mb: 0.5, color: 'text.primary' }} startIcon={<ShoppingCart size={18} />} onClick={() => { onClose(); onOpenOrders(); }}>
          Moje zamówienia
        </Button>
        <Button fullWidth sx={{ justifyContent: 'flex-start', mb: 0.5, color: 'text.primary' }} startIcon={<User size={18} />} onClick={() => { onClose(); onOpenProfile(); }}>
          Ustawienia konta
        </Button>
        <Divider sx={{ my: 1 }} />
        <Button fullWidth sx={{ justifyContent: 'flex-start', color: '#dc3545' }} startIcon={<LogOut size={18} />} onClick={() => { onLogout(); onClose(); }}>
          Wyloguj się
        </Button>
      </Box>
    </Paper>
  );
};

// ==========================================
// GŁÓWNY KOMPONENT APP
// ==========================================
export default function App() {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeDisplayImg, setActiveDisplayImg] = useState(null);

  const [user, setUser] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: '', password: '', email: '', imie: '', nazwisko: '', nr_tel: ''
  });
  const [registerError, setRegisterError] = useState('');

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [cartError, setCartError] = useState(''); // <-- DODANO: Stan do wyświetlania błędu braku na magazynie

  const [checkoutData, setCheckoutData] = useState({
    imie: '', nazwisko: '',
    email: '', kierunkowy: '+48', nr_tel: '',
    haslo_rejestracja: '',
    ulica: '', nr_domu: '', miasto: '', kod_pocztowy: '',
    id_dostawy: '',
    id_metody_platnosci: '',
    akceptacja_regulaminu: false
  });

  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(null);
  const [discountError, setDiscountError] = useState('');

  const [userData, setUserData] = useState(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [editProfileData, setEditProfileData] = useState({
    imie: '', nazwisko: '', nr_tel: '', email: ''
  });

  // --- STANY OPINII O PRODUKCIE ---
  const [productReviews, setProductReviews] = useState([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [reviewStatus, setReviewStatus] = useState({ can_review: false, kupil: false, juz_ocenil: false });

  // --- STANY REKLAMACJI W HISTORII ZAMÓWIEŃ ---
  const [complaintData, setComplaintData] = useState({ orderId: null, text: '' });

  // --- STANY WIADOMOŚCI OD SKLEPU (REKLAMACJE) ---
  const [userComplaints, setUserComplaints] = useState([]);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [readMessagesCount, setReadMessagesCount] = useState(0);
  const [customerReplies, setCustomerReplies] = useState({});

  // Efekt uruchamiany po wybraniu produktu lub po zalogowaniu się
  useEffect(() => {
    if (selectedProduct) {
      setActiveDisplayImg(selectedProduct.zdjecie);

      fetch(`${API_BASE_URL}/api/produkty/${selectedProduct.id}/opinie`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setProductReviews(data);
          } else {
            setProductReviews([]);
          }
        })
        .catch(() => setProductReviews([]));

      if (user && user.token) {
        fetch(`${API_BASE_URL}/api/produkty/${selectedProduct.id}/czy-moze-ocenic`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.can_review !== undefined) {
              setReviewStatus(data);
            } else {
              setReviewStatus({ can_review: false, kupil: false, juz_ocenil: false });
            }
          })
          .catch(() => setReviewStatus({ can_review: false, kupil: false, juz_ocenil: false }));
      } else {
        setReviewStatus({ can_review: false, kupil: false, juz_ocenil: false });
      }

    } else {
      setActiveDisplayImg(null);
      setProductReviews([]);
      setNewReviewText('');
      setNewReviewRating(5);
      setReviewStatus({ can_review: false, kupil: false, juz_ocenil: false });
    }
  }, [selectedProduct, user]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) setUser({ username, token });

    const fetchAllData = async () => {
      try {
        const [prodRes, catRes, delivRes, discRes, payRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/produkty/`),
          fetch(`${API_BASE_URL}/api/kategorie/`),
          fetch(`${API_BASE_URL}/api/dostawy/`),
          fetch(`${API_BASE_URL}/api/rabaty/`),
          fetch(`${API_BASE_URL}/api/metody-platnosci/`)
        ]);

        if (!prodRes.ok) throw new Error(`Błąd HTTP: ${prodRes.status}`);

        const prodData = await prodRes.json();
        const catData = catRes.ok ? await catRes.json() : [];
        const delivData = delivRes.ok ? await delivRes.json() : [];
        const discData = discRes.ok ? await discRes.json() : [];
        const payData = payRes.ok ? await payRes.json() : [];

        setProducts(prodData);
        setCategories(catData);
        setDeliveryOptions(delivData);
        setAvailableDiscounts(discData);
        setPaymentMethods(payData);

        setCheckoutData(prev => ({
          ...prev,
          id_dostawy: delivData.length > 0 ? delivData[0].id : '',
          id_metody_platnosci: payData.length > 0 ? payData[0].id : ''
        }));

      } catch (err) {
        setError("Nie udało się połączyć z serwerem Django. Upewnij się, że działa na porcie 8000.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const fetchUserComplaints = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/zamowienia/reklamacje`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUserComplaints(data);
      }
    } catch (error) {
      console.error('Błąd pobierania reklamacji:', error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setUserData(null);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          setUser(prev => prev ? { ...prev, ...data } : { username: data.username, token });
        } else if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          setUser(null);
          setUserData(null);
        }
      } catch (error) {
        console.error('Błąd pobierania danych użytkownika:', error);
      }
    };

    if (user?.token) {
      fetchUserData();
      fetchUserComplaints();
    }
  }, [user?.token]);

  // Odczytywanie zapisanej w pamięci liczby przeczytanych wiadomości dla danego użytkownika
  useEffect(() => {
    if (user?.username) {
      const storedCount = localStorage.getItem(`readMessagesCount_${user.username}`);
      if (storedCount) {
        setReadMessagesCount(parseInt(storedCount));
      } else {
        setReadMessagesCount(0);
      }
    }
  }, [user?.username]);

  const handleOpenMessages = () => {
    setIsMessagesOpen(true);
    const repliedCount = userComplaints.filter(c => c.wiadomosci.some(w => w.autor === 'SKLEP')).length;
    setReadMessagesCount(repliedCount);
    if (user?.username) {
      localStorage.setItem(`readMessagesCount_${user.username}`, repliedCount.toString());
    }
  };

  // --- Funkcja wysyłania odpowiedzi klienta na reklamację ---
  const handleSendCustomerReply = async (complaintId) => {
    const text = customerReplies[complaintId];
    if (!text?.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/zamowienia/reklamacje/${complaintId}/wiadomosc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ tresc: text })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Błąd wysyłania odpowiedzi');
      }
      alert('Twoja odpowiedź została wysłana do sklepu!');
      setCustomerReplies(prev => ({ ...prev, [complaintId]: '' }));
      fetchUserComplaints();
    } catch (e) {
      alert(e.message);
    }
  };

  // --- POPRAWIONE FUNKCJE KOSZYKA (BLOKOWANIE PRZEKROCZENIA STANU) ---
  const handleAddToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.ilosc_dostepna) {
          setCartError(`Przepraszamy, mamy tylko ${product.ilosc_dostepna} szt. produktu "${product.nazwa}" w magazynie.`);
          return prevCart;
        }
        return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }

      if (product.ilosc_dostepna < 1) {
        setCartError(`Przepraszamy, produkt "${product.nazwa}" jest obecnie wyprzedany.`);
        return prevCart;
      }

      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity > item.ilosc_dostepna) {
          setCartError(`Maksymalna dostępna ilość to ${item.ilosc_dostepna} szt.`);
          return item; // Zwróć niezmieniony koszyk
        }
        if (newQuantity >= 1) {
          return { ...item, quantity: newQuantity };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => {
      const updatedCart = prevCart.filter(item => item.id !== productId);
      if (updatedCart.length === 0) {
        setDiscountApplied(null);
        setDiscountCode('');
        setDiscountError('');
      }
      return updatedCart;
    });
  };
  const toggleCart = () => setIsCartOpen(!isCartOpen);

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + ((item.cena_promocyjna || item.cena_jednostkowa) * item.quantity), 0);
  const discountAmount = discountApplied ? (subtotal * (discountApplied.procent / 100)) : 0;

  const selectedDelivery = deliveryOptions.find(d => d.id === checkoutData.id_dostawy) || { nazwa: 'Brak opcji', cena: 0 };
  const deliveryCost = selectedDelivery.cena;
  const totalToPay = subtotal - discountAmount + deliveryCost;
  const isOdbior = (selectedDelivery?.nazwa || '').toLowerCase().includes('odbiór');

  const handleApplyDiscount = () => {
    const foundDiscount = availableDiscounts.find(d => d.nazwa.toUpperCase() === discountCode.toUpperCase());
    if (foundDiscount) {
      setDiscountApplied({ kod: foundDiscount.nazwa, procent: foundDiscount.procent, id: foundDiscount.id });
      setDiscountError('');
    } else {
      setDiscountError('Nieprawidłowy lub nieaktywny kod rabatowy.');
      setDiscountApplied(null);
    }
  };

  const handleCheckoutClick = () => {
    setIsCartOpen(false); setIsCheckoutOpen(true); setActiveStep(0); setDiscountCode(''); setDiscountError('');
  };

  const handleNextStep = () => {
    if (activeStep === 1) {
      if (!user && (!checkoutData.imie || !checkoutData.nazwisko)) {
        alert("Proszę uzupełnić imię i nazwisko kupującego.");
        return;
      }
      if (!checkoutData.email || !checkoutData.nr_tel) {
        alert("Proszę podać kontaktowy adres E-mail oraz Numer telefonu.");
        return;
      }
      const wymagaAdresu = selectedDelivery && !isOdbior;
      // Usunięto sprawdzanie checkoutData.ulica
      if (wymagaAdresu && (!checkoutData.miasto || !checkoutData.kod_pocztowy)) {
        alert("Proszę uzupełnić wymagane pola adresu dostawy (Miasto i Kod pocztowy).");
        return;
      }
    }
    setActiveStep(prev => prev + 1);
  };

  const handlePrevStep = () => setActiveStep(prev => prev - 1);

  const handlePlaceOrder = async () => {
    const pelnyNumer = `${checkoutData.kierunkowy} ${checkoutData.nr_tel}`;

    const orderPayload = {
      is_guest: !user,
      create_account: !user && checkoutData.haslo_rejestracja.trim() !== '',
      haslo: checkoutData.haslo_rejestracja,
      klient: {
        imie: checkoutData.imie,
        nazwisko: checkoutData.nazwisko,
        email: checkoutData.email,
        nr_tel: pelnyNumer
      },
      adres: {
        ulica: checkoutData.ulica,
        nr_domu: checkoutData.nr_domu,
        miasto: checkoutData.miasto,
        kod_pocztowy: checkoutData.kod_pocztowy
      },
      dostawa_id: checkoutData.id_dostawy,
      rabat_id: discountApplied ? discountApplied.id : null,
      metoda_platnosci_id: checkoutData.id_metody_platnosci,
      koszyk: cart.map(item => ({
        towar_id: item.id,
        ilosc: item.quantity,
        cena_sprzedazy: item.cena_promocyjna || item.cena_jednostkowa
      }))
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/zamowienia/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("Błąd zamówienia:", err);
        // ZMIANA: Wyświetlamy klientowi dokładny powód np. gdy w międzyczasie ktoś mu wykupił produkt
        alert(err.detail || "Nie udało się złożyć zamówienia.");
        return;
      }

      setOrderSuccess(true);
      setCart([]);
      setIsCheckoutOpen(false);
      setActiveStep(0);
      setDiscountApplied(null);

    } catch (error) {
      console.error("Błąd połączenia:", error);
      alert("Błąd połączenia z serwerem.");
    }
  };

  const handleSubmitReview = async () => {
    if (!newReviewText.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/produkty/${selectedProduct.id}/opinie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ ocena: newReviewRating, tresc: newReviewText })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Wystąpił błąd serwera.");
      }

      alert("Twoja opinia została dodana!");
      setNewReviewText('');
      setNewReviewRating(5);

      const updatedRes = await fetch(`${API_BASE_URL}/api/produkty/${selectedProduct.id}/opinie`);
      const newData = await updatedRes.json();
      if (Array.isArray(newData)) {
        setProductReviews(newData);
      }
      setReviewStatus(prev => ({ ...prev, can_review: false, juz_ocenil: true }));

    } catch (error) {
      alert(error.message);
    }
  };

  const handleSendComplaint = async (orderId) => {
    if (!complaintData.text.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/zamowienia/${orderId}/reklamacja`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ tresc: complaintData.text })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Błąd wysyłania reklamacji');
      }
      alert('Zgłoszenie reklamacyjne zostało wysłane. Skontaktujemy się wkrótce!');
      setComplaintData({ orderId: null, text: '' });
      fetchUserOrders();
      fetchUserComplaints();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleLoginChange = (e) => setLoginData({ ...loginData, [e.target.name]: e.target.value });
  const handleLoginSubmit = async () => {
    setLoginError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/login/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginData)
      });
      if (!response.ok) throw new Error('Błędny login lub hasło.');
      const data = await response.json();
      localStorage.setItem('token', data.token); localStorage.setItem('username', data.username);
      setUser({ username: data.username, token: data.token });
      setIsLoginOpen(false); setLoginData({ username: '', password: '' });
    } catch (err) { setLoginError(err.message); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
    setUserData(null);
    setIsAccountMenuOpen(false);
  };

  const handleRegisterChange = (e) => setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  const handleRegisterSubmit = async () => {
    setRegisterError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/register/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registerData)
      });
      if (!response.ok) {
        const errorData = await response.json(); throw new Error(errorData.detail || 'Błąd rejestracji.');
      }
      const data = await response.json();
      localStorage.setItem('token', data.token); localStorage.setItem('username', data.username);
      setUser({ username: data.username, token: data.token });
      setIsRegisterOpen(false); setRegisterData({ username: '', password: '', email: '', imie: '', nazwisko: '', nr_tel: '' });
    } catch (err) { setRegisterError(err.message); }
  };
  const openRegister = () => { setIsLoginOpen(false); setIsRegisterOpen(true); };

  const fetchUserOrders = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/zamowienia/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const orders = await response.json();
        setUserOrders(orders);
      }
    } catch (error) {
      console.error('Błąd pobierania zamówień:', error);
    }
  };

  const handleOpenOrders = () => {
    fetchUserOrders();
    setIsOrdersOpen(true);
  };

  const handleOpenProfile = () => {
    setEditProfileData({
      imie: userData?.imie || '',
      nazwisko: userData?.nazwisko || '',
      nr_tel: userData?.nr_tel || '',
      email: userData?.email || '',
    });
    setIsProfileEditOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(editProfileData),
      });

      if (response.ok) {
        const result = await response.json();
        setUserData(result.user);
        alert('Dane zostały zaktualizowane!');
        setIsProfileEditOpen(false);
      } else {
        alert('Błąd podczas aktualizacji danych');
      }
    } catch (error) {
      console.error('Błąd:', error);
      alert('Nie udało się zaktualizować danych');
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://via.placeholder.com/400x200?text=Brak+zdj%C4%99cia";
    if (imagePath.startsWith('http') || imagePath.startsWith('blob:')) return imagePath;
    return `${API_BASE_URL}${imagePath}`;
  };

  const galleryImages = selectedProduct ? [
    selectedProduct.zdjecie,
    ...(selectedProduct.dodatkowe_zdjecia?.map(z => z.url) || [])
  ].filter(Boolean) : [];

  const renderVerticalProductCard = (product) => (
    <Card key={product.id} sx={{ height: 350, width: 250, display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'pointer', flexShrink: 0, '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 8px 24px rgba(0,230,118,0.2)', borderColor: '#2f00ffff', borderWidth: 1, borderStyle: 'solid' } }} onClick={() => { setSelectedProduct(product); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
      <Box sx={{ p: 1.5, pb: 0, flexShrink: 0 }}>
        <Box sx={{ height: 160, bgcolor: '#ffffff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1, overflow: 'hidden' }}>
          <img src={getImageUrl(product.zdjecie)} alt={product.nazwa} style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }} />
        </Box>
      </Box>

      <CardContent sx={{ display: 'flex', flexDirection: 'column', p: 1.5, pb: 0, flexGrow: 1 }}>
        <Box sx={{ height: 20, mb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="secondary" sx={{ fontWeight: 600, lineHeight: 1, textTransform: 'uppercase' }}>{product.kategoria}</Typography>
          {product.cena_promocyjna && <Chip label="Promocja" color="primary" sx={{ height: 16, fontSize: '0.6rem' }} />}
        </Box>

        <Typography variant="subtitle2" component="h2" title={product.nazwa}
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3, height: '2.6em', mb: 1, fontWeight: 700 }}>
          {product.nazwa}
        </Typography>

        <Box sx={{ height: 44, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', mt: 'auto' }}>
          {product.cena_promocyjna ? (
            <>
              <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary', lineHeight: 1, mb: 0.25 }}>{product.cena_jednostkowa.toFixed(2)} zł</Typography>
              <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700, lineHeight: 1 }}>{product.cena_promocyjna.toFixed(2)} zł</Typography>
            </>
          ) : (
            <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700, lineHeight: 1 }}>{product.cena_jednostkowa.toFixed(2)} zł</Typography>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ p: 1.5, pt: 0.5, mt: 0, justifyContent: 'flex-end', flexShrink: 0 }}>
        {product.ilosc_dostepna === 0 && <Chip label="Brak" color="error" sx={{ height: 20, fontSize: '0.6rem', mr: 'auto' }} variant="outlined" />}
        <Button size="small" variant={product.ilosc_dostepna > 0 ? "contained" : "outlined"} color="primary" disabled={product.ilosc_dostepna === 0} onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }} startIcon={<ShoppingCart size={16} />}>
          {product.ilosc_dostepna > 0 ? 'Do koszyka' : 'Brak'}
        </Button>
      </CardActions>
    </Card>
  );

  let placeholderText = "Opisz swoje wrażenia z użytkowania produktu...";
  let isReviewDisabled = false;

  if (!user) {
    placeholderText = "Zaloguj się, aby móc ocenić ten produkt.";
    isReviewDisabled = true;
  } else if (!reviewStatus.kupil) {
    placeholderText = "Możesz ocenić tylko produkty, które zamówiłeś w naszym sklepie.";
    isReviewDisabled = true;
  } else if (reviewStatus.juz_ocenil) {
    placeholderText = "Dodałeś już opinię do tego produktu. Dziękujemy!";
    isReviewDisabled = true;
  }


  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />

      {/* --- PASEK NAWIGACJI --- */}
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Container sx={{ px: { xs: 2, sm: 4 }, width: { xs: '100%', md: '85%', lg: '80%', xl: '75%' }, margin: '0 auto', maxWidth: 'none' }}>
          <Toolbar disableGutters>
            <Cpu color="#ffffffff" size={28} style={{ marginRight: '12px' }} />
            <Typography
              variant="h6"
              component="div"
              sx={{ letterSpacing: 1, cursor: 'pointer', display: { xs: 'none', md: 'block' }, mr: { xs: 2, md: 4 } }}
              onClick={() => { setSelectedCategoryId(null); setSelectedSubcategoryId(null); setSelectedProduct(null); setSearchQuery(''); }}
            >
              SKLEP<span style={{ color: '#ffffffff' }}> KOMPUTEROWY</span>
            </Typography>

            <Box sx={{ position: 'relative', width: { xs: '100%', sm: 300, lg: 400 }, mr: 'auto' }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Szukaj produktu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  bgcolor: '#ffffff',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-root': {
                    color: '#000000',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: '1px solid rgba(0,0,0,0.3)' },
                    '&.Mui-focused fieldset': { border: '1px solid #1976d2' }
                  }
                }}
                InputProps={{
                  startAdornment: <Search size={18} style={{ marginRight: 8, color: 'rgba(0,0,0,0.5)' }} />,
                }}
              />
              {searchQuery.trim() !== '' && (
                <Paper
                  elevation={6}
                  sx={{
                    position: 'absolute', top: '100%', left: 0, right: 0, mt: 1,
                    maxHeight: 400, overflowY: 'auto', zIndex: 9999,
                    bgcolor: 'background.paper', borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {products.filter(p => p.nazwa.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 1 }}>
                      {products.filter(p => p.nazwa.toLowerCase().includes(searchQuery.toLowerCase())).map(product => (
                        <Box component="li" key={product.id}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 2, p: 1,
                            cursor: 'pointer', borderRadius: 1,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                          }}
                          onClick={() => {
                            setSelectedProduct(product);
                            setSearchQuery('');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <Box component="img" src={getImageUrl(product.zdjecie)} sx={{ width: 40, height: 40, objectFit: 'contain', bgcolor: 'white', borderRadius: 1 }} />
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.nazwa}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1 }}>{product.kategoria}</Typography>
                          </Box>
                          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            {(product.cena_promocyjna || product.cena_jednostkowa).toFixed(2)} zł
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Brak wyników</Typography>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>

            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2, position: 'relative' }}>

                {/* --- IKONKA WIADOMOŚCI REKLAMACYJNYCH --- */}
                <IconButton color="inherit" onClick={handleOpenMessages}>
                  <Badge
                    badgeContent={Math.max(0, userComplaints.filter(c => c.wiadomosci.some(w => w.autor === 'SKLEP')).length - readMessagesCount)}
                    color="error"
                  >
                    <Mail size={24} />
                  </Badge>
                </IconButton>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 2,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: '#1976d2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {userData?.imie ? userData.imie[0].toUpperCase() : user.username[0].toUpperCase()}
                  </Box>
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                      Witaj,
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                      {userData?.imie || userData?.first_name || user.username}
                    </Typography>
                  </Box>
                </Box>

                {isAccountMenuOpen && (
                  <AccountMenu
                    user={user}
                    userData={userData}
                    onClose={() => setIsAccountMenuOpen(false)}
                    onLogout={handleLogout}
                    onOpenOrders={handleOpenOrders}
                    onOpenProfile={handleOpenProfile}
                  />
                )}
              </Box>
            ) : (
              <Button color="inherit" startIcon={<User size={20} />} onClick={() => setIsLoginOpen(true)} sx={{ mr: 2 }}>
                Zaloguj
              </Button>
            )}
            <IconButton color="inherit" onClick={toggleCart} sx={{ ml: 2 }}>
              <Badge badgeContent={cartItemsCount} color="primary"><ShoppingCart /></Badge>
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      {/* --- GŁÓWNA ZAWARTOŚĆ --- */}
      <Container sx={{ py: 6, px: { xs: 2, sm: 4 }, width: { xs: '100%', md: '85%', lg: '80%', xl: '75%' }, margin: '0 auto', maxWidth: 'none' }}>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}><CircularProgress color="primary" /></Box>}
        {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

        {/* WIDOK PRODUKTU SZCZEGÓŁOWEGO */}
        {!loading && !error && selectedProduct !== null ? (
          <Box>
            <Button startIcon={<ArrowLeft />} onClick={() => setSelectedProduct(null)} sx={{ mb: 3, color: '#000000' }}>
              Wróć
            </Button>

            <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 4, md: 6 }, mb: { xs: 4, md: 6 }, alignItems: 'stretch' }}>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                    <Box sx={{ width: '100%', height: { xs: 250, md: 380 }, bgcolor: '#ffffff', borderRadius: 3, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img src={getImageUrl(activeDisplayImg)} alt={selectedProduct.nazwa} style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', transition: 'opacity 0.3s ease-in-out' }} />
                    </Box>

                    {galleryImages.length > 1 && (
                      <Box sx={{
                        display: 'flex', gap: 2, overflowX: 'auto', pb: 1,
                        '&::-webkit-scrollbar': { height: 8 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 4 }
                      }}>
                        {galleryImages.map((imgUrl, idx) => (
                          <Box
                            key={idx}
                            onClick={() => setActiveDisplayImg(imgUrl)}
                            sx={{
                              width: 80, height: 80, flexShrink: 0, bgcolor: '#ffffff', borderRadius: 2, p: 1,
                              cursor: 'pointer', transition: 'all 0.2s ease-in-out',
                              border: activeDisplayImg === imgUrl ? '2px solid #2979ff' : '2px solid transparent',
                              opacity: activeDisplayImg === imgUrl ? 1 : 0.6,
                              '&:hover': { opacity: 1, transform: 'scale(1.05)' }
                            }}
                          >
                            <img src={getImageUrl(imgUrl)} alt={`Miniatura ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: 'rgba(0,0,0,0.1)', p: { xs: 3, md: 4 }, borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', height: '100%' }}>
                    <Typography variant="overline" color="secondary" sx={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: 1 }}>
                      {selectedProduct.kategoria} {selectedProduct.podkategoria ? `/ ${selectedProduct.podkategoria}` : ''}
                    </Typography>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mt: 1, mb: 3 }}>
                      {selectedProduct.nazwa}
                    </Typography>

                    <Box sx={{ mb: 4 }}>
                      {selectedProduct.cena_promocyjna ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="h6" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>{selectedProduct.cena_jednostkowa.toFixed(2)} zł</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h3" color="primary.main" sx={{ fontWeight: 700 }}>{selectedProduct.cena_promocyjna.toFixed(2)} zł</Typography>
                            <Chip label="Promocja" color="primary" />
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="h3" color="primary.main" sx={{ fontWeight: 700 }}>{selectedProduct.cena_jednostkowa.toFixed(2)} zł</Typography>
                      )}
                    </Box>

                    <Box sx={{ mt: 'auto' }}>
                      <Button
                        fullWidth
                        variant={selectedProduct.ilosc_dostepna > 0 ? "contained" : "outlined"}
                        color="primary"
                        disabled={selectedProduct.ilosc_dostepna === 0}
                        onClick={() => handleAddToCart(selectedProduct)}
                        startIcon={<ShoppingCart />}
                        size="large"
                        sx={{ py: 2, fontSize: '1.2rem', borderRadius: 2 }}
                      >
                        {selectedProduct.ilosc_dostepna > 0 ? 'Dodaj do koszyka' : 'Wyprzedane'}
                      </Button>
                      {selectedProduct.ilosc_dostepna > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center', display: 'block' }}>
                          Dostępność: {selectedProduct.ilosc_dostepna} szt.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="h5" sx={{ mb: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', pb: 1 }}>Specyfikacja techniczna</Typography>
                {selectedProduct.atrybuty && selectedProduct.atrybuty.length > 0 ? (
                  <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mb: 4 }}>
                    {selectedProduct.atrybuty.map((attr, idx) => (
                      <Box component="li" key={idx} sx={{ display: 'flex', p: 1.5, bgcolor: idx % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'transparent', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ width: { xs: '50%', sm: 180 }, flexShrink: 0, pr: 2 }}>{attr.nazwa}:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1, wordBreak: 'break-word' }}>{attr.wartosc}</Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Brak szczegółowej specyfikacji dla tego produktu.</Typography>
                )}

                {selectedProduct.opis && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" sx={{ mb: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 1 }}>Opis produktu</Typography>
                    <Box sx={{
                      color: 'text.primary',
                      lineHeight: 1.7,
                      '& ul': { ml: 4, mb: 2, listStyleType: 'disc' },
                      '& ol': { ml: 4, mb: 2, listStyleType: 'decimal' },
                      '& li': { mb: 0.5 },
                      '& p': { mb: 1 }
                    }}
                      dangerouslySetInnerHTML={{ __html: selectedProduct.opis }} />
                  </Box>
                )}

                {/* --- SEKCJA OPINII --- */}
                <Box sx={{ mt: 6, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <Typography variant="h5" sx={{ mb: 3 }}>Opinie Klientów ({Array.isArray(productReviews) ? productReviews.length : 0})</Typography>

                  <Paper sx={{ p: 3, mb: 4, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>Podziel się swoją opinią</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="body2">Twoja ocena:</Typography>
                      <Rating
                        value={newReviewRating}
                        onChange={(event, newValue) => setNewReviewRating(newValue || 1)}
                        size="large"
                        readOnly={isReviewDisabled}
                      />
                    </Box>

                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder={placeholderText}
                      variant="outlined"
                      value={newReviewText}
                      onChange={(e) => setNewReviewText(e.target.value)}
                      disabled={isReviewDisabled}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: isReviewDisabled ? '#d1d5db' : '#ffffff',
                          borderRadius: 3,
                          color: '#000000',
                          '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
                          '&:hover fieldset': { borderColor: '#1976d2' },
                          '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                        },
                        '& .MuiInputBase-input::placeholder': {
                          color: '#000000',
                          opacity: 0.8,
                          fontWeight: isReviewDisabled ? 600 : 400
                        },
                        '& .MuiInputBase-input.Mui-disabled::placeholder': {
                          color: '#000000',
                          opacity: 0.8
                        },
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#000000',
                        }
                      }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                      {!user ? (
                        <Button variant="outlined" onClick={() => setIsLoginOpen(true)}>
                          Zaloguj się, aby ocenić
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleSubmitReview}
                          disabled={isReviewDisabled || !newReviewText.trim()}
                        >
                          Dodaj opinię
                        </Button>
                      )}
                    </Box>
                  </Paper>

                  {Array.isArray(productReviews) && productReviews.length === 0 ? (
                    <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>Ten produkt nie ma jeszcze opinii. Bądź pierwszy!</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {Array.isArray(productReviews) && productReviews.map(review => (
                        <Card key={review.id} sx={{ bgcolor: 'background.default', p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.1)', boxShadow: 'none' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: '#1976d2', color: '#ffffff', fontSize: '0.9rem' }}>
                                {(review.imie_klienta || 'U').charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#000000' }}>
                                {review.imie_klienta || 'Anonim'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.6)', ml: 1 }}>
                                {review.data_wystawienia || ''}
                              </Typography>
                            </Box>
                            <Rating value={review.ocena || 5} readOnly size="small" />
                          </Box>
                          <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#000000', mt: 1 }}>
                            {review.tresc || ''}
                          </Typography>

                          {review.odpowiedz_pracownika && (
                            <Box sx={{ mt: 2, ml: { xs: 2, sm: 5 }, p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2, borderLeft: '4px solid #1976d2' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <MessageSquare size={16} color="#1976d2" />
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1976d2' }}>
                                  Odpowiedź sklepu
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.6)', ml: 'auto' }}>
                                  {review.data_odpowiedzi || ''}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: '#000000', fontStyle: 'italic', lineHeight: 1.6 }}>
                                {review.odpowiedz_pracownika}
                              </Typography>
                            </Box>
                          )}
                        </Card>
                      ))}
                    </Box>
                  )}
                </Box>
                {/* --- KONIEC SEKCJI OPINII --- */}

              </Box>
            </Paper>
          </Box>
        ) : !loading && !error ? (
          <>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2, color: '#000000' }}>
              <Laptop size={32} color="#2979ff" /> Kategorie
            </Typography>

            {categories.length === 0 ? (
              <Alert severity="info" sx={{ mb: 4 }}>Brak kategorii w bazie. Dodaj je w Panelu Administratora!</Alert>
            ) : (
              <Grid container spacing={2} sx={{ mb: 6 }}>
                {categories.map(cat => (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={cat.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        transition: '0.3s',
                        bgcolor: 'background.paper',
                        borderRadius: '12px',
                        border: selectedCategoryId === cat.id ? '2px solid #2979ff' : '2px solid transparent',
                        boxShadow: selectedCategoryId === cat.id ? '0 4px 20px rgba(41, 121, 255, 0.3)' : 'none',
                        '&:hover': { transform: 'translateY(-3px)', borderColor: '#1612e2ff', borderWidth: 2, borderStyle: 'solid', boxShadow: '0 4px 20px rgba(0,230,118,0.2)' }
                      }}
                      onClick={() => { setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id); setSelectedSubcategoryId(null); }}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="text.primary" sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' }, lineHeight: 1.2 }}>
                          {cat.nazwa_kategorii}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {selectedCategoryId === null ? (
              <>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2, color: '#000000' }}>
                  <Tag size={32} color="#2979ff" /> Polecane Produkty
                </Typography>

                {products.length === 0 && <Alert severity="info">Brak produktów w bazie. Dodaj je w Django!</Alert>}

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'flex-start' }}>
                  {products.slice(0, 8).map(renderVerticalProductCard)}
                </Box>

                {categories.map(cat => {
                  const catProducts = products.filter(p => p.kategoria_id === cat.id).slice(0, 10);
                  if (catProducts.length === 0) return null;

                  return (
                    <Box key={`cat-section-${cat.id}`} sx={{ mt: 8 }}>
                      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2, color: '#000000' }}>
                        {cat.nazwa_kategorii}
                      </Typography>

                      <Box sx={{
                        display: 'flex',
                        overflowX: 'auto',
                        gap: 3,
                        pb: 2,
                        pt: 1,
                        px: 1,
                        width: '100%',
                        scrollSnapType: 'x mandatory',
                        '&::-webkit-scrollbar': { height: 8 },
                        '&::-webkit-scrollbar-thumb': { backgroundColor: '#4e82b9', borderRadius: 4 },
                        '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4 },
                        '& > *': { scrollSnapAlign: 'start' }
                      }}>
                        {catProducts.map(renderVerticalProductCard)}
                      </Box>
                    </Box>
                  );
                })}
              </>
            ) : (
              <Box>
                <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ChevronRight size={18} />}
                    onClick={() => setIsFilterDrawerOpen(true)}
                    sx={{ color: '#000000', borderColor: 'rgba(0,0,0,0.3)' }}
                  >
                    Filtruj / Podkategorie
                  </Button>
                </Box>

                <Drawer anchor="left" open={isFilterDrawerOpen} onClose={() => setIsFilterDrawerOpen(false)}>
                  <Box sx={{ width: 260, p: 3, bgcolor: 'background.default', height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#000000', fontWeight: 700 }}>Filtruj</Typography>
                      <IconButton onClick={() => setIsFilterDrawerOpen(false)}><X /></IconButton>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Button fullWidth variant={selectedSubcategoryId === null ? 'contained' : 'text'} color="primary"
                      sx={{ justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left', mb: 1, color: '#000000' }}
                      onClick={() => { setSelectedSubcategoryId(null); setIsFilterDrawerOpen(false); }}>
                      Wszystkie modele
                    </Button>
                    {categories.find(c => c.id === selectedCategoryId)?.podkategorie.map(sub => (
                      <Button key={sub.id} fullWidth variant={selectedSubcategoryId === sub.id ? 'contained' : 'text'} color="secondary"
                        sx={{ justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left', mb: 1, color: '#000000' }}
                        onClick={() => { setSelectedSubcategoryId(sub.id); setIsFilterDrawerOpen(false); }}>
                        <ChevronRight size={16} style={{ marginRight: 8, flexShrink: 0 }} /> {sub.nazwa}
                      </Button>
                    ))}
                  </Box>
                </Drawer>

                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                  <Box sx={{ display: { xs: 'none', md: 'block' }, width: 210, flexShrink: 0 }}>
                    <Paper sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, position: 'sticky', top: '80px' }}>
                      <Typography variant="h6" sx={{ mb: 2, pb: 1, borderBottom: '1px solid rgba(0,0,0,0.1)', fontWeight: 700 }}>Filtruj</Typography>
                      <Button fullWidth variant={selectedSubcategoryId === null ? 'contained' : 'text'} color="primary"
                        sx={{ justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left', mb: 0.5 }}
                        onClick={() => setSelectedSubcategoryId(null)}>
                        Pokaż wszystko
                      </Button>
                      {categories.find(c => c.id === selectedCategoryId)?.podkategorie.map(sub => (
                        <Button key={sub.id} fullWidth variant={selectedSubcategoryId === sub.id ? 'contained' : 'text'} color="secondary"
                          sx={{ justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left', mb: 0.5 }}
                          onClick={() => setSelectedSubcategoryId(sub.id)}>
                          <ChevronRight size={16} style={{ marginRight: 6, flexShrink: 0 }} /> {sub.nazwa}
                        </Button>
                      ))}
                    </Paper>
                  </Box>

                  <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {products
                      .filter(p => p.kategoria_id === selectedCategoryId && (selectedSubcategoryId === null || p.podkategoria_id === selectedSubcategoryId))
                      .map((product) => (
                        <Card key={product.id}
                          sx={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.18)' } }}
                          onClick={() => { setSelectedProduct(product); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>

                          <Box sx={{ width: { xs: 110, sm: 160 }, flexShrink: 0, bgcolor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1.5, borderRight: '1px solid rgba(0,0,0,0.07)' }}>
                            <img src={getImageUrl(product.zdjecie)} alt={product.nazwa} style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }} />
                          </Box>

                          <Box sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                            <Typography variant="caption" color="secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>{product.kategoria}</Typography>
                            <Typography variant="subtitle1" component="h2" fontWeight={700} sx={{ mt: 0.5, lineHeight: 1.3, color: '#ffffff' }}>
                              {product.nazwa}
                            </Typography>
                            {product.ilosc_dostepna === 0 && <Chip label="Brak w magazynie" color="error" size="small" variant="outlined" sx={{ mt: 1, width: 'fit-content' }} />}
                            {product.ilosc_dostepna > 0 && <Typography variant="caption" sx={{ color: '#00ff00', mt: 0.5 }}>✓ Dostępny ({product.ilosc_dostepna} szt.)</Typography>}
                          </Box>

                          <Box sx={{ flexShrink: 0, p: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 1.5, borderLeft: '1px solid rgba(0,0,0,0.07)', minWidth: { xs: 110, sm: 160 } }}>
                            {product.cena_promocyjna ? (
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary', display: 'block' }}>{product.cena_jednostkowa.toFixed(2)} zł</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{product.cena_promocyjna.toFixed(2)} zł</Typography>
                              </Box>
                            ) : (
                              <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff' }}>{product.cena_jednostkowa.toFixed(2)} zł</Typography>
                            )}
                            <Button
                              size="small"
                              variant={product.ilosc_dostepna > 0 ? 'contained' : 'outlined'}
                              color="primary"
                              disabled={product.ilosc_dostepna === 0}
                              onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                              startIcon={<ShoppingCart size={14} />}
                            >
                              {product.ilosc_dostepna > 0 ? 'Do koszyka' : 'Brak'}
                            </Button>
                          </Box>
                        </Card>
                      ))}
                    {products.filter(p => p.kategoria_id === selectedCategoryId && (selectedSubcategoryId === null || p.podkategoria_id === selectedSubcategoryId)).length === 0 && (
                      <Alert severity="info">Brak produktów w wybranej kategorii/podkategorii.</Alert>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </>
        ) : null}
      </Container>

      {/* --- PANEL KOSZYKA BOCZNEGO --- */}
      <Drawer anchor="right" open={isCartOpen} onClose={toggleCart}>
        <Box sx={{ width: { xs: 300, sm: 400 }, p: 3, bgcolor: 'background.default', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#000000' }}>Twój koszyk</Typography>
            <IconButton onClick={toggleCart}><X /></IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {cart.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ mt: 4, color: '#000000' }}>Koszyk jest pusty.</Typography>
          ) : (
            <>
              <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {cart.map((item) => (
                  <Box key={item.id} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                    <Box component="img" src={getImageUrl(item.zdjecie)} sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ lineHeight: 1.2, mb: 0.5, color: '#000000' }}>{item.nazwa}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#000000' }}>{((item.cena_promocyjna || item.cena_jednostkowa) * item.quantity).toFixed(2)} zł</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <IconButton size="small" onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1} sx={{ border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1, p: 0.5, color: '#000000' }}><Minus size={14} /></IconButton>
                        <Typography variant="body2" sx={{ width: 20, textAlign: 'center', color: '#000000' }}>{item.quantity}</Typography>
                        <IconButton size="small" onClick={() => updateQuantity(item.id, 1)} disabled={item.quantity >= item.ilosc_dostepna} sx={{ border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1, p: 0.5, color: '#000000' }}><Plus size={14} /></IconButton>
                        <IconButton size="small" color="error" onClick={() => removeFromCart(item.id)} sx={{ ml: 'auto' }}><Trash2 size={16} /></IconButton>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
              <Box sx={{ pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)', mt: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#000000' }}>Razem:</Typography>
                  <Typography variant="h6" sx={{ color: '#000000', fontWeight: 700 }}>{subtotal.toFixed(2)} zł</Typography>
                </Box>
                <Button fullWidth variant="contained" color="primary" size="large" onClick={handleCheckoutClick}>
                  Przejdź do kasy ({cartItemsCount} prod.)
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* --- WIZARD KASY --- */}
      <Dialog open={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ p: 3, pb: 1 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {['Koszyk i Rabaty', 'Dane i Dostawa', 'Płatność i Podsumowanie'].map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ minHeight: '400px', p: 4, bgcolor: 'background.default' }}>

          {activeStep === 0 && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={7}>
                <Typography variant="h6" color="#000000" sx={{ mb: 3 }}>Produkty w koszyku</Typography>
                {cart.map((item) => (
                  <Box key={item.id} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', bgcolor: 'background.paper', p: 2, borderRadius: 2 }}>
                    <Box component="img" src={getImageUrl(item.zdjecie)} sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1">{item.nazwa}</Typography>
                      <Typography variant="body2" color="text.secondary">Ilość: {item.quantity} szt.</Typography>
                    </Box>
                    <Typography variant="h6" color="primary.main">{((item.cena_promocyjna || item.cena_jednostkowa) * item.quantity).toFixed(2)} zł</Typography>
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><Tag size={20} /> Kod Rabatowy</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField size="small" fullWidth placeholder="Twój kod..." value={discountCode} onChange={e => setDiscountCode(e.target.value)} disabled={!!discountApplied} />
                    <Button variant="contained" color="secondary" onClick={handleApplyDiscount} disabled={!discountCode || !!discountApplied}>Dodaj</Button>
                  </Box>
                  {discountError && <Typography variant="caption" sx={{ color: '#ffffff' }}>{discountError}</Typography>}
                  {discountApplied && <Alert severity="success" sx={{ mt: 1, p: 0.5, px: 2 }}>Zastosowano rabat: -{discountApplied.procent}%</Alert>}
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="subtitle1" sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>Wartość koszyka: <span>{subtotal.toFixed(2)} zł</span></Typography>
                  {discountApplied && (
                    <Typography variant="subtitle1" color="primary" sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      Rabat ({discountApplied.procent}%): <span>- {discountAmount.toFixed(2)} zł</span>
                    </Typography>
                  )}
                  <Typography variant="h5" sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, fontWeight: 'bold' }}>
                    Razem: <span style={{ color: '#00e676' }}>{(subtotal - discountAmount).toFixed(2)} zł</span>
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {activeStep === 1 && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                {!user ? (
                  <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Dane kupującego (Gość)</Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>Masz już konto? <span style={{ color: '#00e676', cursor: 'pointer' }} onClick={() => { setIsCheckoutOpen(false); setIsLoginOpen(true) }}>Zaloguj się</span>.</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField label="Imię *" size="small" fullWidth value={checkoutData.imie} onChange={e => setCheckoutData({ ...checkoutData, imie: e.target.value })} />
                      <TextField label="Nazwisko *" size="small" fullWidth value={checkoutData.nazwisko} onChange={e => setCheckoutData({ ...checkoutData, nazwisko: e.target.value })} />
                    </Box>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)' }} />
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>Chcesz założyć konto przy okazji?</Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>Podaj hasło. Zarejestrujemy Cię automatycznie po opłaceniu zamówienia.</Typography>
                    <TextField label="Hasło (opcjonalnie)" type="password" size="small" fullWidth value={checkoutData.haslo_rejestracja} onChange={e => setCheckoutData({ ...checkoutData, haslo_rejestracja: e.target.value })} />
                  </Paper>
                ) : (
                  <Alert severity="info" sx={{ mb: 3 }}>Jesteś zalogowany jako: <strong>{user.username}</strong>. Dane zamówienia zostaną powiązane z Twoim kontem.</Alert>
                )}
                <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Kontakt i Adres dostawy</Typography>
                  <TextField label="E-mail do powiadomień *" size="small" type="email" fullWidth sx={{ mb: 2 }} value={checkoutData.email} onChange={e => setCheckoutData({ ...checkoutData, email: e.target.value })} />

                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField select label="Kierunkowy" size="small" sx={{ width: '35%' }} value={checkoutData.kierunkowy} onChange={e => setCheckoutData({ ...checkoutData, kierunkowy: e.target.value })}>
                      <MenuItem value="+48">+48 (PL)</MenuItem>
                      <MenuItem value="+44">+44 (UK)</MenuItem>
                      <MenuItem value="+49">+49 (DE)</MenuItem>
                      <MenuItem value="+1">+1 (US)</MenuItem>
                    </TextField>
                    <TextField label="Nr telefonu *" size="small" fullWidth value={checkoutData.nr_tel} onChange={e => setCheckoutData({ ...checkoutData, nr_tel: e.target.value })} />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField label="Ulica" size="small" fullWidth disabled={isOdbior} value={checkoutData.ulica} onChange={e => setCheckoutData({ ...checkoutData, ulica: e.target.value })} />
                    <TextField label="Nr domu/lokalu" size="small" sx={{ width: '40%' }} disabled={isOdbior} value={checkoutData.nr_domu} onChange={e => setCheckoutData({ ...checkoutData, nr_domu: e.target.value })} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField label="Kod pocztowy" size="small" sx={{ width: '40%' }} disabled={isOdbior} value={checkoutData.kod_pocztowy} onChange={e => setCheckoutData({ ...checkoutData, kod_pocztowy: e.target.value })} />
                    <TextField label="Miasto" size="small" fullWidth disabled={isOdbior} value={checkoutData.miasto} onChange={e => setCheckoutData({ ...checkoutData, miasto: e.target.value })} />
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" color="#000000" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><Truck size={20} /> Metoda dostawy</Typography>
                <FormControl component="fieldset" fullWidth>
                  <RadioGroup value={checkoutData.id_dostawy} onChange={e => setCheckoutData({ ...checkoutData, id_dostawy: parseInt(e.target.value) })}>
                    {deliveryOptions.length === 0 ? (
                      <Typography color="error" sx={{ mt: 2 }}>Brak metod dostawy w bazie. Dodaj je w Panelu Admina!</Typography>
                    ) : (
                      deliveryOptions.map(dostawa => (
                        <Paper key={dostawa.id} sx={{ mb: 1, p: 1, px: 2, border: checkoutData.id_dostawy === dostawa.id ? '1px solid #00e676' : '1px solid transparent', bgcolor: 'background.paper' }}>
                          <FormControlLabel
                            value={dostawa.id}
                            control={<Radio color="primary" />}
                            label={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '250px' }}>
                                <Typography>{dostawa.nazwa}</Typography>
                                <Typography color="primary.main" fontWeight="bold">{dostawa.cena === 0 ? 'Darmowa' : `${dostawa.cena.toFixed(2)} zł`}</Typography>
                              </Box>
                            }
                            sx={{ width: '100%', m: 0 }}
                          />
                        </Paper>
                      ))
                    )}
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>
          )}

          {activeStep === 2 && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#000000' }}>
                  <CreditCard size={20} color="#000000" /> Metoda płatności
                </Typography>

                <FormControl component="fieldset" fullWidth>
                  <RadioGroup value={checkoutData.id_metody_platnosci} onChange={e => setCheckoutData({ ...checkoutData, id_metody_platnosci: parseInt(e.target.value) })}>
                    {paymentMethods.length === 0 ? (
                      <Typography color="error">Brak metod płatności w bazie. Dodaj je w Panelu Administratora (Django).</Typography>
                    ) : (
                      paymentMethods.map(method => (
                        <FormControlLabel
                          key={method.id}
                          value={method.id}
                          control={<Radio sx={{ color: 'rgba(0,0,0,0.5)', '&.Mui-checked': { color: '#1976d2' } }} />}
                          label={method.nazwa}
                          sx={{ '& .MuiFormControlLabel-label': { color: '#000000', fontWeight: 500 } }}
                        />
                      ))
                    )}
                  </RadioGroup>
                </FormControl>

                <Box sx={{ mt: 4, bgcolor: 'background.paper', p: 2, borderRadius: 2 }}>
                  <FormControlLabel
                    control={<Checkbox color="primary" checked={checkoutData.akceptacja_regulaminu} onChange={e => setCheckoutData({ ...checkoutData, akceptacja_regulaminu: e.target.checked })} />}
                    label={<Typography variant="body2">Oświadczam, że zapoznałem/am się z regulaminem sklepu i polityką prywatności oraz akceptuję ich treść. *</Typography>}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, bgcolor: '#0d233a', border: '1px solid #00e676', borderRadius: 3 }}>
                  <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', fontWeight: 'bold' }}>Podsumowanie Zamówienia</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">Wartość produktów:</Typography>
                    <Typography>{subtotal.toFixed(2)} zł</Typography>
                  </Box>
                  {discountApplied && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography color="primary.main">Rabat naliczony:</Typography>
                      <Typography color="primary.main">- {discountAmount.toFixed(2)} zł</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography color="text.secondary">Koszt dostawy ({selectedDelivery.nazwa}):</Typography>
                    <Typography>{deliveryCost.toFixed(2)} zł</Typography>
                  </Box>
                  <Divider sx={{ my: 2, borderColor: 'rgba(0, 230, 118, 0.3)' }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Do zapłaty:</Typography>
                    <Typography variant="h4" sx={{ color: '#00e676', fontWeight: 800 }}>{totalToPay.toFixed(2)} zł</Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}

        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: 'background.paper', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {activeStep === 0 && <Button onClick={() => setIsCheckoutOpen(false)} color="inherit" sx={{ mr: 'auto' }}>Przerwij</Button>}
          {activeStep > 0 && <Button onClick={handlePrevStep} color="inherit" sx={{ mr: 'auto' }}>Wróć</Button>}

          {activeStep < 2 ? (
            <Button variant="contained" color="primary" onClick={handleNextStep} size="large" sx={{ px: 4 }}>Dalej</Button>
          ) : (
            <Button variant="contained" color="primary" onClick={handlePlaceOrder} size="large" sx={{ px: 5 }} disabled={!checkoutData.akceptacja_regulaminu || checkoutData.id_metody_platnosci === ''}>
              Zamawiam i płacę
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={orderSuccess} autoHideDuration={6000} onClose={() => setOrderSuccess(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setOrderSuccess(false)} severity="success" sx={{ width: '100%', fontSize: '1.1rem' }} icon={<CheckCircle />}>
          Zamówienie w drodze do realizacji! Dziękujemy za zaufanie.
        </Alert>
      </Snackbar>

      {/* --- DODANY SNACKBAR Z OSTRZEŻENIEM O MAGAZYNIE --- */}
      <Snackbar open={!!cartError} autoHideDuration={4000} onClose={() => setCartError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setCartError('')} severity="warning" sx={{ width: '100%', fontSize: '1.1rem' }} icon={<AlertTriangle />}>
          {cartError}
        </Alert>
      </Snackbar>

      {/* --- MODALE REJESTRACJI / LOGOWANIA --- */}
      <Dialog open={isLoginOpen} onClose={() => setIsLoginOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', pt: 3 }}>Logowanie do konta</DialogTitle>
        <DialogContent>
          {loginError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{loginError}</Alert>}
          <TextField margin="dense" label="Nazwa użytkownika (Login)" name="username" value={loginData.username} onChange={handleLoginChange} fullWidth variant="outlined" sx={{ mt: 1 }} />
          <TextField margin="dense" label="Hasło" type="password" name="password" value={loginData.password} onChange={handleLoginChange} fullWidth variant="outlined" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setIsLoginOpen(false)} color="inherit">Anuluj</Button>
          <Button onClick={handleLoginSubmit} variant="contained" color="primary">Zaloguj się</Button>
        </DialogActions>
        <Divider />
        <Box sx={{ textAlign: 'center', py: 2, bgcolor: 'background.paper' }}>
          <Typography variant="body2" color="text.secondary">Nie masz jeszcze konta?</Typography>
          <Button color="secondary" onClick={openRegister} sx={{ mt: 1, fontWeight: 'bold' }}>Zarejestruj się</Button>
        </Box>
      </Dialog>

      <Dialog open={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', pt: 3 }}>Rejestracja nowego konta</DialogTitle>
        <DialogContent>
          {registerError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{registerError}</Alert>}
          <TextField margin="dense" label="Nazwa użytkownika (Login)" name="username" value={registerData.username} onChange={handleRegisterChange} fullWidth variant="outlined" sx={{ mt: 1 }} />
          <TextField margin="dense" label="Hasło" type="password" name="password" value={registerData.password} onChange={handleRegisterChange} fullWidth variant="outlined" />
          <TextField margin="dense" label="Adres E-mail" type="email" name="email" value={registerData.email} onChange={handleRegisterChange} fullWidth variant="outlined" />
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField margin="dense" label="Imię" name="imie" value={registerData.imie} onChange={handleRegisterChange} fullWidth variant="outlined" />
            <TextField margin="dense" label="Nazwisko" name="nazwisko" value={registerData.nazwisko} onChange={handleRegisterChange} fullWidth variant="outlined" />
          </Box>
          <TextField margin="dense" label="Numer telefonu" name="nr_tel" value={registerData.nr_tel} onChange={handleRegisterChange} fullWidth variant="outlined" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setIsRegisterOpen(false)} color="inherit">Anuluj</Button>
          <Button onClick={handleRegisterSubmit} variant="contained" color="primary">Załóż konto</Button>
        </DialogActions>
      </Dialog>

      {/* --- MODAL ZAMÓWIEŃ --- */}
      <Dialog open={isOrdersOpen} onClose={() => setIsOrdersOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{
          fontWeight: 'bold',
          bgcolor: '#1976d2',
          color: 'white',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          Moje zamówienia
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: '#f5f5f5' }}>
          {userOrders.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" sx={{ color: '#000000' }}>
                Nie masz jeszcze żadnych zamówień.
              </Typography>
              <Button
                variant="contained"
                sx={{ mt: 2, bgcolor: '#1976d2' }}
                onClick={() => setIsOrdersOpen(false)}
              >
                Rozpocznij zakupy
              </Button>
            </Box>
          ) : (
            userOrders.map((order) => (
              <Paper key={order.id} sx={{ mb: 2, p: 2, bgcolor: '#ffffff', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#1976d2' }}>
                    Zamówienie #{order.id}
                  </Typography>
                  <Chip
                    label={order.status}
                    sx={{
                      bgcolor: (order.status || '').toLowerCase() === 'dostarczone' ? '#4caf50' :
                        (order.status || '').toLowerCase() === 'anulowane' ? '#f44336' : '#1976d2',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#666666' }}>
                  Data: {order.data_utworzenia}
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ mt: 1, color: '#000000' }}>
                  Kwota: {order.suma} zł
                </Typography>

                {/* MODUŁ REKLAMACJI */}
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {order.ma_reklamacje ? (
                    <Chip label="Reklamacja w toku" color="warning" size="small" variant="outlined" icon={<AlertTriangle size={14} />} />
                  ) : complaintData.orderId === order.id ? (
                    <Box sx={{ width: '100%', mt: 1 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Opisz dokładnie powód reklamacji..."
                        value={complaintData.text}
                        onChange={(e) => setComplaintData({ ...complaintData, text: e.target.value })}
                        sx={{
                          mb: 1,
                          '& .MuiOutlinedInput-root': { bgcolor: '#f9fafb', color: '#000000' }
                        }}
                      />
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button size="small" sx={{ color: '#666666' }} onClick={() => setComplaintData({ orderId: null, text: '' })}>
                          Anuluj
                        </Button>
                        <Button size="small" variant="contained" color="error" onClick={() => handleSendComplaint(order.id)}>
                          Wyślij reklamację
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Button size="small" sx={{ color: '#d32f2f' }} onClick={() => setComplaintData({ orderId: order.id, text: '' })}>
                      Zgłoś reklamację
                    </Button>
                  )}
                </Box>

              </Paper>
            ))
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#ffffff', borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setIsOrdersOpen(false)} sx={{ color: '#1976d2' }}>
            Zamknij
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- MODAL WIADOMOŚCI OD SKLEPU --- */}
      <Dialog open={isMessagesOpen} onClose={() => setIsMessagesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#1976d2', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          Wiadomości i statusy reklamacji
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: '#f5f5f5' }}>
          {userComplaints.filter(c => c.wiadomosci.some(w => w.autor === 'SKLEP')).length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" sx={{ color: '#000000' }}>Brak nowych wiadomości z centrum obsługi.</Typography>
            </Box>
          ) : (
            userComplaints.filter(c => c.wiadomosci.some(w => w.autor === 'SKLEP')).map((comp) => (
              <Paper key={comp.id} sx={{ mb: 2, p: 2, bgcolor: '#ffffff', borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#1976d2', mb: 2 }}>Konwersacja do zamówienia #{comp.zamowienie_id}</Typography>

                <Box sx={{ maxHeight: 300, overflowY: 'auto', mb: 2, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                    <Paper sx={{ p: 1.5, maxWidth: '80%', bgcolor: '#ffffff', color: '#000000', borderRadius: 2, boxShadow: 1 }}>
                      <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>Twoje zgłoszenie ({comp.data_zgloszenia})</Typography>
                      <Typography variant="body2" fontStyle="italic">{comp.opis}</Typography>
                    </Paper>
                  </Box>
                  {comp.wiadomosci.map((msg, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: msg.autor === 'KLIENT' ? 'flex-end' : 'flex-start', mb: 2 }}>
                      <Paper sx={{ p: 1.5, maxWidth: '80%', bgcolor: msg.autor === 'KLIENT' ? '#1976d2' : '#ffffff', color: msg.autor === 'KLIENT' ? '#ffffff' : '#000000', borderRadius: 2, borderLeft: msg.autor === 'SKLEP' ? '4px solid #1976d2' : 'none', boxShadow: 1 }}>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5 }}>
                          {msg.autor === 'SKLEP' ? 'Obsługa Sklepu' : 'Ty'} • {msg.data_wyslania}
                        </Typography>
                        <Typography variant="body2">{msg.tresc}</Typography>
                      </Paper>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                  <TextField fullWidth multiline rows={2} placeholder="Napisz odpowiedź do obsługi sklepu..." value={customerReplies[comp.id] || ''} onChange={(e) => setCustomerReplies({ ...customerReplies, [comp.id]: e.target.value })} sx={{ mb: 1, '& .MuiOutlinedInput-root': { bgcolor: '#f9fafb', color: '#000000' } }} />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" color="primary" size="small" sx={{ bgcolor: '#1976d2' }} disabled={!customerReplies[comp.id]?.trim()} onClick={() => handleSendCustomerReply(comp.id)}>
                      Wyślij odpowiedź
                    </Button>
                  </Box>
                </Box>
              </Paper>
            ))
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#ffffff', borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setIsMessagesOpen(false)} sx={{ color: '#1976d2' }}>Zamknij</Button>
        </DialogActions>
      </Dialog>

      {/* --- MODAL EDYCJI PROFILU --- */}
      <Dialog open={isProfileEditOpen} onClose={() => setIsProfileEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
          fontWeight: 'bold',
          bgcolor: '#1976d2',
          color: 'white',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          Ustawienia konta
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: '#f5f5f5' }}>
          <TextField
            label="Imię"
            fullWidth
            margin="normal"
            value={editProfileData.imie || ''}
            onChange={(e) => setEditProfileData({ ...editProfileData, imie: e.target.value })}
            sx={{
              '& .MuiInputLabel-root': { color: 'rgba(0, 0, 0, 0.7)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#1976d2' },
              '& .MuiOutlinedInput-root': {
                color: '#000000',
                backgroundColor: '#ffffff',
                '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.23)' },
                '&:hover fieldset': { borderColor: '#1976d2' },
                '&.Mui-focused fieldset': { borderColor: '#1976d2' }
              }
            }}
          />
          <TextField
            label="Nazwisko"
            fullWidth
            margin="normal"
            value={editProfileData.nazwisko || ''}
            onChange={(e) => setEditProfileData({ ...editProfileData, nazwisko: e.target.value })}
            sx={{
              '& .MuiInputLabel-root': { color: 'rgba(0, 0, 0, 0.7)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#1976d2' },
              '& .MuiOutlinedInput-root': {
                color: '#000000',
                backgroundColor: '#ffffff',
                '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.23)' },
                '&:hover fieldset': { borderColor: '#1976d2' },
                '&.Mui-focused fieldset': { borderColor: '#1976d2' }
              }
            }}
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={editProfileData.email || ''}
            onChange={(e) => setEditProfileData({ ...editProfileData, email: e.target.value })}
            sx={{
              '& .MuiInputLabel-root': { color: 'rgba(0, 0, 0, 0.7)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#1976d2' },
              '& .MuiOutlinedInput-root': {
                color: '#000000',
                backgroundColor: '#ffffff',
                '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.23)' },
                '&:hover fieldset': { borderColor: '#1976d2' },
                '&.Mui-focused fieldset': { borderColor: '#1976d2' }
              }
            }}
          />
          <TextField
            label="Numer telefonu"
            fullWidth
            margin="normal"
            value={editProfileData.nr_tel || ''}
            onChange={(e) => setEditProfileData({ ...editProfileData, nr_tel: e.target.value })}
            sx={{
              '& .MuiInputLabel-root': { color: 'rgba(0, 0, 0, 0.7)' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#1976d2' },
              '& .MuiOutlinedInput-root': {
                color: '#000000',
                backgroundColor: '#ffffff',
                '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.23)' },
                '&:hover fieldset': { borderColor: '#1976d2' },
                '&.Mui-focused fieldset': { borderColor: '#1976d2' }
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#ffffff', borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setIsProfileEditOpen(false)} sx={{ color: '#666666' }}>
            Anuluj
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
          >
            Zapisz zmiany
          </Button>
        </DialogActions>
      </Dialog>

    </ThemeProvider>
  );
}