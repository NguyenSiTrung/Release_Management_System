import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Avatar,
  Box,
  Typography,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'error',
}) => {
  const getHeaderColors = () => {
    switch (confirmColor) {
      case 'error':
        return {
          background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
          hoverBackground: 'linear-gradient(135deg, #c82333 0%, #a71e2a 100%)',
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
          hoverBackground: 'linear-gradient(135deg, #e0a800 0%, #d39e00 100%)',
        };
      case 'success':
        return {
          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
          hoverBackground: 'linear-gradient(135deg, #218838 0%, #1e7e34 100%)',
        };
      default:
        return {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          hoverBackground: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
        };
    }
  };

  const colors = getHeaderColors();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 4,
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid #e9ecef',
        background: colors.background,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 3
      }}>
        <Avatar sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
          {confirmColor === 'error' ? <DeleteIcon /> : <WarningIcon />}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            This action requires confirmation
          </Typography>
        </Box>
        <Button
          onClick={onCancel}
          disabled={isLoading}
          sx={{ 
            color: 'white',
            minWidth: 'auto',
            p: 1,
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
          }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>
      
      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ 
          textAlign: 'center',
          py: 2
        }}>
          <Avatar sx={{ 
            width: 64,
            height: 64,
            margin: '0 auto',
            mb: 3,
            backgroundColor: confirmColor === 'error' ? '#f8d7da' : '#fff3cd',
            color: confirmColor === 'error' ? '#721c24' : '#856404'
          }}>
            {confirmColor === 'error' ? 
              <DeleteIcon sx={{ fontSize: 32 }} /> : 
              <WarningIcon sx={{ fontSize: 32 }} />
            }
          </Avatar>
          
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            mb: 2,
            color: '#344767'
          }}>
            Are you sure?
          </Typography>
          
          <Typography variant="body1" sx={{ 
            color: '#67748e',
            lineHeight: 1.6
          }}>
            {message}
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        borderTop: '1px solid #e9ecef',
        p: 3,
        backgroundColor: '#f8f9fa',
        gap: 2
      }}>
        <Button 
          onClick={onCancel} 
          disabled={isLoading}
          variant="outlined"
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            borderColor: '#6c757d',
            color: '#6c757d',
            '&:hover': {
              borderColor: '#5a6268',
              backgroundColor: 'rgba(108, 117, 125, 0.04)'
            }
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : (confirmColor === 'error' ? <DeleteIcon /> : <WarningIcon />)}
          sx={{
            background: colors.background,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              background: colors.hoverBackground,
              transform: 'translateY(-1px)',
              boxShadow: 4
            },
            '&:disabled': {
              background: '#e9ecef',
              color: '#6c757d'
            }
          }}
        >
          {isLoading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog; 