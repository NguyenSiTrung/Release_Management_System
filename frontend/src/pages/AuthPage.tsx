import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  useTheme,
  Card,
  CardContent,
  Stack,
  alpha
} from '@mui/material';
import LoginForm from '../components/Auth/LoginForm';
import SignupForm from '../components/Auth/SignupForm';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TranslateIcon from '@mui/icons-material/Translate';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `auth-tab-${index}`,
    'aria-controls': `auth-tabpanel-${index}`,
  };
};

const AuthPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRegistrationSuccess = () => {
    // Switch to login tab after successful registration
    setTabValue(0);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.8)} 50%, ${alpha(theme.palette.secondary.main, 0.7)} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          zIndex: 1,
        }
      }}
    >
      <Container 
        maxWidth="md"
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* Header Section */}
        <Box sx={{ textAlign: 'center', mb: 4, width: '100%' }}>
          {/* Logo/Icon */}
          <Box 
            sx={{ 
              display: 'inline-flex',
              p: 2,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              mb: 2,
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <TranslateIcon sx={{ fontSize: 48, color: 'white' }} />
          </Box>
          
          {/* App Title */}
          <Typography 
            component="h1" 
            variant="h4"
            sx={{ 
              fontWeight: 700,
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              mb: 1,
              letterSpacing: '-0.01em',
              fontSize: { xs: '1.75rem', sm: '2.125rem', md: '2.5rem' },
              lineHeight: 1.2,
              px: 2
            }}
          >
            NMT Release Management
          </Typography>
          
          {/* Subtitle */}
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 300,
              maxWidth: 600,
              mx: 'auto',
              fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
              px: 2
            }}
          >
            Streamline your Neural Machine Translation workflow
          </Typography>
        </Box>
        
        {/* Auth Card */}
        <Card 
          elevation={0}
          sx={{ 
            width: '100%', 
            maxWidth: 500, 
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            {/* Tab Headers */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(248, 249, 250, 0.8)' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                variant="fullWidth"
                indicatorColor="primary"
                textColor="primary"
                sx={{ 
                  '& .MuiTab-root': {
                    py: 2.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&.Mui-selected': {
                      color: theme.palette.primary.main,
                    }
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0'
                  }
                }}
              >
                <Tab 
                  label="Sign In" 
                  {...a11yProps(0)}
                />
                <Tab 
                  label="Sign Up" 
                  {...a11yProps(1)}
                />
              </Tabs>
            </Box>
            
            {/* Tab Content */}
            <Box sx={{ px: 5, py: 2, flexGrow: 1, minHeight: 'auto' }}>
              <TabPanel value={tabValue} index={0}>
                <LoginForm />
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <SignupForm onSuccess={handleRegistrationSuccess} />
              </TabPanel>
            </Box>
          </CardContent>
        </Card>
        
        {/* Feature Highlights */}
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={3} 
          sx={{ mt: 4, textAlign: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.9)' }}>
            <AccountBalanceIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Enterprise Grade
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.9)' }}>
            <TranslateIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Multi-Language Support
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.9)' }}>
            <BusinessCenterIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Professional Workflow
            </Typography>
          </Box>
        </Stack>
        
        {/* Footer */}
        <Typography 
          variant="body2" 
          sx={{ 
            mt: 4, 
            color: 'rgba(255,255,255,0.6)',
            textAlign: 'center'
          }}
        >
          © {new Date().getFullYear()} NMT Release Management System | 
          <Box component="span" sx={{ mx: 1, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
            By trungns_ares
          </Box>
          | v1.0.0
        </Typography>
      </Container>
    </Box>
  );
};

export default AuthPage; 