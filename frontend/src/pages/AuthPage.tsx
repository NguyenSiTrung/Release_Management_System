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
  alpha,
  Grid
} from '@mui/material';
import LoginForm from '../components/Auth/LoginForm';
import SignupForm from '../components/Auth/SignupForm';
import TranslateIcon from '@mui/icons-material/Translate';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import GroupIcon from '@mui/icons-material/Group';

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
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
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
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.8)} 0%, ${alpha(theme.palette.secondary.main, 0.6)} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJudW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=")',
          opacity: 0.4,
          zIndex: 1,
        }
      }}
    >
      <Container 
        maxWidth="lg"
        sx={{ 
          position: 'relative',
          zIndex: 2,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Grid container spacing={4} alignItems="center" sx={{ height: '100%', maxHeight: '90vh' }}>
          
          {/* Left Side - Brand Info */}
          <Grid item xs={12} md={6} sx={{ 
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            height: '100%'
          }}>
            <Box sx={{ textAlign: 'left', color: 'white' }}>
              
              {/* Logo/Icon */}
              <Box 
                sx={{ 
                  display: 'inline-flex',
                  p: 3,
                  borderRadius: 3,
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  mb: 4,
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <TranslateIcon sx={{ fontSize: 56, color: 'white' }} />
              </Box>
              
              {/* App Title */}
              <Typography 
                component="h1" 
                variant="h3"
                sx={{ 
                  fontWeight: 700,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  mb: 2,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                NMT Release
                <br />
                Management
              </Typography>
              
              {/* Subtitle */}
              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 400,
                  mb: 4,
                  fontSize: '1.1rem',
                  lineHeight: 1.5
                }}
              >
                Professional Neural Machine Translation workflow management platform
              </Typography>

              {/* Feature List */}
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SecurityIcon sx={{ mr: 2, fontSize: 20, color: 'rgba(255, 255, 255, 0.8)' }} />
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Enterprise-grade security & role management
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SpeedIcon sx={{ mr: 2, fontSize: 20, color: 'rgba(255, 255, 255, 0.8)' }} />
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Automated evaluation & performance tracking
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <GroupIcon sx={{ mr: 2, fontSize: 20, color: 'rgba(255, 255, 255, 0.8)' }} />
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Team collaboration & quality assurance
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
          
          {/* Right Side - Auth Card */}
          <Grid item xs={12} md={6} sx={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
            <Card 
              elevation={0}
              sx={{ 
                width: '100%', 
                maxWidth: 420,
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 30px 60px rgba(0, 0, 0, 0.12)',
                overflow: 'hidden'
              }}
            >
              {/* Mobile Header - Only shown on mobile */}
              <Box sx={{ 
                display: { xs: 'block', md: 'none' },
                textAlign: 'center',
                p: 3,
                pb: 0
              }}>
                <TranslateIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  NMT Management
                </Typography>
              </Box>

              {/* Tab Headers */}
              <Box sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                bgcolor: 'rgba(248, 249, 250, 0.7)'
              }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange} 
                  variant="fullWidth"
                  indicatorColor="primary"
                  textColor="primary"
                  sx={{ 
                    '& .MuiTab-root': {
                      py: 2,
                      fontSize: '0.95rem',
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
              <CardContent sx={{ p: 4, pb: 3 }}>
                <TabPanel value={tabValue} index={0}>
                  <LoginForm />
                </TabPanel>
                
                <TabPanel value={tabValue} index={1}>
                  <SignupForm onSuccess={handleRegistrationSuccess} />
                </TabPanel>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Footer */}
        <Typography 
          variant="body2" 
          sx={{ 
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
            fontSize: '0.8rem'
          }}
        >
          © {new Date().getFullYear()} NMT Release Management System | By trungns_ares | v7.1.1
        </Typography>
      </Container>
    </Box>
  );
};

export default AuthPage; 