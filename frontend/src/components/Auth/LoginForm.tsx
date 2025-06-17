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
  Stack
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
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
    <Box sx={{ width: '100%' }}>      
      {/* Subtitle */}
      <Typography 
        variant="body1" 
        align="center" 
        sx={{ 
          color: 'text.secondary', 
          mb: 3,
          fontSize: '0.9rem'
        }}
      >
        Welcome back! Please enter your credentials
      </Typography>
      
      {/* Session Expired Alert */}
      {sessionExpired && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 2,
            width: '100%',
            borderRadius: 2,
            fontSize: '0.85rem'
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
            borderRadius: 2,
            fontSize: '0.85rem'
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
          size="medium"
          value={formik.values.username}
          onChange={formik.handleChange}
          error={formik.touched.username && Boolean(formik.errors.username)}
          helperText={formik.touched.username && formik.errors.username}
          InputProps={{
            startAdornment: (
              <EmailIcon sx={{ color: 'action.active', mr: 1, fontSize: 18 }} />
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
                borderWidth: '2px'
              },
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.9rem',
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
          size="medium"
          autoComplete="current-password"
          value={formik.values.password}
          onChange={formik.handleChange}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
          InputProps={{
            startAdornment: (
              <VpnKeyIcon sx={{ color: 'action.active', mr: 1, fontSize: 18 }} />
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
                borderWidth: '2px'
              },
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.9rem',
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
              size="small"
            />
          }
          label={
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
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
            mb: 2,
            py: 1.5,
            borderRadius: 3,
            fontSize: '0.95rem',
            fontWeight: 600,
            textTransform: 'none',
            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            boxShadow: '0 3px 15px rgba(25, 118, 210, 0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1565c0 30%, #1e88e5 90%)',
              boxShadow: '0 4px 20px rgba(25, 118, 210, 0.4)',
              transform: 'translateY(-1px)'
            },
            '&:disabled': {
              background: 'rgba(0, 0, 0, 0.12)',
            }
          }}
        >
          {formik.isSubmitting ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={18} color="inherit" />
              <Typography variant="body2">Signing in...</Typography>
            </Stack>
          ) : (
            'Sign In'
          )}
        </Button>
        
        {/* Sign Up Link */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
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
              Sign up here
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginForm; 