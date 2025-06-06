import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  IconButton,
  Stack
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { register } from '../../services/api';

interface SignupFormProps {
  onSuccess: () => void;
}

const validationSchema = Yup.object({
  username: Yup.string()
    .required('Username is required')
    .min(4, 'Username must be at least 4 characters'),
  email: Yup.string()
    .required('Email is required')
    .email('Invalid email format'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords must match'),
  role: Yup.string()
    .required('Role is required')
});

// Role definitions
const roles = [
  { value: 'member', label: 'Member', description: 'Basic access to view resources' },
  { value: 'release_manager', label: 'Release Manager', description: 'Can manage model versions and releases' },
  { value: 'admin', label: 'Administrator', description: 'Full system access and user management' }
];

const SignupForm: React.FC<SignupFormProps> = ({ onSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'member'
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        setError(null);
        // Register the user (confirmPassword is not sent to API)
        const { confirmPassword, ...userData } = values;
        const result = await register(userData);
        
        // Check if higher role that needs approval
        if (values.role !== 'member') {
          setSuccessMessage(
            'Your account has been registered but requires admin approval. ' +
            'You will be notified when your account is approved.'
          );
        } else {
          setSuccessMessage('Registration successful! You can now sign in.');
        }
        
        resetForm();
        
        // Only redirect to login if it's a regular member (auto-approved)
        if (values.role === 'member') {
          // Notify parent component of successful registration
          setTimeout(() => {
            onSuccess();
          }, 2000); // Give user time to see success message
        }
        
      } catch (err: any) {
        console.error('Registration error:', err);
        
        // Handle different types of errors from the API
        if (err.response) {
          const status = err.response.status;
          
          if (status === 400) {
            // Most likely email or username already exists
            setError(err.response.data?.detail || 'Username or email already exists.');
          } else if (status === 422) {
            // Validation error
            setError('Invalid input. Please check the fields and try again.');
          } else {
            // Handle other error responses
            setError(err.response.data?.detail || 'Registration failed. Please try again.');
          }
        } else {
          setError('Network error. Please check your connection and try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Handle role change
  const handleRoleChange = (event: SelectChangeEvent<string>) => {
    formik.setFieldValue('role', event.target.value);
  };

  return (
    <Box sx={{ width: '100%', minWidth: 350 }}>
      {/* Header Section with Icon */}
      <Stack direction="row" alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
        <Box 
          sx={{ 
            p: 1.5, 
            borderRadius: '50%', 
            bgcolor: 'secondary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2
          }}
        >
          <PersonAddIcon sx={{ color: 'white', fontSize: 24 }} />
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
          Sign Up
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
        Create your account to get started
      </Typography>
      
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 2, width: '100%', borderRadius: 2 }}
        >
          {successMessage}
        </Alert>
      )}
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2, width: '100%', borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      <Box 
        component="form" 
        onSubmit={formik.handleSubmit} 
        sx={{ width: '100%' }}
      >
        <TextField
          margin="normal"
          required
          fullWidth
          id="username"
          label="Username"
          name="username"
          autoComplete="username"
          value={formik.values.username}
          onChange={formik.handleChange}
          error={formik.touched.username && Boolean(formik.errors.username)}
          helperText={formik.touched.username && formik.errors.username}
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
        
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          value={formik.values.email}
          onChange={formik.handleChange}
          error={formik.touched.email && Boolean(formik.errors.email)}
          helperText={formik.touched.email && formik.errors.email}
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
        
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="new-password"
          value={formik.values.password}
          onChange={formik.handleChange}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
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
        
        <TextField
          margin="normal"
          required
          fullWidth
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          id="confirmPassword"
          autoComplete="new-password"
          value={formik.values.confirmPassword}
          onChange={formik.handleChange}
          error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
          helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
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
        
        {/* Role Selection */}
        <FormControl 
          fullWidth 
          margin="normal"
          error={formik.touched.role && Boolean(formik.errors.role)}
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
          }}
        >
          <InputLabel id="role-select-label">Account Role</InputLabel>
          <Select
            labelId="role-select-label"
            id="role"
            name="role"
            value={formik.values.role}
            onChange={handleRoleChange}
            label="Account Role"
            endAdornment={
              <Tooltip title="Select the appropriate role for your account. Higher roles (Release Manager & Admin) require approval from administrators.">
                <IconButton size="small" sx={{ mr: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {roles.map((role) => (
              <MenuItem key={role.value} value={role.value}>
                <Box>
                  <Typography variant="body1">{role.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {role.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
          {formik.touched.role && formik.errors.role && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              {formik.errors.role as string}
            </Typography>
          )}
        </FormControl>

        {formik.values.role !== 'member' && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            This role requires admin approval after registration.
          </Alert>
        )}
        
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
            background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
            boxShadow: '0 3px 15px rgba(46, 125, 50, 0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1b5e20 30%, #388e3c 90%)',
              boxShadow: '0 4px 20px rgba(46, 125, 50, 0.4)',
            },
            '&:disabled': {
              background: 'rgba(0, 0, 0, 0.12)',
            }
          }}
        >
          {formik.isSubmitting ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={20} color="inherit" />
              <Typography variant="body2">Creating account...</Typography>
            </Stack>
          ) : (
            'Sign Up'
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default SignupForm; 