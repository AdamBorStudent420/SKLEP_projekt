import React, { useState, useEffect, useRef } from 'react';
import {
  ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar, Typography,
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton,
  Button, Card, CardContent, Divider, Avatar, Alert, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Autocomplete, GlobalStyles,
  Snackbar, Rating, Badge
} from '@mui/material';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Settings, LogOut, Menu,
  Clock, User, Plus, Trash2, ArrowLeft, Upload, ImageIcon, Search, List as ListIcon, Edit, Play,
  Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Link as LinkIcon2, Unlink, Eraser, Code, X, MessageSquare, Star,
  AlertTriangle
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

// --- ZAAWANSOWANY EDYTOR WYSIWYG ---
const NativeWysiwyg = ({ value, onChange }) => {
  const editorRef = useRef(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML && !showSource) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value, showSource]);

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const handleCommand = (e, cmd, arg = null) => {
    e.preventDefault();
    document.execCommand(cmd, false, arg);
    handleInput();
  };

  const handleLink = (e) => {
    e.preventDefault();
    const url = prompt('Podaj adres URL (np. https://google.com):');
    if (url) {
      document.execCommand('createLink', false, url);
      handleInput();
    }
  };

  return (
    <Box sx={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1, bgcolor: 'background.default', mt: 1, width: '100%' }}>
      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.2)', p: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <IconButton size="small" onMouseDown={(e) => handleCommand(e, 'bold')} title="Pogrubienie"><BoldIcon size={18} /></IconButton>
        <IconButton size="small" onMouseDown={(e) => handleCommand(e, 'italic')} title="Kursywa"><ItalicIcon size={18} /></IconButton>
        <IconButton size="small" onMouseDown={(e) => handleCommand(e, 'underline')} title="Podkreślenie"><UnderlineIcon size={18} /></IconButton>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />

        <IconButton size="small" onMouseDown={(e) => handleCommand(e, 'insertUnorderedList')} title="Lista punktowana"><ListIcon size={18} /></IconButton>
        <IconButton size="small" onMouseDown={(e) => handleCommand(e, 'insertOrderedList')} title="Lista numerowana"><ListOrdered size={18} /></IconButton>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />

        <IconButton size="small" onMouseDown={(e) => handleCommand(e, 'justifyLeft')} title="Wyrównaj do lewej"><AlignLeft size={18} /></IconButton>
        <IconButton size="small" onMouseDown={(e) => handleCommand(e, 'justifyCenter')} title="Wyśrodkuj"><AlignCenter size={18} /></IconButton>
        <IconButton size="small" onMouseDown={(e) => handleCommand(e, 'justifyRight')} title="Wyrównaj do prawej"><AlignRight size={18} /></IconButton>
        <IconButton size="small" onMouseDown={(e) => handleCommand(e, 'justifyFull')} title="Wyjustuj"><AlignJustify size={18} /></IconButton>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />

        <IconButton size="small" onMouseDown={handleLink} title="Wstaw link"><LinkIcon2 size={18} /></IconButton>
        <IconButton size="small" onMouseDown={(e) => handleCommand(e, 'unlink')} title="Usuń link"><Unlink size={18} /></IconButton>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />

        <IconButton size="small" onMouseDown={(e) => handleCommand(e, 'removeFormat')} title="Usuń formatowanie"><Eraser size={18} /></IconButton>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          size="small"
          startIcon={<Code size={18} />}
          onClick={() => setShowSource(!showSource)}
          sx={{ color: showSource ? 'primary.main' : 'text.secondary', fontWeight: 'bold' }}
        >
          HTML
        </Button>
      </Box>

      {showSource ? (
        <TextField
          multiline
          fullWidth
          minRows={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Wpisz kod HTML..."
          sx={{ p: 1, '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '14px' }, '& fieldset': { border: 'none' } }}
        />
      ) : (
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
            textAlign: 'left',
            '& ul, & ol': { pl: 3, my: 1 },
            '& a': { color: '#3b82f6', textDecoration: 'underline' },
            wordBreak: 'break-word'
          }}
        />
      )}
    </Box>
  );
};

