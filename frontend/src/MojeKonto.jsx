import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Divider,
  IconButton
} from '@mui/material';
import { User, ShoppingCart, LogOut, X } from 'lucide-react';

const AccountMenu = ({ userData, onClose, onLogout }) => {
  // Zabezpieczenie przed brakiem danych
  if (!userData) {
    return null;
  }

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
      {/* Nagłówek z przyciskiem zamknięcia */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box>
          <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
            Zalogowany jako
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {userData?.imie || userData?.first_name || userData?.username}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {userData?.email}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
          <X size={18} />
        </IconButton>
      </Box>

      {/* Dane szczegółowe */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <User size={16} />
          <Typography variant="body2">
            {userData?.imie || '-'} {userData?.nazwisko || ''}
          </Typography>
        </Box>
        {userData?.nr_tel && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <Typography variant="body2">{userData.nr_tel}</Typography>
          </Box>
        )}
      </Box>

      {/* Menu akcji */}
      <Box sx={{ p: 1 }}>
        <Button
          fullWidth
          sx={{ justifyContent: 'flex-start', mb: 0.5, color: 'text.primary' }}
          startIcon={<ShoppingCart size={18} />}
          onClick={() => {
            onClose();
            // TODO: przekieruj do historii zamówień
          }}
        >
          Moje zamówienia
        </Button>
        <Button
          fullWidth
          sx={{ justifyContent: 'flex-start', mb: 0.5, color: 'text.primary' }}
          startIcon={<User size={18} />}
          onClick={() => {
            onClose();
            // TODO: przekieruj do edycji profilu
          }}
        >
          Ustawienia konta
        </Button>
        <Divider sx={{ my: 1 }} />
        <Button
          fullWidth
          sx={{ justifyContent: 'flex-start', color: '#dc3545' }}
          startIcon={<LogOut size={18} />}
          onClick={() => {
            onLogout();
            onClose();
          }}
        >
          Wyloguj się
        </Button>
      </Box>
    </Paper>
  );
};

export default AccountMenu;