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
  Stack
} from '@mui/material';
import LoginForm from '../components/Auth/LoginForm';
import SignupForm from '../components/Auth/SignupForm';

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
      style={{ 
        maxHeight: '480px', 
        overflowY: 'auto' 
      }}
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
    <Container maxWidth={false} 
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: `linear-gradient(45deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
        py: 4
      }}
    >
      {/* App Title */}
      <Typography 
        component="h1" 
        variant="h3" 
        sx={{ 
          mb: 4, 
          fontWeight: 'bold',
          color: 'white',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}
      >
        NMT Release Management
      </Typography>
      
      {/* Auth Card */}
      <Card 
        elevation={10} 
        sx={{ 
          width: '100%', 
          maxWidth: 500, 
          borderRadius: 2,
          boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
          maxHeight: '80vh',  // Limit max height to prevent overflow
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {/* Tab Headers */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
              sx={{ mt: 0 }}
            >
              <Tab 
                label="Sign In" 
                {...a11yProps(0)} 
                sx={{ py: 2, fontSize: '1rem' }}
              />
              <Tab 
                label="Sign Up" 
                {...a11yProps(1)} 
                sx={{ py: 2, fontSize: '1rem' }}
              />
            </Tabs>
          </Box>
          
          {/* Tab Content */}
          <Box sx={{ px: 3 }}>
            <TabPanel value={tabValue} index={0}>
              <LoginForm />
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <SignupForm onSuccess={handleRegistrationSuccess} />
            </TabPanel>
          </Box>
        </CardContent>
      </Card>
      
      {/* Footer */}
      <Typography variant="body2" sx={{ mt: 3, color: 'rgba(255,255,255,0.7)' }}>
        © {new Date().getFullYear()} NMT Release Management System | By trungns_ares | v1.0.0
      </Typography>
    </Container>
  );
};

export default AuthPage; 