export default function AdminApp() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState('DASHBOARD');
  const chatEndRef = useRef(null);

  const [user, setUser] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(true);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [filterOrderDate, setFilterOrderDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [internalNotes, setInternalNotes] = useState('');

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchCustomerQuery, setSearchCustomerQuery] = useState('');

  // --- STANY DLA OPINII ---
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');

  // --- STANY REKLAMACJI ---
  const [complaints, setComplaints] = useState([]);
  const [complaintStatuses, setComplaintStatuses] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintReplyText, setComplaintReplyText] = useState('');
  const [viewedComplaints, setViewedComplaints] = useState({});

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

  const [dodatkoweZdjeciaPliki, setDodatkoweZdjeciaPliki] = useState([]);
  const [obecneDodatkoweZdjecia, setObecneDodatkoweZdjecia] = useState([]);
  const [zdjeciaDoUsuniecia, setZdjeciaDoUsuniecia] = useState([]);

  const [isNewAttrOpen, setIsNewAttrOpen] = useState(false);
  const [newAttrValue, setNewAttrValue] = useState('');
  const [newAttrTargetIndex, setNewAttrTargetIndex] = useState(null);

  const [deleteProductDialogOpen, setDeleteProductDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const username = localStorage.getItem('admin_username');
    if (token && username) { setUser({ username, token }); setIsLoginOpen(false); }

    if (username) {
      const viewed = localStorage.getItem(`viewedComplaints_${username}`);
      if (viewed) setViewedComplaints(JSON.parse(viewed));
    }
  }, []);

  useEffect(() => {
    if (user && activeView === 'ORDERS') fetchOrders();
    if (user && activeView === 'CUSTOMERS') fetchCustomers();
    if (user && activeView === 'REVIEWS') fetchReviews();
    if (user && activeView === 'COMPLAINTS') {
      fetchComplaints();
      fetchComplaintStatuses();
    }
    if (user && activeView === 'DASHBOARD') fetchComplaints();
    if (user && (activeView === 'PRODUCTS' || activeView === 'PRODUCT_FORM')) {
      if (activeView === 'PRODUCTS') fetchProducts();
      fetchCategories();
    }
  }, [activeView, user]);

  useEffect(() => {
    if (activeView === 'PRODUCT_FORM' && productForm.podkategoria_id) {
      const fetchFilteredAttributes = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/atrybuty/?podkategoria_id=${productForm.podkategoria_id}`);
          if (res.ok) {
            const data = await res.json();
            setAvailableAttributes(data);
          } else {
            setAvailableAttributes([]);
          }
        } catch (err) {
          console.error("Błąd pobierania atrybutów dla podkategorii:", err);
          setAvailableAttributes([]);
        }
      };
      fetchFilteredAttributes();
    } else if (activeView === 'PRODUCT_FORM' && !productForm.podkategoria_id) {
      setAvailableAttributes([]);
    }
  }, [productForm.podkategoria_id, activeView]);

  useEffect(() => {
    if (activeView === 'COMPLAINT_DETAILS' && selectedComplaint) {
      const comp = complaints.find(c => c.id === selectedComplaint.id);
      if (comp) {
        setSelectedComplaint(comp);
        const msgCount = comp.wiadomosci ? comp.wiadomosci.length : 0;
        const newViewed = { ...viewedComplaints, [comp.id]: msgCount };
        setViewedComplaints(newViewed);
        if (user?.username) localStorage.setItem(`viewedComplaints_${user.username}`, JSON.stringify(newViewed));
      }
    }
    if (activeView === 'COMPLAINT_DETAILS' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [complaints, activeView]);

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

  const refreshOrdersData = async (orderIdToSelect = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/zamowienia/admin/lista`, {
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const freshOrders = await response.json();
        setOrders(freshOrders);
        if (orderIdToSelect) {
          const freshOrder = freshOrders.find(o => o.id === orderIdToSelect);
          if (freshOrder) setSelectedOrder(freshOrder);
        }
      }
    } catch (err) { console.error("Błąd odświeżania danych z bazy:", err); }
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

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/opinie`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.status === 401 || response.status === 403) { handleLogout(); throw new Error('Sesja wygasła.'); }
      if (response.ok) {
        setReviews(await response.json());
      }
    } catch (err) { console.error(err); } finally { setLoadingReviews(false); }
  };

  const fetchComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/reklamacje`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.status === 401 || response.status === 403) { handleLogout(); throw new Error('Sesja wygasła.'); }
      if (response.ok) setComplaints(await response.json());
    } catch (err) { console.error(err); } finally { setLoadingComplaints(false); }
  };

  const fetchComplaintStatuses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/reklamacje/statusy`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) setComplaintStatuses(await response.json());
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (complaintId, newStatusId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/reklamacje/${complaintId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ status_id: parseInt(newStatusId) })
      });
      if (!res.ok) throw new Error("Błąd zmiany statusu.");
      const data = await res.json();
      setSnackbar({ open: true, message: `Status pomyślnie zmieniony na: ${data.nowy_status}`, severity: 'success' });
      fetchComplaints();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
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
      await refreshOrdersData(orderId);
      setSnackbar({ open: true, message: `Status zamówienia zmieniony na: ${newStatus}`, severity: 'success' });
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
      await refreshOrdersData(selectedOrder.id);
      setSnackbar({ open: true, message: 'Notatki wewnętrzne zapisane pomyślnie!', severity: 'success' });
    } catch (e) { alert(e.message); }
  };

  const markOrderAsPaid = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/zamowienia/admin/${orderId}/oznacz-oplacone`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Nie udało się zaktualizować statusu płatności.');
      await refreshOrdersData(orderId);
      setSnackbar({ open: true, message: 'Płatność została ręcznie zaksięgowana!', severity: 'success' });
    } catch (e) { alert(e.message); }
  };

  const handleSaveReply = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/opinie/${selectedReview.id}/odpowiedz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ odpowiedz: replyText })
      });
      if (!res.ok) throw new Error("Nie udało się zapisać odpowiedzi.");
      setSnackbar({ open: true, message: 'Odpowiedź zapisana pomyślnie!', severity: 'success' });
      fetchReviews();
      setSelectedReview({ ...selectedReview, odpowiedz_pracownika: replyText });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleSaveComplaintReply = async () => {
    if (!complaintReplyText.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/reklamacje/${selectedComplaint.id}/odpowiedz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ odpowiedz: complaintReplyText })
      });
      if (!res.ok) throw new Error("Nie udało się zapisać odpowiedzi na reklamację.");
      setSnackbar({ open: true, message: 'Odpowiedź na reklamację wysłana!', severity: 'success' });

      const newMsg = { autor: 'SKLEP', tresc: complaintReplyText, data_wyslania: new Date().toLocaleString('pl-PL') };
      setSelectedComplaint(prev => ({ ...prev, wiadomosci: [...(prev.wiadomosci || []), newMsg] }));
      setComplaintReplyText('');

      fetchComplaints();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleAddNewProductClick = () => {
    setIsEditing(false);
    setProductForm({
      id: null, nazwa: '', producent: '', opis: '', cena_jednostkowa: '', cena_promocyjna: '',
      kategoria_id: '', podkategoria_id: '', ilosc_dostepna: 0, atrybuty: []
    });
    setSelectedImage(null);
    setImagePreview(null);
    setObecneDodatkoweZdjecia([]);
    setDodatkoweZdjeciaPliki([]);
    setZdjeciaDoUsuniecia([]);
    setActiveView('PRODUCT_FORM');
  };

  const handleEditProductClick = (product) => {
    setIsEditing(true);
    setProductForm({
      id: product.id, nazwa: product.nazwa || '', producent: product.producent || '', opis: product.opis || '',
      cena_jednostkowa: product.cena_jednostkowa || '', cena_promocyjna: product.cena_promocyjna || '',
      kategoria_id: product.kategoria_id || '', podkategoria_id: product.podkategoria_id || '',
      ilosc_dostepna: product.ilosc_dostepna || 0, atrybuty: product.atrybuty ? [...product.atrybuty] : []
    });
    setSelectedImage(null);
    setImagePreview(product.zdjecie ? (product.zdjecie.startsWith('http') ? product.zdjecie : `${API_BASE_URL}${product.zdjecie}`) : null);

    setObecneDodatkoweZdjecia(product.dodatkowe_zdjecia || []);
    setDodatkoweZdjeciaPliki([]);
    setZdjeciaDoUsuniecia([]);

    setActiveView('PRODUCT_FORM');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const handleAddAdditionalImages = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      file: file,
      preview: URL.createObjectURL(file)
    }));
    setDodatkoweZdjeciaPliki(prev => [...prev, ...newImages]);
    e.target.value = null;
  };

  const removeNewImage = (index) => {
    setDodatkoweZdjeciaPliki(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (id) => {
    setZdjeciaDoUsuniecia(prev => [...prev, id]);
    setObecneDodatkoweZdjecia(prev => prev.filter(img => img.id !== id));
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
        nazwa: productForm.nazwa,
        producent: productForm.producent,
        opis: productForm.opis,
        cena_jednostkowa: parseFloat(productForm.cena_jednostkowa),
        cena_promocyjna: productForm.cena_promocyjna ? parseFloat(productForm.cena_promocyjna) : null,
        ilosc_dostepna: parseInt(productForm.ilosc_dostepna, 10),
        kategoria_id: productForm.kategoria_id ? parseInt(productForm.kategoria_id) : null,
        podkategoria_id: productForm.podkategoria_id ? parseInt(productForm.podkategoria_id) : null,
        atrybuty: productForm.atrybuty.filter(a => a.nazwa && a.nazwa.trim() !== '' && a.wartosc && a.wartosc.trim() !== '')
      };

      formData.append('payload', JSON.stringify(payloadData));

      if (selectedImage instanceof File) {
        formData.append('zdjecie', selectedImage);
      }

      if (dodatkoweZdjeciaPliki && dodatkoweZdjeciaPliki.length > 0) {
        dodatkoweZdjeciaPliki.forEach(imgObj => {
          if (imgObj && imgObj.file instanceof File) {
            formData.append('dodatkowe_zdjecia', imgObj.file);
          }
        });
      }

      if (zdjeciaDoUsuniecia && zdjeciaDoUsuniecia.length > 0) {
        formData.append('usuniete_zdjecia', JSON.stringify(zdjeciaDoUsuniecia));
      }

      const endpoint = isEditing ? `${API_BASE_URL}/api/admin/produkty/${productForm.id}/` : `${API_BASE_URL}/api/admin/produkty/`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
        body: formData
      });

      if (!response.ok) {
        let errorMessage = "Błąd zapisu.";
        try {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || JSON.stringify(errorData);
          } catch (jsonErr) {
            console.error("Serwer zwrócił błąd HTML (Traceback):", errorText);
            errorMessage = "Błąd krytyczny serwera (500). Sprawdź terminal Django!";
          }
        } catch (e) {
          console.error("Błąd podczas odczytu odpowiedzi:", e);
        }
        throw new Error(errorMessage);
      }

      setSnackbar({
        open: true,
        message: isEditing ? 'Zmiany w produkcie zostały zapisane pomyślnie!' : 'Nowy produkt został dodany pomyślnie do bazy!',
        severity: 'success'
      });
      setActiveView('PRODUCTS');
    } catch (err) {
      setSnackbar({ open: true, message: `Błąd: ${err.message}`, severity: 'error' });
      console.error("Pełny błąd zapisu:", err);
    }
  };

  const handleDeleteProductClick = (e, product) => {
    e.stopPropagation();
    setProductToDelete(product);
    setDeleteProductDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/produkty/${productToDelete.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Błąd podczas usuwania produktu.");
      }
      setSnackbar({ open: true, message: `Produkt "${productToDelete.nazwa}" został usunięty.`, severity: 'success' });
      setDeleteProductDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const getStatusProps = (status) => {
    const map = {
      'NOWE': { color: 'info', label: 'Nowe' }, 'OPLACONE': { color: 'secondary', label: 'Opłacone' },
      'W_REALIZACJI': { color: 'warning', label: 'W realizacji' }, 'WYSLANE': { color: 'primary', label: 'Wysłane' },
      'DOSTARCZONE': { color: 'success', label: 'Dostarczone' }, 'ANULOWANE': { color: 'error', label: 'Anulowane' }
    };
    return map[status] || { color: 'default', label: status };
  };

  const pendingComplaintsCount = complaints.filter(c => {
    if (!c.wiadomosci || c.wiadomosci.length === 0) return true;
    const lastMsg = c.wiadomosci[c.wiadomosci.length - 1];
    if (lastMsg.autor === 'KLIENT') {
      const viewedCount = viewedComplaints[c.id] || 0;
      if (viewedCount < c.wiadomosci.length) return true;
    }
    return false;
  }).length;

  // --- KOMPONENTY WIDOKÓW ---
  const renderDashboard = () => (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4 }}>
      <Typography variant="h3" fontWeight="bold" sx={{ mb: 1, textAlign: 'center', fontSize: { xs: '2rem', sm: '3rem' } }}>Witaj w Panelu, {user?.username}!</Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 6, textAlign: 'center', px: 2 }}>Wybierz moduł, którym chcesz zarządzać, korzystając z poniższych skrótów:</Typography>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 4 }, justifyContent: 'center', maxWidth: 1200, width: '100%', mx: 'auto', flexWrap: 'wrap' }}>
        {[
          { id: 'ORDERS', title: 'Zamówienia', desc: 'Przeglądaj i realizuj zamówienia', icon: <ShoppingBag size={40} color="#fff" />, bg: '#3b82f6' },
          { id: 'PRODUCTS', title: 'Towary', desc: 'Zarządzaj asortymentem', icon: <Package size={40} color="#fff" />, bg: '#10b981' },
          { id: 'CUSTOMERS', title: 'Klienci', desc: 'Baza zarejestrowanych klientów', icon: <Users size={40} color="#fff" />, bg: '#8b5cf6' },
          { id: 'REVIEWS', title: 'Opinie Klientów', desc: 'Moderuj wpisy i oceny', icon: <MessageSquare size={40} color="#fff" />, bg: '#f59e0b' },
          {
            id: 'COMPLAINTS',
            title: 'Reklamacje',
            desc: pendingComplaintsCount > 0 ? `${pendingComplaintsCount} wiadomość(i) czeka na Ciebie!` : 'Wszystko odczytane',
            icon: <Badge badgeContent={pendingComplaintsCount} color="error"><AlertTriangle size={40} color="#fff" /></Badge>,
            bg: '#f46c6cff'
          },
        ].map((tile) => (
          <Card key={tile.id} sx={{ minWidth: { xs: '100%', sm: 220 }, flex: 1, bgcolor: tile.bg, display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 12px 24px rgba(0,0,0,0.3)' } }} onClick={() => setActiveView(tile.id)}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: 3, flexGrow: 1 }}>
              <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%', mb: 2 }}>{tile.icon}</Box>
              <Typography variant="h6" color="white" fontWeight="bold" gutterBottom>{tile.title}</Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.8)">{tile.desc}</Typography>
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
        <TableContainer component={Paper} sx={{ borderRadius: 2, width: '100%', overflowX: 'auto' }}>
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
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
              <TableContainer sx={{ overflowX: 'auto' }}>
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
                        primary={<Box display="flex" justifyContent="space-between" flexWrap="wrap"><Typography variant="body1" fontWeight="bold">{getStatusProps(h.nowy_status).label}</Typography><Typography variant="caption" color="text.secondary">{new Date(h.data_zmiany).toLocaleString('pl-PL')}</Typography></Box>}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Typography variant="body1" color={!order.status_platnosci || order.status_platnosci === 'Brak płatności' ? 'error.light' : order.status_platnosci === 'Zakończona' ? 'success.light' : 'warning.light'} fontWeight="bold">
                  {order.status_platnosci || 'Brak płatności'}
                </Typography>
                {order.status_platnosci === 'Oczekująca' && (
                  <Button size="small" variant="outlined" color="success" onClick={() => markOrderAsPaid(order.id)}>Oznacz jako Opłacone</Button>
                )}
              </Box>

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

        <TableContainer component={Paper} sx={{ borderRadius: 2, width: '100%', overflowX: 'auto' }}>
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
              <TableContainer sx={{ overflowX: 'auto' }}>
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
          <TableContainer component={Paper} sx={{ borderRadius: 2, width: '100%', overflowX: 'auto' }}>
            {loadingProducts ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
            ) : (
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Zdjęcie</TableCell>
                    <TableCell>Nazwa i Producent</TableCell>
                    <TableCell align="right">Cena (zł)</TableCell>
                    <TableCell align="center">Stan i Akcje</TableCell>
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
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <Chip label={`${p.ilosc_dostepna} szt.`} color={p.ilosc_dostepna > 5 ? "success" : "warning"} size="small" />
                            <IconButton size="small" color="error" onClick={(e) => handleDeleteProductClick(e, p)} title="Usuń produkt">
                              <Trash2 size={18} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        )}

        {/* --- MODAL USUWANIA PRODUKTU --- */}
        <Dialog open={deleteProductDialogOpen} onClose={() => setDeleteProductDialogOpen(false)}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ef4444' }}>
            <AlertTriangle size={24} /> Potwierdzenie usunięcia
          </DialogTitle>
          <DialogContent>
            <Typography>Czy na pewno chcesz bezpowrotnie usunąć produkt <strong>{productToDelete?.nazwa}</strong>?</Typography>
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              Uwaga: Ta operacja usunie również wszystkie stany magazynowe, dodatkowe zdjęcia i przypisane atrybuty dla tego towaru. Operacji nie można cofnąć!
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setDeleteProductDialogOpen(false)} color="inherit">Anuluj</Button>
            <Button onClick={confirmDeleteProduct} variant="contained" color="error">Usuń produkt</Button>
          </DialogActions>
        </Dialog>

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
          <TextField select fullWidth label="Podkategoria" value={productForm.podkategoria_id || ''} onChange={e => setProductForm({ ...productForm, podkategoria_id: e.target.value, atrybuty: [] })} SelectProps={{ native: true }} disabled={!productForm.kategoria_id}>
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
        <Typography variant="h6" sx={{ mb: 3 }}>4. Media (Zdjęcia Produktu)</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>

          <Typography variant="subtitle2" color="text.secondary">Zdjęcie Główne * (Widoczne na liście)</Typography>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Box sx={{ width: 200, height: 200, bgcolor: 'background.default', borderRadius: 2, border: '2px dashed rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {imagePreview ? <Box component="img" src={imagePreview} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={48} color="rgba(255,255,255,0.2)" />}
            </Box>
            <Button variant="outlined" component="label" startIcon={<Upload size={18} />} sx={{ alignSelf: 'center' }}>
              {imagePreview ? 'Zmień zdjęcie główne' : 'Wgraj zdjęcie główne'}
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
            </Button>
          </Box>

          <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />

          <Typography variant="subtitle2" color="text.secondary">Dodatkowe Zdjęcia (Galeria w szczegółach)</Typography>
          <Button variant="outlined" component="label" startIcon={<Plus size={18} />}>
            Kliknij, aby dodać zdjęcia do galerii
            <input type="file" hidden multiple accept="image/*" onChange={handleAddAdditionalImages} />
          </Button>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {obecneDodatkoweZdjecia.map(img => (
              <Box key={`ex-${img.id}`} sx={{ position: 'relative', width: 100, height: 100, bgcolor: 'background.default', borderRadius: 2, p: 0.5, border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={`${API_BASE_URL}${img.url}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="galeria" />
                <IconButton size="small" color="error" onClick={() => removeExistingImage(img.id)} sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}>
                  <X size={14} />
                </IconButton>
              </Box>
            ))}
            {dodatkoweZdjeciaPliki.map((imgObj, idx) => (
              <Box key={`new-${idx}`} sx={{ position: 'relative', width: 100, height: 100, bgcolor: 'background.default', borderRadius: 2, p: 0.5, border: '1px dashed #3b82f6' }}>
                <img src={imgObj.preview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="nowe" />
                <IconButton size="small" color="error" onClick={() => removeNewImage(idx)} sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}>
                  <X size={14} />
                </IconButton>
              </Box>
            ))}
            {obecneDodatkoweZdjecia.length === 0 && dodatkoweZdjeciaPliki.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
                Brak zdjęć dodatkowych. Twoja galeria na stronie sklepu będzie pusta.
              </Typography>
            )}
          </Box>

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

        {!productForm.podkategoria_id ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Wybierz najpierw podkategorię w sekcji "Kategoryzacja", aby wczytać odpowiednie atrybuty i móc je dodawać.
          </Alert>
        ) : (
          <Box>
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2, mb: 1, px: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ flex: 1 }}>ATRYBUT</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ flex: 1 }}>WARTOŚĆ</Typography>
              <Box sx={{ width: 40 }} />
            </Box>

            {productForm.atrybuty.length === 0 && (
              <Typography color="text.secondary" sx={{ fontStyle: 'italic', py: 2, px: 1 }}>
                Brak atrybutów. Kliknij poniżej, aby dodać nowy atrybut do tego towaru.
              </Typography>
            )}

            {productForm.atrybuty.map((attr, index) => {
              const selectedAttrTemplate = availableAttributes.find(a => a.nazwa === attr.nazwa);
              const suggestedValues = selectedAttrTemplate?.wartosci || [];

              return (
                <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, mb: 2, width: '100%' }}>
                  <Box sx={{ display: 'flex', flex: 1, gap: 1, width: '100%' }}>
                    <Autocomplete
                      freeSolo
                      options={availableAttributes.map((option) => option.nazwa)}
                      value={attr.nazwa}
                      onInputChange={(event, newInputValue) => updateAttribute(index, 'nazwa', newInputValue)}
                      sx={{ flexGrow: 1 }}
                      renderInput={(params) => <TextField {...params} label="Wybierz lub wpisz atrybut" />}
                    />
                    <IconButton
                      size="large"
                      sx={{ color: '#10b981', bgcolor: 'rgba(16, 185, 129, 0.1)', '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.2)' }, flexShrink: 0, borderRadius: 1 }}
                      onClick={() => {
                        setNewAttrTargetIndex(index);
                        setIsNewAttrOpen(true);
                      }}
                      title="Dodaj nowy atrybut do bazy"
                    >
                      <Plus size={24} />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'flex', flex: 1, gap: 2, width: '100%', alignItems: 'center' }}>
                    <Autocomplete
                      freeSolo
                      options={suggestedValues}
                      value={attr.wartosc}
                      onInputChange={(event, newInputValue) => updateAttribute(index, 'wartosc', newInputValue)}
                      sx={{ flex: 1 }}
                      renderInput={(params) => <TextField {...params} label="Wybierz lub wpisz wartość" placeholder="np. 16 GB" />}
                    />
                    <IconButton color="error" onClick={() => removeAttribute(index)} sx={{ width: 40, height: 40, flexShrink: 0 }}>
                      <Trash2 size={24} />
                    </IconButton>
                  </Box>
                </Box>
              );
            })}

            <Box sx={{ mt: 3 }}>
              <Button startIcon={<Plus size={18} />} onClick={addAttribute} variant="outlined" color="primary" sx={{ fontWeight: 'bold' }}>
                Dodaj kolejny atrybut
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4, bgcolor: 'background.paper', p: 3, borderRadius: 2, borderTop: '1px solid rgba(255,255,255,0.1)', width: '100%', flexWrap: 'wrap' }}>
        <Button size="large" onClick={() => setActiveView('PRODUCTS')} color="inherit">Anuluj</Button>
        <Button size="large" variant="contained" color={isEditing ? "primary" : "secondary"} onClick={handleSaveProductSubmit} disabled={!productForm.nazwa || !productForm.cena_jednostkowa || productForm.ilosc_dostepna === ''}>
          {isEditing ? "Zapisz Zmiany" : "Zapisz i Opublikuj Produkt"}
        </Button>
      </Box>

      {/* --- WYSKAKUJĄCE OKIENKO ZIELONEGO PLUSIKA --- */}
      <Dialog open={isNewAttrOpen} onClose={() => setIsNewAttrOpen(false)}>
        <DialogTitle>Dodaj nowy atrybut do bazy</DialogTitle>
        <DialogContent><TextField autoFocus margin="dense" fullWidth variant="standard" label="Nazwa atrybutu (np. Rodzaj matrycy)" value={newAttrValue} onChange={e => setNewAttrValue(e.target.value)} /></DialogContent>
        <DialogActions>
          <Button onClick={() => setIsNewAttrOpen(false)} color="inherit">Anuluj</Button>
          <Button onClick={async () => {
            if (newAttrValue.trim()) {
              const newName = newAttrValue.trim();

              try {
                const res = await fetch(`${API_BASE_URL}/api/admin/atrybuty`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                  body: JSON.stringify({
                    nazwa: newName,
                    podkategoria_id: parseInt(productForm.podkategoria_id)
                  })
                });

                if (!res.ok) throw new Error("Nie udało się dodać atrybutu do bazy. Sprawdź backend.");

                const addedAttr = await res.json();
                setAvailableAttributes([...availableAttributes, addedAttr]);

                if (newAttrTargetIndex !== null) {
                  updateAttribute(newAttrTargetIndex, 'nazwa', addedAttr.nazwa);
                }
                setSnackbar({ open: true, message: `Atrybut "${newName}" dodany do bazy!`, severity: 'success' });
              } catch (err) {
                setSnackbar({ open: true, message: err.message, severity: 'error' });
              }
            }
            setIsNewAttrOpen(false); setNewAttrValue('');
          }} color="primary" variant="contained">Dodaj i wybierz</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // --- WIDOK OPINII KLIENTÓW ---
  const renderReviewsList = () => {
    return (
      <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold">Opinie Klientów</Typography>
          <Button variant="outlined" startIcon={<Clock size={16} />} onClick={fetchReviews}>Odśwież Listę</Button>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 2, width: '100%', overflowX: 'auto' }}>
          {loadingReviews ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : (
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                <TableRow>
                  <TableCell width="60">ID</TableCell>
                  <TableCell width="300">Produkt</TableCell>
                  <TableCell>Opinia</TableCell>
                  <TableCell align="center" width="150">Ocena</TableCell>
                  <TableCell align="center" width="150">Akcje</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviews.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Klienci nie dodali jeszcze żadnej opinii.</Typography></TableCell></TableRow>
                ) : (
                  reviews.map((rev) => (
                    <TableRow key={rev.id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelectedReview(rev); setReplyText(rev.odpowiedz_pracownika || ''); setActiveView('REVIEW_DETAILS'); }}>
                      <TableCell fontWeight="bold">#{rev.id}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {rev.towar_zdjecie ? (
                            <Box component="img" src={`${API_BASE_URL}${rev.towar_zdjecie}`} sx={{ width: 40, height: 40, objectFit: 'contain', bgcolor: 'white', borderRadius: 1 }} />
                          ) : (
                            <Box sx={{ width: 40, height: 40, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} color="rgba(255,255,255,0.2)" /></Box>
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rev.towar_nazwa}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontStyle: 'italic' }}>"{rev.tresc_skrocona}"</TableCell>
                      <TableCell align="center"><Rating value={rev.ocena} readOnly size="small" /></TableCell>
                      <TableCell align="center">
                        <Button size="small" variant="contained" color="primary" onClick={(e) => { e.stopPropagation(); setSelectedReview(rev); setReplyText(rev.odpowiedz_pracownika || ''); setActiveView('REVIEW_DETAILS'); }}>Pełna treść</Button>
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

  const renderReviewDetails = () => {
    if (!selectedReview) return null;
    const rev = selectedReview;
    return (
      <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', pb: 8 }}>
        <Button startIcon={<ArrowLeft size={20} />} onClick={() => { setSelectedReview(null); setActiveView('REVIEWS'); }} sx={{ mb: 3, color: 'text.secondary' }}>Wróć do listy opinii</Button>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}><MessageSquare color="#f59e0b" /> Szczegóły Opinii #{rev.id}</Typography>

        <Paper sx={{ p: 4, borderRadius: 2, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', gap: 3, mb: 4, alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, pb: 3, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {rev.towar_zdjecie ? (
              <Box component="img" src={`${API_BASE_URL}${rev.towar_zdjecie}`} sx={{ width: 80, height: 80, objectFit: 'contain', bgcolor: 'white', borderRadius: 2, p: 1 }} />
            ) : (
              <Box sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={30} color="rgba(255,255,255,0.2)" /></Box>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary">DOTYCZY PRODUKTU</Typography>
              <Typography variant="h6" fontWeight="bold">{rev.towar_nazwa}</Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>OCENA KLIENTA</Typography>
            <Rating value={rev.ocena} readOnly size="large" />
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>TREŚĆ OPINII</Typography>
            <Typography variant="body1" sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, fontStyle: 'italic', lineHeight: 1.7 }}>
              "{rev.pelna_tresc}"
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">AUTOR OPINII</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>{rev.klient_dane}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">DATA WYSTAWIENIA</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>{rev.data_wystawienia}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><MessageSquare size={20} /> Odpowiedź sklepu</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Zostanie ona wyświetlona publicznie pod opinią klienta na stronie produktu.</Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Wpisz oficjalną odpowiedź..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              sx={{ mb: 2, bgcolor: 'background.default' }}
            />
            <Button variant="contained" color="primary" onClick={handleSaveReply}>
              Zapisz / Aktualizuj odpowiedź
            </Button>
          </Box>

        </Paper>
      </Box>
    );
  };

  // --- WIDOK REKLAMACJI ---
  const renderComplaintsList = () => {
    return (
      <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold">Zarządzanie Reklamacjami</Typography>
          <Button variant="outlined" startIcon={<Clock size={16} />} onClick={fetchComplaints}>Odśwież Listę</Button>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 2, width: '100%', overflowX: 'auto' }}>
          {loadingComplaints ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : (
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                <TableRow>
                  <TableCell width="60">ID</TableCell>
                  <TableCell width="150">Zamówienie</TableCell>
                  <TableCell width="250">Klient</TableCell>
                  <TableCell>Ostatnia wiadomość</TableCell>
                  <TableCell width="150">Zgłoszono</TableCell>
                  <TableCell align="center" width="150">Stan Konwersacji</TableCell>
                  <TableCell align="center" width="120">Akcje</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {complaints.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Klienci nie zgłosili jeszcze żadnych reklamacji.</Typography></TableCell></TableRow>
                ) : (
                  complaints.map((comp) => {
                    let isNewMessage = false;
                    if (!comp.wiadomosci || comp.wiadomosci.length === 0) isNewMessage = true;
                    else {
                      const lastMsg = comp.wiadomosci[comp.wiadomosci.length - 1];
                      if (lastMsg.autor === 'KLIENT') {
                        const viewedCount = viewedComplaints[comp.id] || 0;
                        if (viewedCount < comp.wiadomosci.length) isNewMessage = true;
                      }
                    }

                    return (
                      <TableRow key={comp.id} hover sx={{ cursor: 'pointer', bgcolor: isNewMessage ? 'rgba(239, 68, 68, 0.08)' : 'inherit' }} onClick={() => openComplaintDetails(comp)}>
                        <TableCell fontWeight="bold">#{comp.id}</TableCell>
                        <TableCell><Chip label={`Zam. #${comp.zamowienie_id}`} size="small" variant="outlined" color="primary" /></TableCell>
                        <TableCell>{comp.klient_dane}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                          "{comp.wiadomosci?.length > 0 ? comp.wiadomosci[comp.wiadomosci.length - 1].tresc.substring(0, 40) + '...' : comp.tresc_skrocona}"
                        </TableCell>
                        <TableCell>{comp.data_zgloszenia}</TableCell>
                        <TableCell align="center">
                          {isNewMessage ? (
                            <Chip label="Nowa wiadomość" color="error" size="small" />
                          ) : (
                            <Chip label="Oczekuje na klienta" color="success" size="small" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Button size="small" variant="contained" color="primary" onClick={(e) => { e.stopPropagation(); openComplaintDetails(comp); }}>Czat</Button>
                        </TableCell>
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

  const openComplaintDetails = (comp) => {
    setSelectedComplaint(comp);
    setComplaintReplyText('');
    setActiveView('COMPLAINT_DETAILS');

    const msgCount = comp.wiadomosci ? comp.wiadomosci.length : 0;
    const newViewed = { ...viewedComplaints, [comp.id]: msgCount };
    setViewedComplaints(newViewed);
    if (user?.username) localStorage.setItem(`viewedComplaints_${user.username}`, JSON.stringify(newViewed));
  };

  const renderComplaintDetails = () => {
    if (!selectedComplaint) return null;
    const comp = selectedComplaint;
    return (
      <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', pb: 8 }}>
        <Button startIcon={<ArrowLeft size={20} />} onClick={() => { setSelectedComplaint(null); setActiveView('COMPLAINTS'); }} sx={{ mb: 3, color: 'text.secondary' }}>Wróć do listy reklamacji</Button>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}><AlertTriangle color="#ef4444" /> Konwersacja Zgłoszenia #{comp.id}</Typography>

        <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2, bgcolor: 'background.paper' }}>

          <Box sx={{ display: 'flex', gap: 3, mb: 4, alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, pb: 3, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">POWIĄZANE ZAMÓWIENIE</Typography>
              <Typography variant="h6" fontWeight="bold" color="primary.main">Numer #{comp.zamowienie_id}</Typography>
            </Box>
            <Button variant="outlined" size="small" onClick={() => {
              const order = orders.find(o => o.id === comp.zamowienie_id);
              if (order) openOrderDetails(order);
              else { setSnackbar({ open: true, message: 'Przejdź do zakładki Zamówienia aby odświeżyć.', severity: 'info' }) }
            }}>Przejdź do zamówienia</Button>

            <Box sx={{ ml: { xs: 0, sm: 'auto' }, width: { xs: '100%', sm: 'auto' } }}>
              <TextField
                select
                size="small"
                label="Zmień Status"
                value={comp.status_id || ''}
                onChange={(e) => handleStatusChange(comp.id, e.target.value)}
                SelectProps={{ native: true }}
                sx={{ minWidth: 200, width: { xs: '100%', sm: 'auto' } }}
              >
                <option value="" disabled>Wybierz status...</option>
                {complaintStatuses.map(s => (
                  <option key={s.id} value={s.id}>{s.nazwa}</option>
                ))}
              </TextField>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">DANE KLIENTA</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>{comp.klient_dane}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">ZŁOŻONO DNIA</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.5 }}>{comp.data_zgloszenia}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><MessageSquare size={20} /> Konwersacja z klientem</Typography>

            <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 3, p: { xs: 1, sm: 2 }, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
                <Paper sx={{ p: 1.5, maxWidth: '90%', bgcolor: '#334155', color: '#f8fafc', borderRadius: 2, boxShadow: 'none', borderLeft: '4px solid #ef4444', wordBreak: 'break-word' }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>Klient (Zgłoszenie początkowe) • {comp.data_zgloszenia}</Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{comp.pelna_tresc}</Typography>
                </Paper>
              </Box>
              {comp.wiadomosci && comp.wiadomosci.map((msg, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: msg.autor === 'SKLEP' ? 'flex-end' : 'flex-start', mb: 2 }}>
                  <Paper sx={{ p: 1.5, maxWidth: '90%', bgcolor: msg.autor === 'SKLEP' ? '#3b82f6' : '#334155', color: '#f8fafc', borderRadius: 2, boxShadow: 'none', borderRight: msg.autor === 'SKLEP' ? '4px solid #60a5fa' : 'none', borderLeft: msg.autor === 'KLIENT' ? '4px solid #10b981' : 'none', wordBreak: 'break-word' }}>
                    <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5 }}>
                      {msg.autor === 'SKLEP' ? 'Ty (Obsługa Sklepu)' : 'Klient'} • {msg.data_wyslania}
                    </Typography>
                    <Typography variant="body2">{msg.tresc}</Typography>
                  </Paper>
                </Box>
              ))}
              <div ref={chatEndRef} />
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Wpisz wiadomość do klienta..."
              value={complaintReplyText}
              onChange={(e) => setComplaintReplyText(e.target.value)}
              sx={{ mb: 2, bgcolor: 'background.default' }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" color="success" onClick={handleSaveComplaintReply} disabled={!complaintReplyText.trim()}>
                Wyślij odpowiedź
              </Button>
            </Box>
          </Box>

        </Paper>
      </Box>
    );
  };

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
          { id: 'REVIEWS', label: 'Opinie klientów', icon: <MessageSquare /> },
          { id: 'COMPLAINTS', label: 'Reklamacje (Czat)', icon: pendingComplaintsCount > 0 ? <Badge badgeContent={pendingComplaintsCount} color="error"><AlertTriangle /></Badge> : <AlertTriangle /> },
        ].map((item) => {
          const isActive = activeView === item.id ||
            (activeView === 'ORDER_DETAILS' && item.id === 'ORDERS') ||
            (activeView === 'PRODUCT_FORM' && item.id === 'PRODUCTS') ||
            (activeView === 'CUSTOMER_DETAILS' && item.id === 'CUSTOMERS') ||
            (activeView === 'REVIEW_DETAILS' && item.id === 'REVIEWS') ||
            (activeView === 'COMPLAINT_DETAILS' && item.id === 'COMPLAINTS');
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
        <GlobalStyles styles={{ 'html, body': { overflowX: 'hidden', margin: 0, padding: 0, backgroundColor: '#0f172a' }, '#root': { maxWidth: 'none !important', width: '100%', margin: 0, padding: 0 } }} />
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', width: '100%' }}>
          <Card sx={{ width: 400, maxWidth: '90%', p: 2, borderRadius: 3, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
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
      <GlobalStyles styles={{ 'html, body': { overflowX: 'hidden', margin: 0, padding: 0, backgroundColor: '#0f172a' }, '#root': { maxWidth: 'none !important', width: '100%', margin: 0, padding: 0 } }} />
      <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', overflowX: 'hidden', bgcolor: 'background.default' }}>
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
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3, md: 4 }, width: { xs: '100%', sm: `calc(100% - ${DRAWER_WIDTH}px)` }, minWidth: 0, mt: { xs: 7, sm: 8 } }}>
          {activeView === 'DASHBOARD' && renderDashboard()}
          {activeView === 'ORDERS' && renderOrders()}
          {activeView === 'ORDER_DETAILS' && renderOrderDetails()}
          {activeView === 'PRODUCTS' && renderProductsList()}
          {activeView === 'PRODUCT_FORM' && renderProductForm()}
          {activeView === 'CUSTOMERS' && renderCustomersList()}
          {activeView === 'CUSTOMER_DETAILS' && renderCustomerDetails()}
          {activeView === 'REVIEWS' && renderReviewsList()}
          {activeView === 'REVIEW_DETAILS' && renderReviewDetails()}
          {activeView === 'COMPLAINTS' && renderComplaintsList()}
          {activeView === 'COMPLAINT_DETAILS' && renderComplaintDetails()}
        </Box>
      </Box>

      {/* GLOBALNY SNACKBAR NA POWIADOMIENIA */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}