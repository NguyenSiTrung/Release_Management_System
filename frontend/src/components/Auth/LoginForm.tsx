import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  Link,
  Divider,
  Stack
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailIcon from '@mui/icons-material/Email';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

const validationSchema = Yup.object({
  username: Yup.string()
    .required('Username is required'),
  password: Yup.string()
    .required('Password is required')
});

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Check if redirected due to token expiration
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const expired = urlParams.get('expired');
    
    if (expired === 'true') {
      setSessionExpired(true);
      // Clear the URL parameter without refreshing the page
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setError(null);
        await login(values, rememberMe);
      } catch (err: any) {
        console.error('Login error:', err);
        
        // Handle different types of errors from the API
        if (err.response) {
          const status = err.response.status;
          
          // Handle specific status codes
          if (status === 401) {
            setError('Invalid username or password. Please try again.');
          } else if (status === 422) {
            // Validation error
            if (err.response.data?.detail) {
              if (typeof err.response.data.detail === 'string') {
                setError(err.response.data.detail);
              } else if (Array.isArray(err.response.data.detail)) {
                // FastAPI validation errors are often returned as an array
                setError(err.response.data.detail.map((e: any) => e.msg).join(', '));
              } else {
                setError('Validation error. Please check your input.');
              }
            } else {
              setError('Validation error. Please check your input.');
            }
          } else {
            // Handle other error responses with data
            if (err.response.data?.detail) {
              setError(err.response.data.detail);
            } else if (err.response.data?.msg) {
              setError(err.response.data.msg);
            } else if (typeof err.response.data === 'object') {
              setError('Error: ' + JSON.stringify(err.response.data));
            } else if (typeof err.response.data === 'string') {
              setError(err.response.data);
            } else {
              setError(`Server error (${status}). Please try again later.`);
            }
          }
        } else if (err.request) {
          // Request was made but no response received
          setError('No response from server. Please check your connection.');
        } else {
          // Error in setting up the request
          setError(err.message || 'Login failed. Please try again.');
        }
        
        setSubmitting(false);
      }
    },
  });

  return (
    <Box sx={{ width: '100%', minWidth: 350 }}>
      {/* Header Section with Icon */}
      <Stack direction="row" alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
        <Box 
          sx={{ 
            p: 1.5, 
            borderRadius: '50%', 
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2
          }}
        >
          <LockOutlinedIcon sx={{ color: 'white', fontSize: 24 }} />
        </Box>
        <Typography 
          component="h1" 
          variant="h4" 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            mb: 0
          }}
        >
          Sign In
        </Typography>
      </Stack>
      
      {/* Subtitle */}
      <Typography 
        variant="body1" 
        align="center" 
        sx={{ 
          color: 'text.secondary', 
          mb: 3,
          fontSize: '0.95rem'
        }}
      >
        Enter your username and password to sign in
      </Typography>
      
      {/* Session Expired Alert */}
      {sessionExpired && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 2,
            width: '100%',
            borderRadius: 2
          }}
        >
          Your session has expired. Please sign in again.
        </Alert>
      )}
      
      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            width: '100%',
            borderRadius: 2
          }}
        >
          {error}
        </Alert>
      )}

      {/* Login Form */}
      <Box component="form" onSubmit={formik.handleSubmit} sx={{ width: '100%' }}>
        {/* Username Field */}
        <TextField
          margin="normal"
          required
          fullWidth
          id="username"
          label="Username"
          name="username"
          autoComplete="username"
          autoFocus
          value={formik.values.username}
          onChange={formik.handleChange}
          error={formik.touched.username && Boolean(formik.errors.username)}
          helperText={formik.touched.username && formik.errors.username}
          InputProps={{
            startAdornment: (
              <EmailIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
            '& .MuiInputLabel-root': {
              fontSize: '1rem',
            },
          }}
        />
        
        {/* Password Field */}
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          value={formik.values.password}
          onChange={formik.handleChange}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
          InputProps={{
            startAdornment: (
              <VpnKeyIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
            '& .MuiInputLabel-root': {
              fontSize: '1rem',
            },
          }}
        />
        
        {/* Remember Me Checkbox */}
        <FormControlLabel
          control={
            <Checkbox 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Remember me for 30 days
            </Typography>
          }
          sx={{ mb: 3, alignSelf: 'flex-start', ml: 0 }}
        />
        
        {/* Sign In Button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={formik.isSubmitting}
          sx={{ 
            mb: 3,
            py: 1.5,
            borderRadius: 2,
            fontSize: '1rem',
            fontWeight: 600,
            textTransform: 'none',
            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            boxShadow: '0 3px 15px rgba(25, 118, 210, 0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1565c0 30%, #1e88e5 90%)',
              boxShadow: '0 4px 20px rgba(25, 118, 210, 0.4)',
            },
            '&:disabled': {
              background: 'rgba(0, 0, 0, 0.12)',
            }
          }}
        >
          {formik.isSubmitting ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={20} color="inherit" />
              <Typography variant="body2">Signing in...</Typography>
            </Stack>
          ) : (
            'Sign In'
          )}
        </Button>
        
        {/* Divider */}
        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', px: 2 }}>
            or
          </Typography>
        </Divider>
        
        {/* Sign Up Link */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Don't have an account?{' '}
            <Link 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                // This will be handled by the parent AuthPage tabs
                const signUpTab = document.querySelector('[aria-controls="auth-tabpanel-1"]') as HTMLElement;
                if (signUpTab) signUpTab.click();
              }}
              sx={{ 
                color: 'primary.main',
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                }
              }}
            >
              Sign up
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginForm; 