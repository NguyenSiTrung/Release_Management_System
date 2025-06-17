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
    <Box sx={{ width: '100%' }}>
      {/* Subtitle */}
      <Typography 
        variant="body1" 
        align="center" 
        sx={{ 
          color: 'text.secondary', 
          mb: 2,
          fontSize: '0.9rem'
        }}
      >
        Create your account to get started
      </Typography>
      
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 2, width: '100%', borderRadius: 2, fontSize: '0.85rem' }}
        >
          {successMessage}
        </Alert>
      )}
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2, width: '100%', borderRadius: 2, fontSize: '0.85rem' }}
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
          margin="dense"
          required
          fullWidth
          id="username"
          label="Username"
          name="username"
          size="small"
          autoComplete="username"
          value={formik.values.username}
          onChange={formik.handleChange}
          error={formik.touched.username && Boolean(formik.errors.username)}
          helperText={formik.touched.username && formik.errors.username}
          sx={{
            mb: 1.5,
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

        <TextField
          margin="dense"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          size="small"
          autoComplete="email"
          value={formik.values.email}
          onChange={formik.handleChange}
          error={formik.touched.email && Boolean(formik.errors.email)}
          helperText={formik.touched.email && formik.errors.email}
          sx={{
            mb: 1.5,
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

        <TextField
          margin="dense"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          size="small"
          autoComplete="new-password"
          value={formik.values.password}
          onChange={formik.handleChange}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
          sx={{
            mb: 1.5,
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

        <TextField
          margin="dense"
          required
          fullWidth
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          id="confirmPassword"
          size="small"
          autoComplete="new-password"
          value={formik.values.confirmPassword}
          onChange={formik.handleChange}
          error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
          helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
          sx={{
            mb: 1.5,
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

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FormControl 
            fullWidth 
            required
            size="small"
            error={formik.touched.role && Boolean(formik.errors.role)}
            sx={{
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
          >
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              id="role"
              value={formik.values.role}
              label="Role"
              onChange={handleRoleChange}
            >
              {roles.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Tooltip 
            title={
              <Box>
                {roles.map((role) => (
                  <Typography key={role.value} variant="body2" sx={{ mb: 0.5, fontSize: '0.8rem' }}>
                    <strong>{role.label}:</strong> {role.description}
                  </Typography>
                ))}
              </Box>
            }
            placement="left"
          >
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

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
            background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
            boxShadow: '0 3px 15px rgba(156, 39, 176, 0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #7b1fa2 30%, #9c27b0 90%)',
              boxShadow: '0 4px 20px rgba(156, 39, 176, 0.4)',
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
              <Typography variant="body2">Creating account...</Typography>
            </Stack>
          ) : (
            'Create Account'
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default SignupForm; 