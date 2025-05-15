import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { User, LoginCredentials } from '../types';
import { login as apiLogin } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  logoutWithExpiredMessage: () => void;
  isReleaseManager: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check if token expired on initial load
  useEffect(() => {
    // Check if we were redirected due to token expiration
    const urlParams = new URLSearchParams(window.location.search);
    const expired = urlParams.get('expired');
    
    if (expired === 'true') {
      // Clear the URL parameter without refreshing the page
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Check if token is valid and load user data from it
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          // Validate token expiration
          const decoded = jwtDecode<JwtPayload>(token);
          
          // Validate decoded token structure
          if (!decoded || typeof decoded !== 'object' || !decoded.sub || !decoded.role) {
            console.error('Invalid token format:', decoded);
            handleLogout();
            return;
          }
          
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            // Token expired
            handleLogout();
          } else {
            // Token valid, create user object from payload
            setUser({
              user_id: parseInt(decoded.sub),
              username: '',  // Not available in token
              email: '',     // Not available in token 
              role: decoded.role,
              status: 'active', // Default to active for authenticated users
              created_at: '',
              updated_at: '',
            });
          }
        } catch (error) {
          console.error('Invalid token:', error);
          handleLogout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      console.log('Attempting login with:', credentials.username);
      
      const response = await apiLogin(credentials);
      
      // Validate response 
      if (!response || !response.access_token) {
        console.error('Invalid login response:', response);
        throw new Error('Invalid response from server');
      }
      
      console.log('Login successful, received token');
      const { access_token } = response;
      
      // Validate token before using
      try {
        const decoded = jwtDecode<JwtPayload>(access_token);
        console.log('Decoded token payload:', decoded);
        
        if (!decoded || !decoded.sub || !decoded.role) {
          console.error('Invalid token format:', decoded);
          throw new Error('Invalid token format');
        }
      } catch (e) {
        console.error('Error validating token:', e);
        throw new Error('Could not validate authentication token');
      }
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      // Extract user info from token instead of expecting it in response
      const decoded = jwtDecode<JwtPayload>(access_token);
      setUser({
        user_id: parseInt(decoded.sub),
        username: '',  // Not available in token
        email: '',     // Not available in token 
        role: decoded.role,
        status: 'active', // Default to active for authenticated users
        created_at: '',
        updated_at: '',
      });
      
      // Redirect to dashboard after successful login
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const logout = () => {
    handleLogout();
    navigate('/login');
  };

  const logoutWithExpiredMessage = () => {
    handleLogout();
    navigate('/login?expired=true');
  };

  const isAuthenticated = !!user;
  const isReleaseManager = !!user && (user.role === 'release_manager' || user.role === 'admin');
  const isAdmin = !!user && user.role === 'admin';

  // Adding debug console log to troubleshoot role issue
  console.log('AuthContext: User role =', user?.role);
  console.log('AuthContext: isReleaseManager =', isReleaseManager);
  console.log('AuthContext: isAdmin =', isAdmin);
  
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        logoutWithExpiredMessage,
        isReleaseManager,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 