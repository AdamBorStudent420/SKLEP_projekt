import React, { useState, useEffect, useRef } from 'react';
import {
  ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar, Typography,
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton,
  Button, Card, CardContent, Divider, Avatar, Alert, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Autocomplete, GlobalStyles
} from '@mui/material';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Settings, LogOut, Menu,
  Clock, User, Plus, Trash2, ArrowLeft, Upload, ImageIcon, Search, List as ListIcon, Edit, Play
} from 'lucide-react';

// --- MOTYW PANELU ADMINA ---
const adminTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#3b82f6' },
    secondary: { main: '#10b981' },
    background: { default: '#0f172a', paper: '#1e293b' },
  },
  typography: { fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' },
  components: {
    MuiDrawer: { styleOverrides: { paper: { backgroundColor: '#0f172a', borderRight: '1px solid #334155' } } },
    MuiAppBar: { styleOverrides: { root: { backgroundColor: '#1e293b', borderBottom: '1px solid #334155', boxShadow: 'none' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } }
  }
});

const DRAWER_WIDTH = 260;
const API_BASE_URL = 'http://127.0.0.1:8000';

// --- WBUDOWANY EDYTOR WYSIWYG ---
const NativeWysiwyg = ({ value, onChange }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const handleCommand = (e, cmd) => {
    e.preventDefault();
    document.execCommand(cmd, false, null);
    handleInput();
  };

  return (
    <Box sx={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1, bgcolor: 'background.default', mt: 1, width: '100%' }}>
      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.2)', p: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" onMouseDown={(e) => handleCommand(e, 'bold')} sx={{ minWidth: 0, px: 2, color: '#fff', fontWeight: 'bold' }}>B</Button>
        <Button size="small" variant="outlined" onMouseDown={(e) => handleCommand(e, 'italic')} sx={{ minWidth: 0, px: 2, color: '#fff', fontStyle: 'italic' }}>I</Button>
        <Button size="small" variant="outlined" onMouseDown={(e) => handleCommand(e, 'insertUnorderedList')} sx={{ minWidth: 0, px: 2, color: '#fff' }}>• Lista</Button>
        <Button size="small" variant="outlined" onMouseDown={(e) => handleCommand(e, 'insertOrderedList')} sx={{ minWidth: 0, px: 2, color: '#fff' }}>1. Lista</Button>
      </Box>
      <Box
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        sx={{ p: 2, minHeight: '200px', outline: 'none', fontSize: '16px', '& ul, & ol': { pl: 3, my: 1 } }}
      />
    </Box>
  );
};

