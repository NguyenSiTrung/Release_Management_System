import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Language as LanguageIcon,
  Code as CodeIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getLanguagePairs, getModelVersions } from '../services/api';
import { LanguagePair, ModelVersion } from '../types';
import PageHeader from '../components/common/PageHeader';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';

const Dashboard: React.FC = () => {
  const [langPairs, setLangPairs] = useState<LanguagePair[]>([]);
  const [recentVersions, setRecentVersions] = useState<ModelVersion[]>([]);
  const [modelCountByLangPair, setModelCountByLangPair] = useState<{ name: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch language pairs
        const langPairsData = await getLanguagePairs();
        setLangPairs(langPairsData);
        
        // Create data for chart
        const langPairCounts: { name: string; count: number }[] = [];
        const recentVersionsArray: ModelVersion[] = [];
        
        // For each language pair, fetch model versions
        for (const langPair of langPairsData) {
          const versions = await getModelVersions(langPair.lang_pair_id);
          
          // Count models per language pair
          langPairCounts.push({
            name: `${langPair.source_language_code}-${langPair.target_language_code}`,
            count: versions.length
          });
          
          // Add recent versions to array
          recentVersionsArray.push(...versions);
        }
        
        setModelCountByLangPair(langPairCounts);
        
        // Sort versions by release date (desc) and take the 5 most recent
        const sortedVersions = recentVersionsArray.sort((a, b) => {
          if (!a.release_date) return 1;
          if (!b.release_date) return -1;
          return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
        }).slice(0, 5);
        
        setRecentVersions(sortedVersions);
        
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        // Safely handle error objects
        if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else if (err.response?.data && typeof err.response.data === 'object') {
          // Handle validation error object with type, loc, msg properties
          if (err.response.data.msg) {
            setError(`Error: ${err.response.data.msg}`);
          } else {
            setError('Failed to load dashboard data. ' + JSON.stringify(err.response.data));
          }
        } else if (err.message) {
          setError(`Error: ${err.message}`);
        } else {
          setError('Failed to load dashboard data. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const getLanguagePairName = (langPairId: number) => {
    const langPair = langPairs.find(lp => lp.lang_pair_id === langPairId);
    return langPair 
      ? `${langPair.source_language_code}-${langPair.target_language_code}` 
      : 'Unknown';
  };

  const handleVersionClick = (versionId: number) => {
    navigate(`/model-versions/${versionId}`);
  };

  if (isLoading) {
    return <LoadingIndicator message="Loading dashboard data..." />;
  }

  if (error) {
    return (
      <ErrorDisplay 
        message={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  return (
    <Box>
      <PageHeader title="Dashboard" />
      
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LanguageIcon color="primary" sx={{ mr: 1 }} />
              <Typography component="h2" variant="h6" color="primary">
                Language Pairs
              </Typography>
            </Box>
            <Typography component="p" variant="h4">
              {langPairs.length}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              Total language pairs in system
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CodeIcon color="primary" sx={{ mr: 1 }} />
              <Typography component="h2" variant="h6" color="primary">
                Model Versions
              </Typography>
            </Box>
            <Typography component="p" variant="h4">
              {modelCountByLangPair.reduce((sum, item) => sum + item.count, 0)}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              Total model versions
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
              <Typography component="h2" variant="h6" color="primary">
                Recent Releases
              </Typography>
            </Box>
            <Typography component="p" variant="h4">
              {recentVersions.length}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              New releases in last 30 days
            </Typography>
          </Paper>
        </Grid>
        
        {/* Chart */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400,
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Models by Language Pair
            </Typography>
            <ResponsiveContainer>
              <BarChart
                data={modelCountByLangPair}
                margin={{
                  top: 16,
                  right: 16,
                  bottom: 0,
                  left: 24,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3f51b5" name="Number of Models" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Recent Releases */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 400,
              overflow: 'auto',
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Recent Releases
            </Typography>
            {recentVersions.length > 0 ? (
              <List>
                {recentVersions.map((version, index) => (
                  <React.Fragment key={version.version_id}>
                    <ListItem disablePadding>
                      <CardActionArea onClick={() => handleVersionClick(version.version_id)}>
                        <Card elevation={0} sx={{ width: '100%' }}>
                          <CardContent>
                            <Typography variant="h6" component="div">
                              {version.version_name}
                            </Typography>
                            <Typography color="text.secondary">
                              {getLanguagePairName(version.lang_pair_id)}
                            </Typography>
                            <Typography variant="body2">
                              {version.release_date
                                ? new Date(version.release_date).toLocaleDateString()
                                : 'No release date'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </CardActionArea>
                    </ListItem>
                    {index < recentVersions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body1" sx={{ mt: 2 }}>
                No recent releases found.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 