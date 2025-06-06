import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import RequireAuth from './components/Auth/RequireAuth';
import MainLayout from './components/Layout/MainLayout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import LanguagePairs from './pages/LanguagePairs';
import ModelVersions from './pages/ModelVersions';
import ModelVersionDetail from './pages/ModelVersionDetail';
import Testsets from './pages/Testsets';
import Visualizations from './pages/Visualizations';
import SQEResults from './pages/SQEResults';
import Users from './pages/Users';
import EvaluationTranslation from './pages/EvaluationTranslation';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<AuthPage />} />
            
            {/* Protected routes */}
            <Route element={<RequireAuth />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/language-pairs" element={<LanguagePairs />} />
                <Route path="/model-versions" element={<ModelVersions />} />
                <Route path="/model-versions/:versionId" element={<ModelVersionDetail />} />
                <Route path="/testsets" element={<Testsets />} />
                <Route path="/visualizations" element={<Visualizations />} />
                <Route path="/sqe-results" element={<SQEResults />} />
                <Route path="/evaluation-translation" element={<EvaluationTranslation />} />
                <Route path="/users" element={<Users />} />
              </Route>
            </Route>
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
