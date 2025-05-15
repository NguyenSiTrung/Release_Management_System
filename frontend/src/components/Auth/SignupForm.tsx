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
  IconButton
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
    <Box sx={{ width: '100%', position: 'relative', pb: 4 }}>
      <Typography component="h1" variant="h5" align="center" gutterBottom>
        Create an Account
      </Typography>
      
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mt: 2, width: '100%' }}
        >
          {successMessage}
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

      <Box 
        component="form" 
        onSubmit={formik.handleSubmit} 
        sx={{ 
          mt: 1,
          minHeight: '420px', // Reduced height
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        <Box>
          <TextField
            margin="dense"
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
            size="small"
          />
          <TextField
            margin="dense"
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
            size="small"
          />
          <TextField
            margin="dense"
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
            size="small"
          />
          <TextField
            margin="dense"
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
            size="small"
          />
          
          {/* Role Selection */}
          <FormControl 
            fullWidth 
            margin="dense"
            error={formik.touched.role && Boolean(formik.errors.role)}
            size="small"
            sx={{ mb: 3 }}  // Add bottom margin
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
              <Typography variant="caption" color="error">
                {formik.errors.role as string}
              </Typography>
            )}
            {formik.values.role !== 'member' && (
              <Typography variant="caption" color="primary" sx={{ mt: 1, mb: 2 }}>
                This role requires admin approval after registration.
              </Typography>
            )}
          </FormControl>
        </Box>
        
        <Box sx={{ width: '100%', position: 'relative', mt: 1 }}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={formik.isSubmitting}
            sx={{ mb: 4 }} // Increased bottom margin
          >
            {formik.isSubmitting ? <CircularProgress size={24} /> : 'Sign Up'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SignupForm; 