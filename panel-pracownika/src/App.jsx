import React, { useState, useEffect, useRef } from 'react';
import {
  ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar, Typography,
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton,
  Button, Grid, Card, CardContent, Divider, Avatar, Alert, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Settings, LogOut, Menu,
  Clock, User, Plus, Trash2, ArrowLeft, Upload, ImageIcon
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
    <Box sx={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1, bgcolor: 'background.default', mt: 1 }}>
      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.2)', p: 1, display: 'flex', gap: 1 }}>
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
        sx={{
          p: 2,
          minHeight: '200px',
          outline: 'none',
          fontSize: '16px',
          '& ul, & ol': { pl: 3, my: 1 }
        }}
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

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [availableAttributes, setAvailableAttributes] = useState([]);

  const [newProduct, setNewProduct] = useState({
    nazwa: '', producent: '', opis: '', cena_jednostkowa: '', cena_promocyjna: '',
    kategoria_id: '', podkategoria_id: '', ilosc_dostepna: 0, atrybuty: []
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Stany dla wyskakującego okienka "Zielonego Plusika"
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
    if (user && (activeView === 'PRODUCTS' || activeView === 'PRODUCT_ADD')) {
      if (activeView === 'PRODUCTS') fetchProducts();
      fetchCategories();
    }
  }, [activeView, user]);

  useEffect(() => {
    if (activeView === 'PRODUCT_ADD') {
      const fetchFilteredAttributes = async () => {
        let url = `${API_BASE_URL}/api/atrybuty/`;
        if (newProduct.podkategoria_id) {
          url += `?podkategoria_id=${newProduct.podkategoria_id}`;
        } else if (newProduct.kategoria_id) {
          url += `?kategoria_id=${newProduct.kategoria_id}`;
        }
        try {
          const res = await fetch(url);
          if (res.ok) setAvailableAttributes(await res.json());
        } catch (err) { console.error(err); }
      };
      fetchFilteredAttributes();
    }
  }, [newProduct.kategoria_id, newProduct.podkategoria_id, activeView]);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const addAttribute = () => setNewProduct({ ...newProduct, atrybuty: [...newProduct.atrybuty, { nazwa: '', wartosc: '' }] });
  const updateAttribute = (index, field, value) => {
    const updatedAtrybuty = [...newProduct.atrybuty];
    updatedAtrybuty[index][field] = value;
    setNewProduct({ ...newProduct, atrybuty: updatedAtrybuty });
  };
  const removeAttribute = (index) => {
    const updatedAtrybuty = newProduct.atrybuty.filter((_, i) => i !== index);
    setNewProduct({ ...newProduct, atrybuty: updatedAtrybuty });
  };

  const handleAddProductSubmit = async () => {
    try {
      const formData = new FormData();
      const payloadData = {
        nazwa: newProduct.nazwa, producent: newProduct.producent, opis: newProduct.opis,
        cena_jednostkowa: parseFloat(newProduct.cena_jednostkowa),
        cena_promocyjna: newProduct.cena_promocyjna ? parseFloat(newProduct.cena_promocyjna) : null,
        ilosc_dostepna: parseInt(newProduct.ilosc_dostepna, 10),
        kategoria_id: newProduct.kategoria_id ? parseInt(newProduct.kategoria_id) : null,
        podkategoria_id: newProduct.podkategoria_id ? parseInt(newProduct.podkategoria_id) : null,
        atrybuty: newProduct.atrybuty.filter(a => a.nazwa.trim() !== '' && a.wartosc.trim() !== '')
      };

      formData.append('payload', JSON.stringify(payloadData));
      if (selectedImage) formData.append('zdjecie', selectedImage);

      const response = await fetch(`${API_BASE_URL}/api/admin/produkty/`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${user.token}` }, body: formData
      });

      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Błąd zapisu."); }

      setNewProduct({ nazwa: '', producent: '', opis: '', cena_jednostkowa: '', cena_promocyjna: '', kategoria_id: '', podkategoria_id: '', ilosc_dostepna: 0, atrybuty: [] });
      setSelectedImage(null); setImagePreview(null); setActiveView('PRODUCTS');
    } catch (err) { alert("Błąd: " + err.message); }
  };

  const renderDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold">Witaj w Panelu, {user?.username}!</Typography>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Card sx={{ bgcolor: 'primary.dark' }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}><ShoppingBag size={32} color="#fff" /></Box>
            <Box>
              <Typography variant="h4" color="white" fontWeight="bold">Sklep Otwarty</Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">Przejdź do zakładki Zamówień</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderOrders = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Zarządzanie Zamówieniami</Typography>
        <Button variant="outlined" startIcon={<Clock size={16} />} onClick={fetchOrders}>Odśwież Listę</Button>
      </Box>
      {ordersError && <Alert severity="error" sx={{ mb: 3 }}>{ordersError}</Alert>}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        {loadingOrders ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Klient</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Kwota</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell fontWeight="bold">#{order.id}</TableCell>
                  <TableCell>{order.klient_dane}</TableCell>
                  <TableCell>{new Date(order.data_zamowienia).toLocaleString('pl-PL')}</TableCell>
                  <TableCell><Chip label={order.status} color={order.status === 'NOWE' ? 'info' : 'success'} size="small" /></TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{order.kwota ? `${order.kwota.toFixed(2)} zł` : '0.00 zł'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );

  const renderProductsList = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Zarządzanie Towarami</Typography>
        <Button variant="contained" color="secondary" startIcon={<Plus size={18} />} onClick={() => setActiveView('PRODUCT_ADD')}>
          Dodaj Nowy Produkt
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        {loadingProducts ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nazwa i Producent</TableCell>
                <TableCell align="right">Cena (zł)</TableCell>
                <TableCell align="center">Stan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>#{p.id}</TableCell>
                  <TableCell fontWeight="bold">{p.nazwa}</TableCell>
                  <TableCell align="right">{p.cena_promocyjna ? p.cena_promocyjna.toFixed(2) : p.cena_jednostkowa.toFixed(2)}</TableCell>
                  <TableCell align="center"><Chip label={`${p.ilosc_dostepna} szt.`} color={p.ilosc_dostepna > 5 ? "success" : "warning"} size="small" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );

  // --- EKRAN DODAWANIA NOWEGO TOWARU (PIONOWY UKŁAD Z DJANGO ADMIN LOOK) ---
  const renderProductAdd = () => (
    <Box maxWidth="md" sx={{ mx: 'auto', pb: 8 }}>
      <Button startIcon={<ArrowLeft size={20} />} onClick={() => setActiveView('PRODUCTS')} sx={{ mb: 2, color: 'text.secondary' }}>
        Wróć do listy produktów
      </Button>

      <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Package color="#10b981" /> Dodawanie nowego towaru
      </Typography>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2, borderTop: '4px solid #3b82f6' }}>
        <Typography variant="h6" sx={{ mb: 3 }}>1. Informacje podstawowe</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField fullWidth label="Nazwa produktu *" value={newProduct.nazwa} onChange={e => setNewProduct({ ...newProduct, nazwa: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Producent" value={newProduct.producent} onChange={e => setNewProduct({ ...newProduct, producent: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 0, color: 'text.secondary' }}>Opis produktu</Typography>
            <NativeWysiwyg value={newProduct.opis} onChange={val => setNewProduct({ ...newProduct, opis: val })} />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>2. Kategoryzacja</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField select fullWidth label="Kategoria" value={newProduct.kategoria_id} onChange={e => setNewProduct({ ...newProduct, kategoria_id: e.target.value, podkategoria_id: '', atrybuty: [] })} SelectProps={{ native: true }}>
              <option value=""></option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nazwa_kategorii}</option>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField select fullWidth label="Podkategoria" value={newProduct.podkategoria_id} onChange={e => setNewProduct({ ...newProduct, podkategoria_id: e.target.value })} SelectProps={{ native: true }} disabled={!newProduct.kategoria_id}>
              <option value=""></option>
              {categories.find(c => c.id === parseInt(newProduct.kategoria_id))?.podkategorie.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.nazwa}</option>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>3. Cennik</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField fullWidth label="Cena jednostkowa (zł) *" type="number" inputProps={{ step: "0.01" }} value={newProduct.cena_jednostkowa} onChange={e => setNewProduct({ ...newProduct, cena_jednostkowa: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Cena promocyjna (zł)" type="number" inputProps={{ step: "0.01" }} value={newProduct.cena_promocyjna} onChange={e => setNewProduct({ ...newProduct, cena_promocyjna: e.target.value })} />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>4. Media</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
          {/* Rozciągnięcie podglądu zdjęcia na pełną szerokość */}
          <Box sx={{ width: '100%', maxWidth: '100%', height: 250, bgcolor: 'background.default', borderRadius: 2, border: '2px dashed rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
            {imagePreview ? <Box component="img" src={imagePreview} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={48} color="rgba(255,255,255,0.2)" />}
          </Box>
          <Button variant="outlined" component="label" startIcon={<Upload size={18} />} fullWidth>
            {imagePreview ? 'Zmień zdjęcie' : 'Wgraj zdjęcie z dysku'}
            <input type="file" hidden accept="image/*" onChange={handleImageChange} />
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>5. Magazyn</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField fullWidth label="Ilość dostępna (szt.) *" type="number" value={newProduct.ilosc_dostepna} onChange={e => setNewProduct({ ...newProduct, ilosc_dostepna: e.target.value })} />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>6. Wartości atrybutów</Typography>

        {/* Tabelaryczne nagłówki znane z panelu Django */}
        {newProduct.atrybuty.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 1, px: 1 }}>
            <Grid item xs={12} sm={5}><Typography variant="caption" color="text.secondary" fontWeight="bold">ATRYBUT</Typography></Grid>
            <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary" fontWeight="bold">WARTOŚĆ</Typography></Grid>
            <Grid item xs={12} sm={1} sx={{ textAlign: 'center' }}><Typography variant="caption" color="text.secondary" fontWeight="bold">USUŃ</Typography></Grid>
          </Grid>
        )}

        {newProduct.atrybuty.length === 0 && (
          <Typography color="text.secondary" sx={{ fontStyle: 'italic', py: 2, px: 1 }}>
            Brak atrybutów. Wybierz z listy rozwijanej lub kliknij poniżej, aby dodać nowy.
          </Typography>
        )}

        {newProduct.atrybuty.map((attr, index) => (
          <Grid container spacing={2} key={index} sx={{ mb: 2, alignItems: 'center' }}>
            {/* Pole wyboru atrybutu (Czysta lista rozwijana) + Zielony plusik */}
            <Grid item xs={12} sm={5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                select
                size="small"
                value={attr.nazwa}
                onChange={e => updateAttribute(index, 'nazwa', e.target.value)}
                SelectProps={{ native: true }}
                sx={{ flexGrow: 1 }}
              >
                <option value="">---------</option>
                {availableAttributes.map((option) => (
                  <option key={option.id} value={option.nazwa}>{option.nazwa}</option>
                ))}
              </TextField>
              <IconButton
                size="small"
                sx={{ color: '#10b981', bgcolor: 'rgba(16, 185, 129, 0.1)', '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.2)' } }}
                onClick={() => {
                  setNewAttrTargetIndex(index);
                  setIsNewAttrOpen(true);
                }}
                title="Dodaj nowy atrybut do słownika"
              >
                <Plus size={18} />
              </IconButton>
            </Grid>
            {/* Wartość */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" placeholder="np. 16 GB" value={attr.wartosc} onChange={e => updateAttribute(index, 'wartosc', e.target.value)} />
            </Grid>
            {/* Usuń */}
            <Grid item xs={12} sm={1} sx={{ display: 'flex', justifyContent: 'center' }}>
              <IconButton color="error" size="small" onClick={() => removeAttribute(index)}><Trash2 size={20} /></IconButton>
            </Grid>
          </Grid>
        ))}

        {/* Dolny przycisk dodający kolejny wiersz */}
        <Box sx={{ mt: 2 }}>
          <Button startIcon={<Plus size={16} />} onClick={addAttribute} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
            Dodaj kolejną Wartość atrybutu
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4, bgcolor: 'background.paper', p: 3, borderRadius: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Button size="large" onClick={() => setActiveView('PRODUCTS')} color="inherit">Anuluj</Button>
        <Button size="large" variant="contained" color="secondary" onClick={handleAddProductSubmit} disabled={!newProduct.nazwa || !newProduct.cena_jednostkowa || newProduct.ilosc_dostepna === ''}>
          Zapisz i Opublikuj Produkt
        </Button>
      </Box>

      {/* --- WYSKAKUJĄCE OKIENKO ZIELONEGO PLUSIKA --- */}
      <Dialog open={isNewAttrOpen} onClose={() => setIsNewAttrOpen(false)}>
        <DialogTitle>Dodaj nowy atrybut do słownika</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus margin="dense" fullWidth variant="standard"
            label="Nazwa atrybutu (np. Rozdzielczość)"
            value={newAttrValue} onChange={e => setNewAttrValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsNewAttrOpen(false)} color="inherit">Anuluj</Button>
          <Button onClick={() => {
            if (newAttrValue.trim()) {
              const newName = newAttrValue.trim();
              setAvailableAttributes([...availableAttributes, { id: Date.now(), nazwa: newName }]);
              if (newAttrTargetIndex !== null) {
                updateAttribute(newAttrTargetIndex, 'nazwa', newName);
              }
            }
            setIsNewAttrOpen(false);
            setNewAttrValue('');
          }} color="primary" variant="contained">
            Dodaj i wybierz
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <Typography variant="h5" fontWeight="900" color="primary.light" sx={{ letterSpacing: 1 }}>TECH<span style={{ color: '#fff' }}>BACKOFFICE</span></Typography>
      </Toolbar>
      <Divider sx={{ borderColor: '#334155' }} />
      <List sx={{ px: 2, pt: 2, flexGrow: 1 }}>
        {[
          { id: 'DASHBOARD', label: 'Pulpit', icon: <LayoutDashboard /> },
          { id: 'ORDERS', label: 'Zamówienia', icon: <ShoppingBag /> },
          { id: 'PRODUCTS', label: 'Magazyn i Towary', icon: <Package /> },
          { id: 'CUSTOMERS', label: 'Klienci', icon: <Users /> },
        ].map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
            <ListItemButton selected={activeView === item.id || (activeView === 'PRODUCT_ADD' && item.id === 'PRODUCTS')} onClick={() => setActiveView(item.id)} sx={{ borderRadius: 2, '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' }, '&.Mui-selected .MuiListItemIcon-root': { color: '#fff' } }}>
              <ListItemIcon sx={{ minWidth: 40, color: (activeView === item.id || (activeView === 'PRODUCT_ADD' && item.id === 'PRODUCTS')) ? '#fff' : 'text.secondary' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
        ))}
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
          {activeView === 'PRODUCTS' && renderProductsList()}
          {activeView === 'PRODUCT_ADD' && renderProductAdd()}
        </Box>
      </Box>
    </ThemeProvider>
  );
}