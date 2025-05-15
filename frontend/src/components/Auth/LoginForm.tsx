import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';

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
        await login(values);
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
      <Typography component="h1" variant="h5" align="center" gutterBottom>
        Sign in to your account
      </Typography>
      
      {sessionExpired && (
        <Alert 
          severity="warning" 
          sx={{ mt: 2, width: '100%' }}
        >
          Your session has expired. Please sign in again.
        </Alert>
      )}
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2, width: '100%' }}
        >
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 1 }}>
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
        />
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
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={formik.isSubmitting}
          sx={{ mt: 3, mb: 2 }}
        >
          {formik.isSubmitting ? <CircularProgress size={24} /> : 'Sign In'}
        </Button>
      </Box>
    </Box>
  );
};

export default LoginForm; 