export default function AdminApp() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState('DASHBOARD');

  const [user, setUser] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(true);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // --- STANY DLA ZAMÓWIEŃ ---
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [filterOrderDate, setFilterOrderDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [internalNotes, setInternalNotes] = useState('');

  // --- STANY DLA KLIENTÓW ---
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchCustomerQuery, setSearchCustomerQuery] = useState('');

  // --- STANY DLA TOWARÓW ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [selectedListCategory, setSelectedListCategory] = useState('');
  const [selectedListSubcategory, setSelectedListSubcategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllProducts, setShowAllProducts] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [productForm, setProductForm] = useState({
    id: null, nazwa: '', producent: '', opis: '', cena_jednostkowa: '', cena_promocyjna: '',
    kategoria_id: '', podkategoria_id: '', ilosc_dostepna: 0, atrybuty: []
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [isNewAttrOpen, setIsNewAttrOpen] = useState(false);
  const [newAttrValue, setNewAttrValue] = useState('');
  const [newAttrTargetIndex, setNewAttrTargetIndex] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const username = localStorage.getItem('admin_username');
    if (token && username) { setUser({ username, token }); setIsLoginOpen(false); }
  }, []);

  useEffect(() => {
    if (user && activeView === 'ORDERS') fetchOrders();
    if (user && activeView === 'CUSTOMERS') fetchCustomers();
    if (user && (activeView === 'PRODUCTS' || activeView === 'PRODUCT_FORM')) {
      if (activeView === 'PRODUCTS') fetchProducts();
      fetchCategories();
    }
  }, [activeView, user]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLoginSubmit = async () => {
    setLoginError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/login/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginData)
      });
      if (!response.ok) throw new Error('Błędne dane logowania.');
      const data = await response.json();
      if (!data.is_staff) throw new Error('Brak uprawnień pracowniczych (is_staff).');
      localStorage.setItem('admin_token', data.token); localStorage.setItem('admin_username', data.username);
      setUser({ username: data.username, token: data.token }); setIsLoginOpen(false);
    } catch (err) { setLoginError(err.message); }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token'); localStorage.removeItem('admin_username');
    setUser(null); setIsLoginOpen(true);
  };

  // --- API FETCHERS ---
  const fetchOrders = async () => {
    setLoadingOrders(true); setOrdersError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/zamowienia/admin/lista`, {
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' }
      });
      if (response.status === 401 || response.status === 403) { handleLogout(); throw new Error('Sesja wygasła.'); }
      if (!response.ok) throw new Error('Nie udało się pobrać zamówień z bazy.');
      setOrders(await response.json());
    } catch (err) { setOrdersError(err.message); } finally { setLoadingOrders(false); }
  };

  const fetchCustomers = async () => {
    setLoadingCustomers(true); setCustomersError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/klienci`, {
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' }
      });
      if (response.status === 401 || response.status === 403) { handleLogout(); throw new Error('Sesja wygasła.'); }
      if (!response.ok) throw new Error('Nie udało się pobrać klientów z bazy.');
      setCustomers(await response.json());
    } catch (err) { setCustomersError(err.message); } finally { setLoadingCustomers(false); }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/produkty/`);
      if (res.ok) setProducts(await res.json());
    } catch (err) { console.error(err); } finally { setLoadingProducts(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/kategorie/`);
      if (res.ok) setCategories(await res.json());
    } catch (err) { console.error(err); }
  };

  // --- ZAMÓWIENIA LOGIKA ---
  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setInternalNotes(order.uwagi_wewnetrzne || '');
    setActiveView('ORDER_DETAILS');
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/zamowienia/admin/${orderId}/status`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Nie udało się zaktualizować statusu.');
      const updatedOrder = { ...selectedOrder, status: newStatus };
      setSelectedOrder(updatedOrder);
      setOrders(orders.map(o => o.id === orderId ? updatedOrder : o));
    } catch (e) { alert(e.message); }
  };

  const handleSaveNotes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/zamowienia/admin/${selectedOrder.id}/uwagi`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uwagi: internalNotes })
      });
      if (!res.ok) throw new Error('Nie udało się zapisać uwag.');
      setSelectedOrder({ ...selectedOrder, uwagi_wewnetrzne: internalNotes });
      setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, uwagi_wewnetrzne: internalNotes } : o));
      alert('Uwagi wewnętrzne zapisano pomyślnie!');
    } catch (e) { alert(e.message); }
  };

  // --- TOWARY LOGIKA ---
  const handleAddNewProductClick = () => {
    setIsEditing(false);
    setProductForm({
      id: null, nazwa: '', producent: '', opis: '', cena_jednostkowa: '', cena_promocyjna: '',
      kategoria_id: '', podkategoria_id: '', ilosc_dostepna: 0, atrybuty: []
    });
    setSelectedImage(null); setImagePreview(null); setActiveView('PRODUCT_FORM');
  };

  const handleEditProductClick = (product) => {
    setIsEditing(true);
    setProductForm({
      id: product.id, nazwa: product.nazwa || '', producent: product.producent || '', opis: product.opis || '',
      cena_jednostkowa: product.cena_jednostkowa || '', cena_promocyjna: product.cena_promocyjna || '',
      kategoria_id: product.kategoria_id || '', podkategoria_id: product.podkategoria_id || '',
      ilosc_dostepna: product.ilosc_dostepna || 0, atrybuty: product.atrybuty ? [...product.atrybuty] : []
    });
    setSelectedImage(null); setImagePreview(product.zdjecie ? `${API_BASE_URL}${product.zdjecie}` : null); setActiveView('PRODUCT_FORM');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const addAttribute = () => setProductForm({ ...productForm, atrybuty: [...productForm.atrybuty, { nazwa: '', wartosc: '' }] });
  const updateAttribute = (index, field, value) => {
    const updatedAtrybuty = [...productForm.atrybuty];
    updatedAtrybuty[index][field] = value;
    setProductForm({ ...productForm, atrybuty: updatedAtrybuty });
  };
  const removeAttribute = (index) => {
    const updatedAtrybuty = productForm.atrybuty.filter((_, i) => i !== index);
    setProductForm({ ...productForm, atrybuty: updatedAtrybuty });
  };

  const handleSaveProductSubmit = async () => {
    try {
      const formData = new FormData();
      const payloadData = {
        nazwa: productForm.nazwa, producent: productForm.producent, opis: productForm.opis,
        cena_jednostkowa: parseFloat(productForm.cena_jednostkowa), cena_promocyjna: productForm.cena_promocyjna ? parseFloat(productForm.cena_promocyjna) : null,
        ilosc_dostepna: parseInt(productForm.ilosc_dostepna, 10), kategoria_id: productForm.kategoria_id ? parseInt(productForm.kategoria_id) : null,
        podkategoria_id: productForm.podkategoria_id ? parseInt(productForm.podkategoria_id) : null, atrybuty: productForm.atrybuty.filter(a => a.nazwa.trim() !== '' && a.wartosc.trim() !== '')
      };
      formData.append('payload', JSON.stringify(payloadData));
      if (selectedImage) formData.append('zdjecie', selectedImage);

      const endpoint = isEditing ? `${API_BASE_URL}/api/admin/produkty/${productForm.id}/` : `${API_BASE_URL}/api/admin/produkty/`;
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Authorization': `Bearer ${user.token}` }, body: formData });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Błąd zapisu."); }
      setActiveView('PRODUCTS');
    } catch (err) { alert("Błąd: " + err.message); }
  };

  const getStatusProps = (status) => {
    const map = {
      'NOWE': { color: 'info', label: 'Nowe' }, 'OPLACONE': { color: 'secondary', label: 'Opłacone' },
      'W_REALIZACJI': { color: 'warning', label: 'W realizacji' }, 'WYSLANE': { color: 'primary', label: 'Wysłane' },
      'DOSTARCZONE': { color: 'success', label: 'Dostarczone' }, 'ANULOWANE': { color: 'error', label: 'Anulowane' }
    };
    return map[status] || { color: 'default', label: status };
  };

  // --- KOMPONENTY WIDOKÓW ---
  const renderDashboard = () => (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4 }}>
      <Typography variant="h3" fontWeight="bold" sx={{ mb: 1, textAlign: 'center' }}>Witaj w Panelu, {user?.username}!</Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 6, textAlign: 'center' }}>Wybierz moduł, którym chcesz zarządzać, korzystając z poniższych skrótów:</Typography>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, justifyContent: 'center', maxWidth: 1200, width: '100%', mx: 'auto', px: 2 }}>
        {[
          { id: 'ORDERS', title: 'Zamówienia', desc: 'Przeglądaj i realizuj zamówienia klientów', icon: <ShoppingBag size={48} color="#fff" />, bg: '#3b82f6' },
          { id: 'PRODUCTS', title: 'Magazyn i Towary', desc: 'Zarządzaj asortymentem i stanami magazynowymi', icon: <Package size={48} color="#fff" />, bg: '#10b981' },
          { id: 'CUSTOMERS', title: 'Klienci', desc: 'Przeglądaj bazę zarejestrowanych klientów', icon: <Users size={48} color="#fff" />, bg: '#8b5cf6' },
        ].map((tile) => (
          <Card key={tile.id} sx={{ flex: 1, bgcolor: tile.bg, display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 12px 24px rgba(0,0,0,0.3)' } }} onClick={() => setActiveView(tile.id)}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: 4, flexGrow: 1 }}>
              <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%', mb: 2 }}>{tile.icon}</Box>
              <Typography variant="h5" color="white" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>{tile.title}</Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.8)" sx={{ fontSize: { xs: '0.85rem', md: '0.9rem' } }}>{tile.desc}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );

  const renderOrders = () => {
    const filteredOrders = orders.filter(order => {
      if (!filterOrderDate) return true;
      const d = new Date(order.data_zamowienia);
      const orderDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return orderDateStr === filterOrderDate;
    });

    return (
      <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold">Zarządzanie Zamówieniami</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField type="date" size="small" label="Wybierz datę" InputLabelProps={{ shrink: true }} value={filterOrderDate} onChange={(e) => setFilterOrderDate(e.target.value)} sx={{ minWidth: 200 }} />
            {filterOrderDate && <Button variant="text" color="error" onClick={() => setFilterOrderDate('')}>Wyczyść</Button>}
            <Button variant="outlined" startIcon={<Clock size={16} />} onClick={fetchOrders}>Odśwież</Button>
          </Box>
        </Box>
        {ordersError && <Alert severity="error" sx={{ mb: 3 }}>{ordersError}</Alert>}
        <TableContainer component={Paper} sx={{ borderRadius: 2, width: '100%' }}>
          {loadingOrders ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : (
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                <TableRow>
                  <TableCell>ID</TableCell><TableCell>Klient</TableCell><TableCell>Data</TableCell>
                  <TableCell>Status</TableCell><TableCell align="right">Kwota</TableCell><TableCell align="center">Akcje</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Brak zamówień.</Typography></TableCell></TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const statusInfo = getStatusProps(order.status);
                    return (
                      <TableRow key={order.id} hover>
                        <TableCell fontWeight="bold">#{order.id}</TableCell><TableCell>{order.klient_dane}</TableCell><TableCell>{new Date(order.data_zamowienia).toLocaleString('pl-PL')}</TableCell>
                        <TableCell><Chip label={statusInfo.label} color={statusInfo.color} size="small" sx={{ fontWeight: 'bold' }} /></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{order.kwota ? `${order.kwota.toFixed(2)} zł` : '0.00 zł'}</TableCell>
                        <TableCell align="center"><Button size="small" variant="contained" color="secondary" onClick={() => openOrderDetails(order)}>Szczegóły / Realizacja</Button></TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Box>
    );
  };

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;
    const order = selectedOrder;
    const statusInfo = getStatusProps(order.status);
    const phone = order.telefon || 'Brak telefonu';
    const paymentMethod = order.metoda_platnosci || 'Nieznana';
    const items = order.pozycje || [];
    const history = order.historia || [];

    return (
      <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', pb: 8 }}>
        <Button startIcon={<ArrowLeft size={20} />} onClick={() => { setSelectedOrder(null); setActiveView('ORDERS'); }} sx={{ mb: 3, color: 'text.secondary' }}>Wróć do listy zamówień</Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" fontWeight="bold">Zamówienie #{order.id}</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip label={`Status: ${statusInfo.label}`} color={statusInfo.color} sx={{ fontWeight: 'bold', px: 1, fontSize: '1rem', height: 36 }} />
            {(order.status === 'NOWE' || order.status === 'OPLACONE') && (
              <Button variant="contained" color="primary" size="large" startIcon={<Play size={18} />} onClick={() => updateOrderStatus(order.id, 'W_REALIZACJI')}>Pobierz do realizacji</Button>
            )}
            {order.status === 'W_REALIZACJI' && (
              <Button variant="contained" color="success" size="large" onClick={() => updateOrderStatus(order.id, 'WYSLANE')}>Oznacz jako Wysłane</Button>
            )}
          </Box>
        </Box>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Lista produktów do spakowania</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow><TableCell sx={{ color: 'text.secondary' }}>Produkt</TableCell><TableCell align="center" sx={{ color: 'text.secondary' }}>Ilość</TableCell><TableCell align="right" sx={{ color: 'text.secondary' }}>Cena jedn.</TableCell><TableCell align="right" sx={{ color: 'text.secondary' }}>Suma</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, fontStyle: 'italic' }}>Brak produktów.</TableCell></TableRow>
                    ) : (
                      items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell fontWeight="bold">{item.nazwa}</TableCell><TableCell align="center"><Chip label={`${item.ilosc} szt.`} size="small" color="primary" variant="outlined" /></TableCell>
                          <TableCell align="right">{item.cena_sprzedazy} zł</TableCell><TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.suma} zł</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Dziennik zdarzeń (Logi statusów)</Typography>
              {history.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Brak logów w bazie.</Typography>
              ) : (
                <List sx={{ py: 0 }}>
                  {history.map((h, idx) => (
                    <ListItem key={idx} sx={{ px: 0, py: 1, borderBottom: idx !== history.length - 1 ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}>
                      <ListItemText
                        primary={<Box display="flex" justifyContent="space-between"><Typography variant="body1" fontWeight="bold">{getStatusProps(h.nowy_status).label}</Typography><Typography variant="caption" color="text.secondary">{new Date(h.data_zmiany).toLocaleString('pl-PL')}</Typography></Box>}
                        secondary={`Zmienione przez: ${h.zmienione_przez}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, mb: 4, borderRadius: 2, bgcolor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Dane klienta i kontakt</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">KLIENT</Typography><Typography variant="body1" sx={{ mb: 2 }}>{order.klient_dane}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">TELEFON KONTAKTOWY</Typography><Typography variant="body1" fontWeight="bold" color="primary.light">{phone}</Typography>
            </Paper>
            <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Dostawa i Płatność</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">ADRES DOSTAWY</Typography><Typography variant="body1" sx={{ mb: 2 }}>{order.adres_dostawy || 'Brak danych'}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">RODZAJ DOSTAWY</Typography><Typography variant="body1" sx={{ mb: 2 }}>{order.dostawa_nazwa || 'Brak danych'}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">METODA PŁATNOŚCI</Typography><Typography variant="body1" sx={{ mb: 2 }}>{paymentMethod}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">STATUS PŁATNOŚCI</Typography>
              <Typography variant="body1" sx={{ mb: 2 }} color={!order.status_platnosci || order.status_platnosci === 'Brak płatności' ? 'error.light' : 'success.light'} fontWeight="bold">{order.status_platnosci || 'Brak płatności'}</Typography>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
              <Typography variant="caption" color="text.secondary" fontWeight="bold">RABAT</Typography><Typography variant="body1" color="primary.light" sx={{ mb: 2 }}>{order.rabat_info || 'Brak'}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">ŁĄCZNA KWOTA DO ZAPŁATY</Typography><Typography variant="h5" fontWeight="bold" color="secondary.main">{order.kwota ? order.kwota.toFixed(2) : '0.00'} zł</Typography>
            </Paper>
            <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(255, 193, 7, 0.05)', border: '1px solid rgba(255, 193, 7, 0.2)' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#ffca28' }}>Uwagi wewnętrzne</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Niewidoczne dla klienta, przeznaczone dla pracowników.</Typography>
              <TextField fullWidth multiline rows={4} variant="outlined" placeholder="Wpisz notatki..." value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} sx={{ mb: 2, bgcolor: 'background.default' }} />
              <Button fullWidth variant="contained" color="inherit" onClick={handleSaveNotes} sx={{ color: '#000', bgcolor: '#ffca28', '&:hover': { bgcolor: '#ffb300' } }}>Zapisz Notatki</Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // --- KLIENCI LOGIKA I WIDOKI ---
  const renderCustomersList = () => {
    const filteredCustomers = customers.filter(c => {
      const searchStr = searchCustomerQuery.toLowerCase();
      const fullname = `${c.imie} ${c.nazwisko}`.toLowerCase();
      return fullname.includes(searchStr) || c.email.toLowerCase().includes(searchStr);
    });

    return (
      <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold">Zarządzanie Klientami</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small" placeholder="Szukaj po nazwisku lub e-mailu..." value={searchCustomerQuery}
              onChange={e => setSearchCustomerQuery(e.target.value)}
              InputProps={{ startAdornment: <Search size={18} style={{ marginRight: 8, color: '#94a3b8' }} /> }}
            />
            <Button variant="outlined" startIcon={<Clock size={16} />} onClick={fetchCustomers}>Odśwież</Button>
          </Box>
        </Box>

        {customersError && <Alert severity="error" sx={{ mb: 3 }}>{customersError}</Alert>}

        <TableContainer component={Paper} sx={{ borderRadius: 2, width: '100%' }}>
          {loadingCustomers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : (
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Imię i Nazwisko</TableCell>
                  <TableCell>E-mail</TableCell>
                  <TableCell>Typ konta</TableCell>
                  <TableCell align="center">L. zamówień</TableCell>
                  <TableCell align="right">Wydana kwota</TableCell>
                  <TableCell align="center">Akcje</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Brak klientów w bazie.</Typography></TableCell></TableRow>
                ) : (
                  filteredCustomers.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell fontWeight="bold">#{c.id}</TableCell>
                      <TableCell fontWeight="bold">{c.imie} {c.nazwisko}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>
                        <Chip label={c.typ} color={c.typ === 'Zarejestrowany' ? 'primary' : 'default'} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={c.liczba_zamowien} variant="outlined" size="small" />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                        {c.laczna_kwota ? `${c.laczna_kwota.toFixed(2)} zł` : '0.00 zł'}
                      </TableCell>
                      <TableCell align="center">
                        <Button size="small" variant="contained" color="secondary" onClick={() => {
                          setSelectedCustomer(c);
                          setActiveView('CUSTOMER_DETAILS');
                        }}>Profil / Szczegóły</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Box>
    );
  };

  const renderCustomerDetails = () => {
    if (!selectedCustomer) return null;
    const c = selectedCustomer;

    return (
      <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', pb: 8 }}>
        <Button startIcon={<ArrowLeft size={20} />} onClick={() => { setSelectedCustomer(null); setActiveView('CUSTOMERS'); }} sx={{ mb: 3, color: 'text.secondary' }}>Wróć do listy klientów</Button>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>Profil Klienta: {c.imie} {c.nazwisko}</Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 4, borderRadius: 2, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}>
                  {c.imie.charAt(0)}{c.nazwisko.charAt(0)}
                </Avatar>
              </Box>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight="bold">{c.imie} {c.nazwisko}</Typography>
                <Chip label={c.typ} color={c.typ === 'Zarejestrowany' ? 'primary' : 'default'} size="small" sx={{ mt: 1 }} />
              </Box>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
              <Typography variant="caption" color="text.secondary" fontWeight="bold">E-MAIL</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{c.email}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">TELEFON</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{c.telefon || 'Brak danych'}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">CAŁKOWITA WYDANA KWOTA W SKLEPIE</Typography>
              <Typography variant="h5" color="secondary.main" fontWeight="bold">{c.laczna_kwota.toFixed(2)} zł</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 3, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                Historia Zamówień ({c.liczba_zamowien})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary' }}>ID Zamówienia</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>Data</TableCell>
                      <TableCell align="center" sx={{ color: 'text.secondary' }}>Status</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>Kwota</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {c.zamowienia && c.zamowienia.length === 0 ? (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, fontStyle: 'italic' }}>Ten klient nie złożył jeszcze żadnych zamówień.</TableCell></TableRow>
                    ) : (
                      c.zamowienia.map((z) => {
                        const statusInfo = getStatusProps(z.status);
                        return (
                          <TableRow key={z.id} hover>
                            <TableCell fontWeight="bold">#{z.id}</TableCell>
                            <TableCell>{z.data_zamowienia}</TableCell>
                            <TableCell align="center"><Chip label={statusInfo.label} color={statusInfo.color} size="small" /></TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{z.kwota.toFixed(2)} zł</TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderProductsList = () => {
    const filteredProducts = products.filter(p => {
      if (searchQuery && !p.nazwa.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (showAllProducts) return true;
      if (!selectedListSubcategory) return false;
      return p.podkategoria_id === parseInt(selectedListSubcategory);
    });

    return (
      <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold">Zarządzanie Towarami</Typography>
          <Button variant="contained" color="secondary" startIcon={<Plus size={18} />} onClick={handleAddNewProductClick}>Dodaj Nowy Produkt</Button>
        </Box>
        <Paper sx={{ p: 4, mb: 4, borderRadius: 2, width: '100%' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Wyszukiwanie i Filtrowanie asortymentu</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            <TextField fullWidth label="Wyszukaj po nazwie..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowAllProducts(true); }} InputProps={{ startAdornment: <Search size={20} style={{ marginRight: 8, color: '#94a3b8' }} /> }} />
            <TextField select fullWidth label="Filtruj po: Kategoria" value={selectedListCategory} onChange={e => { setSelectedListCategory(e.target.value); setSelectedListSubcategory(''); setShowAllProducts(false); }} SelectProps={{ native: true }}>
              <option value=""></option>{categories.map(c => <option key={c.id} value={c.id}>{c.nazwa_kategorii}</option>)}
            </TextField>
            <TextField select fullWidth label="Filtruj po: Podkategoria" value={selectedListSubcategory} onChange={e => { setSelectedListSubcategory(e.target.value); setShowAllProducts(false); }} SelectProps={{ native: true }} disabled={!selectedListCategory}>
              <option value=""></option>{categories.find(c => c.id === parseInt(selectedListCategory))?.podkategorie.map(sub => <option key={sub.id} value={sub.id}>{sub.nazwa}</option>)}
            </TextField>
            <Button variant="outlined" size="large" color="primary" startIcon={<ListIcon size={20} />} onClick={() => { setShowAllProducts(true); setSelectedListCategory(''); setSelectedListSubcategory(''); setSearchQuery(''); }} sx={{ py: 1.5, borderStyle: 'dashed' }}>Pokaż wszystko (Ignoruj filtry)</Button>
          </Box>
        </Paper>

        {!showAllProducts && !selectedListSubcategory && !searchQuery ? (
          <Alert severity="info" sx={{ borderRadius: 2, fontSize: '1rem', py: 2 }}>Wybierz kategorię i podkategorię powyżej lub kliknij "Pokaż wszystko", aby wyświetlić towary.</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2, width: '100%' }}>
            {loadingProducts ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
            ) : (
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                  <TableRow>
                    <TableCell>ID</TableCell><TableCell>Zdjęcie</TableCell><TableCell>Nazwa i Producent</TableCell>
                    <TableCell align="right">Cena (zł)</TableCell><TableCell align="center">Stan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Brak towarów.</Typography></TableCell></TableRow>
                  ) : (
                    filteredProducts.map((p) => (
                      <TableRow key={p.id} hover onClick={() => handleEditProductClick(p)} sx={{ cursor: 'pointer', transition: 'background-color 0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
                        <TableCell>#{p.id}</TableCell>
                        <TableCell>
                          {p.zdjecie ? (
                            <Box component="img" src={p.zdjecie.startsWith('http') ? p.zdjecie : `${API_BASE_URL}${p.zdjecie}`} alt={p.nazwa} sx={{ width: 132, height: 132, objectFit: 'contain', bgcolor: '#ffffff', borderRadius: 4, p: 1.5, display: 'block' }} />
                          ) : (
                            <Box sx={{ width: 132, height: 132, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={48} color="rgba(255,255,255,0.2)" /></Box>
                          )}
                        </TableCell>
                        <TableCell fontWeight="bold">{p.nazwa}</TableCell>
                        <TableCell align="right">{p.cena_promocyjna ? p.cena_promocyjna.toFixed(2) : p.cena_jednostkowa.toFixed(2)}</TableCell>
                        <TableCell align="center"><Chip label={`${p.ilosc_dostepna} szt.`} color={p.ilosc_dostepna > 5 ? "success" : "warning"} size="small" /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        )}
      </Box>
    );
  };

  const renderProductForm = () => (
    <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', pb: 8 }}>
      <Button startIcon={<ArrowLeft size={20} />} onClick={() => setActiveView('PRODUCTS')} sx={{ mb: 2, color: 'text.secondary' }}>Wróć do listy produktów</Button>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>{isEditing ? <Edit color="#3b82f6" /> : <Package color="#10b981" />} {isEditing ? `Edycja: ${productForm.nazwa}` : 'Dodawanie nowego towaru'}</Typography>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2, borderTop: isEditing ? '4px solid #3b82f6' : '4px solid #10b981', width: '100%' }}>
        <Typography variant="h6" sx={{ mb: 3 }}>1. Informacje podstawowe</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
          <TextField fullWidth label="Nazwa produktu *" value={productForm.nazwa || ''} onChange={e => setProductForm({ ...productForm, nazwa: e.target.value })} />
          <TextField fullWidth label="Producent" value={productForm.producent || ''} onChange={e => setProductForm({ ...productForm, producent: e.target.value })} />
          <Box sx={{ width: '100%' }}><Typography variant="subtitle2" sx={{ mb: 0, color: 'text.secondary' }}>Opis produktu</Typography><NativeWysiwyg value={productForm.opis} onChange={val => setProductForm({ ...productForm, opis: val })} /></Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2, width: '100%' }}>
        <Typography variant="h6" sx={{ mb: 3 }}>2. Kategoryzacja</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
          <TextField select fullWidth label="Kategoria" value={productForm.kategoria_id || ''} onChange={e => setProductForm({ ...productForm, kategoria_id: e.target.value, podkategoria_id: '', atrybuty: [] })} SelectProps={{ native: true }}>
            <option value=""></option>{categories.map(c => <option key={c.id} value={c.id}>{c.nazwa_kategorii}</option>)}
          </TextField>
          <TextField select fullWidth label="Podkategoria" value={productForm.podkategoria_id || ''} onChange={e => setProductForm({ ...productForm, podkategoria_id: e.target.value })} SelectProps={{ native: true }} disabled={!productForm.kategoria_id}>
            <option value=""></option>{categories.find(c => c.id === parseInt(productForm.kategoria_id))?.podkategorie.map(sub => <option key={sub.id} value={sub.id}>{sub.nazwa}</option>)}
          </TextField>
        </Box>
      </Paper>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2, width: '100%' }}>
        <Typography variant="h6" sx={{ mb: 3 }}>3. Cennik</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
          <TextField fullWidth label="Cena jednostkowa (zł) *" type="number" inputProps={{ step: "0.01" }} value={productForm.cena_jednostkowa || ''} onChange={e => setProductForm({ ...productForm, cena_jednostkowa: e.target.value })} />
          <TextField fullWidth label="Cena promocyjna (zł)" type="number" inputProps={{ step: "0.01" }} value={productForm.cena_promocyjna || ''} onChange={e => setProductForm({ ...productForm, cena_promocyjna: e.target.value })} />
        </Box>
      </Paper>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2, width: '100%' }}>
        <Typography variant="h6" sx={{ mb: 3 }}>4. Media</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
          <Box sx={{ width: '100%', height: 250, bgcolor: 'background.default', borderRadius: 2, border: '2px dashed rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
            {imagePreview ? <Box component="img" src={imagePreview} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={48} color="rgba(255,255,255,0.2)" />}
          </Box>
          <Button variant="outlined" component="label" startIcon={<Upload size={18} />} fullWidth>
            {imagePreview ? 'Zmień zdjęcie' : 'Wgraj zdjęcie z dysku'}<input type="file" hidden accept="image/*" onChange={handleImageChange} />
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2, width: '100%' }}>
        <Typography variant="h6" sx={{ mb: 3 }}>5. Magazyn</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
          <TextField fullWidth label="Ilość dostępna (szt.) *" type="number" value={productForm.ilosc_dostepna || ''} onChange={e => setProductForm({ ...productForm, ilosc_dostepna: e.target.value })} />
        </Box>
      </Paper>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2, width: '100%' }}>
        <Typography variant="h6" sx={{ mb: 3 }}>6. Wartości atrybutów</Typography>
        {productForm.atrybuty.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 1, px: 1 }}>
            <Grid item xs={12} sm={5}><Typography variant="caption" color="text.secondary" fontWeight="bold">ATRYBUT</Typography></Grid>
            <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary" fontWeight="bold">WARTOŚĆ</Typography></Grid>
            <Grid item xs={12} sm={1} sx={{ textAlign: 'center' }}><Typography variant="caption" color="text.secondary" fontWeight="bold">USUŃ</Typography></Grid>
          </Grid>
        )}
        {productForm.atrybuty.length === 0 && <Typography color="text.secondary" sx={{ fontStyle: 'italic', py: 2, px: 1 }}>Brak atrybutów. Wybierz z listy rozwijanej lub kliknij poniżej, aby dodać nowy.</Typography>}
        {productForm.atrybuty.map((attr, index) => (
          <Grid container spacing={2} key={index} sx={{ mb: 2, alignItems: 'center' }}>
            <Grid item xs={12} sm={5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Autocomplete freeSolo options={availableAttributes.map((option) => option.nazwa)} value={attr.nazwa} onInputChange={(event, newInputValue) => updateAttribute(index, 'nazwa', newInputValue)} sx={{ flexGrow: 1 }} renderInput={(params) => <TextField {...params} label="Wybierz lub wpisz" size="small" />} />
              <IconButton size="small" sx={{ color: '#10b981', bgcolor: 'rgba(16, 185, 129, 0.1)', '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.2)' }, flexShrink: 0 }} onClick={() => { setNewAttrTargetIndex(index); setIsNewAttrOpen(true); }}><Plus size={18} /></IconButton>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" placeholder="np. 16 GB" value={attr.wartosc} onChange={e => updateAttribute(index, 'wartosc', e.target.value)} /></Grid>
            <Grid item xs={12} sm={1} sx={{ display: 'flex', justifyContent: 'center' }}><IconButton color="error" size="small" onClick={() => removeAttribute(index)}><Trash2 size={20} /></IconButton></Grid>
          </Grid>
        ))}
        <Box sx={{ mt: 2 }}><Button startIcon={<Plus size={16} />} onClick={addAttribute} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Dodaj kolejną Wartość atrybutu</Button></Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4, bgcolor: 'background.paper', p: 3, borderRadius: 2, borderTop: '1px solid rgba(255,255,255,0.1)', width: '100%' }}>
        <Button size="large" onClick={() => setActiveView('PRODUCTS')} color="inherit">Anuluj</Button>
        <Button size="large" variant="contained" color={isEditing ? "primary" : "secondary"} onClick={handleSaveProductSubmit} disabled={!productForm.nazwa || !productForm.cena_jednostkowa || productForm.ilosc_dostepna === ''}>
          {isEditing ? "Zapisz Zmiany" : "Zapisz i Opublikuj Produkt"}
        </Button>
      </Box>

      {/* --- WYSKAKUJĄCE OKIENKO ZIELONEGO PLUSIKA --- */}
      <Dialog open={isNewAttrOpen} onClose={() => setIsNewAttrOpen(false)}>
        <DialogTitle>Dodaj nowy atrybut do słownika</DialogTitle>
        <DialogContent><TextField autoFocus margin="dense" fullWidth variant="standard" label="Nazwa atrybutu (np. Rozdzielczość)" value={newAttrValue} onChange={e => setNewAttrValue(e.target.value)} /></DialogContent>
        <DialogActions>
          <Button onClick={() => setIsNewAttrOpen(false)} color="inherit">Anuluj</Button>
          <Button onClick={() => {
            if (newAttrValue.trim()) {
              const newName = newAttrValue.trim();
              setAvailableAttributes([...availableAttributes, { id: Date.now(), nazwa: newName }]);
              if (newAttrTargetIndex !== null) { updateAttribute(newAttrTargetIndex, 'nazwa', newName); }
            }
            setIsNewAttrOpen(false); setNewAttrValue('');
          }} color="primary" variant="contained">Dodaj i wybierz</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <Typography variant="h6" fontWeight="900" color="primary.light" sx={{ letterSpacing: 0.5, fontSize: '1.25rem', whiteSpace: 'nowrap' }}>TECH<span style={{ color: '#fff' }}>BACKOFFICE</span></Typography>
      </Toolbar>
      <Divider sx={{ borderColor: '#334155' }} />
      <List sx={{ px: 2, pt: 2, flexGrow: 1 }}>
        {[
          { id: 'DASHBOARD', label: 'Pulpit', icon: <LayoutDashboard /> },
          { id: 'ORDERS', label: 'Zamówienia', icon: <ShoppingBag /> },
          { id: 'PRODUCTS', label: 'Magazyn i Towary', icon: <Package /> },
          { id: 'CUSTOMERS', label: 'Klienci', icon: <Users /> },
        ].map((item) => {
          const isActive = activeView === item.id ||
            (activeView === 'ORDER_DETAILS' && item.id === 'ORDERS') ||
            (activeView === 'PRODUCT_FORM' && item.id === 'PRODUCTS') ||
            (activeView === 'CUSTOMER_DETAILS' && item.id === 'CUSTOMERS');
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
              <ListItemButton selected={isActive} onClick={() => setActiveView(item.id)} sx={{ borderRadius: 2, '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' }, '&.Mui-selected .MuiListItemIcon-root': { color: '#fff' } }}>
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? '#fff' : 'text.secondary' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
      <Box sx={{ p: 2 }}>
        <Card sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}><User size={20} /></Avatar>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="subtitle2" noWrap>{user?.username}</Typography>
              <Typography variant="caption" color="text.secondary">Administrator</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  if (isLoginOpen || !user) {
    return (
      <ThemeProvider theme={adminTheme}>
        <CssBaseline />
        <GlobalStyles styles={{ '#root': { maxWidth: 'none !important', width: '100%', margin: 0, padding: 0 } }} />
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
          <Card sx={{ width: 400, p: 2, borderRadius: 3, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', mb: 3 }}><Settings size={48} color="#3b82f6" /><Typography variant="h5" fontWeight="bold" sx={{ mt: 1 }}>Panel Pracownika</Typography></Box>
              {loginError && <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>}
              <TextField fullWidth label="Login pracownika" margin="normal" value={loginData.username} onChange={e => setLoginData({ ...loginData, username: e.target.value })} />
              <TextField fullWidth label="Hasło" type="password" margin="normal" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
              <Button fullWidth variant="contained" size="large" sx={{ mt: 3, py: 1.5 }} onClick={handleLoginSubmit}>Zaloguj do systemu</Button>
            </CardContent>
          </Card>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <GlobalStyles styles={{ '#root': { maxWidth: 'none !important', width: '100%', margin: 0, padding: 0 } }} />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <AppBar position="fixed" sx={{ width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { sm: `${DRAWER_WIDTH}px` } }}>
          <Toolbar>
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}><Menu /></IconButton>
            <Box sx={{ flexGrow: 1 }} />
            <Button color="inherit" startIcon={<LogOut size={18} />} onClick={handleLogout}>Wyloguj</Button>
          </Toolbar>
        </AppBar>
        <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
          <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}>{drawer}</Drawer>
          <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }} open>{drawer}</Drawer>
        </Box>
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, mt: 8 }}>
          {activeView === 'DASHBOARD' && renderDashboard()}
          {activeView === 'ORDERS' && renderOrders()}
          {activeView === 'ORDER_DETAILS' && renderOrderDetails()}
          {activeView === 'PRODUCTS' && renderProductsList()}
          {activeView === 'PRODUCT_FORM' && renderProductForm()}
          {activeView === 'CUSTOMERS' && renderCustomersList()}
          {activeView === 'CUSTOMER_DETAILS' && renderCustomerDetails()}
        </Box>
      </Box>
    </ThemeProvider>
  );
}