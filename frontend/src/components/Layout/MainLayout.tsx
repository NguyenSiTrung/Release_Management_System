import React, { useState, ErrorInfo, Component } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  CssBaseline
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Language as LanguageIcon,
  Code as CodeIcon,
  CheckCircle as TestsetIcon,
  BarChart as VisualizationIcon,
  People as PeopleIcon,
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ErrorDisplay from '../common/ErrorDisplay';

// Error boundary to catch rendering errors in child components
class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Caught error in ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorDisplay message={this.state.error} onRetry={() => window.location.reload()} />;
    }

    return this.props.children;
  }
}

const drawerWidth = 260;

const MainLayout: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  // New handler for navigation that preserves state-related query parameters
  const handleNavigation = (path: string) => {
    // Get current URL search parameters related to state (like langPairId)
    const searchParams = new URLSearchParams(location.search);
    const stateParams = new URLSearchParams();
    
    // Only preserve state-related parameters
    if (searchParams.has('langPairId')) {
      stateParams.set('langPairId', searchParams.get('langPairId')!);
    }
    
    // For Model Versions page, include the state parameters
    if (path === '/model-versions' && stateParams.toString()) {
      navigate(`${path}?${stateParams.toString()}`);
    } else {
      navigate(path);
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Language Pairs', icon: <LanguageIcon />, path: '/language-pairs' },
    { text: 'Model Versions', icon: <CodeIcon />, path: '/model-versions' },
    { text: 'Testsets', icon: <TestsetIcon />, path: '/testsets' },
    { text: 'Visualizations', icon: <VisualizationIcon />, path: '/visualizations' },
    { text: 'SQE Results', icon: <AssessmentIcon />, path: '/sqe-results' },
    { text: 'Evaluation & Translation', icon: <ScienceIcon />, path: '/evaluation-translation' },
  ];

  // Add User Management for admins
  if (isAdmin) {
    menuItems.push({ text: 'User Management', icon: <PeopleIcon />, path: '/users' });
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: '#fff',
          color: '#344767',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(0,0,0,0.04)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={open ? handleDrawerClose : handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 2,
              color: '#344767',
              '&:hover': {
                backgroundColor: 'rgba(94,114,228,0.1)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ 
            flexGrow: 1, 
            color: '#344767',
            fontWeight: 600,
            fontSize: '1rem',
          }}>
            NMT Release Management
          </Typography>
          {user && (
            <div>
              <IconButton
                onClick={handleUserMenuOpen}
                size="small"
                sx={{ 
                  p: 0,
                  ml: 2,
                  border: '2px solid rgba(94,114,228,0.3)'
                }}
                aria-controls="user-menu"
                aria-haspopup="true"
              >
                <Avatar sx={{ 
                  bgcolor: 'rgba(94,114,228,0.9)',
                  color: '#fff',
                  width: 34,
                  height: 34
                }}>
                  {user && typeof user.username === 'string' ? user.username.charAt(0).toUpperCase() : '?'}
                </Avatar>
              </IconButton>
              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleUserMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    boxShadow: '0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)',
                    borderRadius: '0.5rem',
                  }
                }}
              >
                <MenuItem disabled>
                  <Typography variant="body2" sx={{ color: '#344767', fontWeight: 500 }}>
                    {typeof user?.username === 'string' ? user.username : 'User'}
                  </Typography>
                </MenuItem>
                <MenuItem disabled>
                  <Typography variant="body2" sx={{ color: '#8392ab', fontSize: '0.75rem' }}>
                    Role: {typeof user?.role === 'string' ? user.role : 'Unknown'}
                  </Typography>
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={handleLogout} sx={{ 
                  color: '#344767',
                  '&:hover': {
                    backgroundColor: 'rgba(94,114,228,0.1)',
                  } 
                }}>
                  Logout
                </MenuItem>
              </Menu>
            </div>
          )}
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? drawerWidth : theme.spacing(9),
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          ...(open ? {
            '& .MuiDrawer-paper': {
              overflowX: 'hidden',
              overflowY: 'auto',
              width: drawerWidth,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              boxSizing: 'border-box',
              background: '#fff',
              borderRight: '0px',
              boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
            }
          } : {
            '& .MuiDrawer-paper': {
              overflowX: 'hidden',
              overflowY: 'auto',
              width: theme.spacing(9),
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              boxSizing: 'border-box',
              background: '#fff',
              borderRight: '0px',
              boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
            }
          })
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            px: [1],
            borderBottom: '0px',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 22px',
              height: '32px',
              lineHeight: '32px',
              marginRight: 'auto',
              fontWeight: 700,
              fontSize: '18px',
              color: '#344767',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {open ? 'NMT System' : ''}
          </Box>
        </Toolbar>
        <Divider sx={{ borderColor: 'rgba(0,0,0,0.04)' }} />
        <List sx={{ pt: 2 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname.includes(item.path);
            
            return (
              <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 1 }}>
                <ListItemButton
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    py: 1,
                    mx: open ? 2 : 1,
                    borderRadius: '0.5rem',
                    ...(isActive && {
                      background: 'linear-gradient(90deg, rgba(94,114,228,1) 0%, rgba(130,94,228,1) 100%)',
                      boxShadow: '0 3px 5px -1px rgba(94,114,228,.2), 0 6px 10px 0 rgba(94,114,228,.14), 0 1px 18px 0 rgba(94,114,228,.12)',
                      color: 'white'
                    }),
                    '&:hover': {
                      backgroundColor: isActive ? 'rgba(94,114,228,0.9)' : 'rgba(94,114,228,0.1)',
                    },
                  }}
                  onClick={() => handleNavigation(item.path)}
                  selected={isActive}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2 : 'auto',
                      justifyContent: 'center',
                      color: isActive ? 'white' : '#344767',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ 
                      opacity: open ? 1 : 0,
                      '& .MuiTypography-root': {
                        fontWeight: isActive ? 600 : 400,
                        fontSize: '0.875rem',
                        color: isActive ? 'white' : '#344767',
                      }
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          pt: '80px', // Space for AppBar
          px: { xs: 2, sm: 2.5, md: 3 },
          pb: { xs: 2, sm: 2.5, md: 3 },
        }}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </Box>
    </Box>
  );
};

export default MainLayout; 