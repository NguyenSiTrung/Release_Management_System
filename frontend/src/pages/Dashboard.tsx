import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Stack,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Language as LanguageIcon,
  Code as CodeIcon,
  TrendingUp as TrendingUpIcon,
  Storage as StorageIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Translate as TranslateIcon,
  Flag as FlagIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  getLanguagePairs, 
  getModelVersions,
  getStorageOverview,
  getSystemStatus,
  getActiveEvaluations
} from '../services/api';
import { 
  LanguagePair, 
  ModelVersion, 
  StorageOverview,
  SystemStatus,
  ActiveEvaluations
} from '../types';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';
import StatCard from '../components/common/StatCard';
import DashboardChart from '../components/common/DashboardChart';
import ActivityTable, { ActivityItem } from '../components/common/ActivityTable';

interface DashboardStats {
  totalLanguagePairs: number;
  totalModelVersions: number;
  recentReleases: number;
  evaluationsRunning: number;
  languagePairsGrowth: string;
  recentReleasesGrowth: string;
  modelsGrowthPercent: string;
}

const Dashboard: React.FC = () => {
  const [langPairs, setLangPairs] = useState<LanguagePair[]>([]);
  const [recentVersions, setRecentVersions] = useState<ModelVersion[]>([]);
  const [modelCountByLangPair, setModelCountByLangPair] = useState<{ name: string; count: number }[]>([]);
  const [storageData, setStorageData] = useState<StorageOverview | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [activeEvaluations, setActiveEvaluations] = useState<ActiveEvaluations | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalLanguagePairs: 0,
    totalModelVersions: 0,
    recentReleases: 0,
    evaluationsRunning: 0,
    languagePairsGrowth: 'N/A',
    recentReleasesGrowth: 'N/A',
    modelsGrowthPercent: 'N/A'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Helper function to calculate percentage change
  const calculatePercentageChange = useCallback((current: number, previous: number): string => {
    if (previous === 0) {
      if (current === 0) return '0%';
      return 'New!';
    }
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }, []);

  // Helper function to calculate growth metrics
  const calculateGrowthMetrics = useCallback((
    recentVersionsArray: ModelVersion[], 
    totalVersions: number,
    langPairsCount: number
  ) => {
    const now = new Date();
    
    // Calculate different time periods
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    // Recent releases (last 30 days)
    const recentReleases = recentVersionsArray.filter(version => 
      version.release_date && new Date(version.release_date) > thirtyDaysAgo
    ).length;
    
    // Previous period releases (30-60 days ago)
    const previousReleases = recentVersionsArray.filter(version => 
      version.release_date && 
      new Date(version.release_date) > sixtyDaysAgo && 
      new Date(version.release_date) <= thirtyDaysAgo
    ).length;
    
    // Models from this year vs last year
    const thisYearModels = recentVersionsArray.filter(version => 
      version.created_at && new Date(version.created_at) > oneYearAgo
    ).length;
    
    const totalOlderModels = totalVersions - thisYearModels;
    
    // Calculate growth percentages
    const recentReleasesGrowth = calculatePercentageChange(recentReleases, previousReleases);
    
    // Language pairs growth (calculate based on coverage and activity)
    const avgModelsPerPair = totalVersions / (langPairsCount || 1);
    
    // Debug logging
    console.log('Growth Metrics Debug:', {
      recentReleases,
      previousReleases,
      thisYearModels,
      totalOlderModels,
      avgModelsPerPair,
      langPairsCount,
      recentReleasesGrowth,
      modelsGrowthPercent: totalOlderModels > 0 
        ? calculatePercentageChange(thisYearModels, totalOlderModels)
        : thisYearModels > 0 ? 'New!' : '0%'
    });
    let languagePairsGrowth: string;
    
    if (langPairsCount === 0) {
      languagePairsGrowth = 'No data';
    } else if (avgModelsPerPair >= 3) {
      languagePairsGrowth = 'Well covered';
    } else if (avgModelsPerPair >= 1) {
      languagePairsGrowth = 'Active';
    } else {
      languagePairsGrowth = 'Need models';
    }
    
    // Models year-over-year growth
    const modelsGrowthPercent = totalOlderModels > 0 
      ? calculatePercentageChange(thisYearModels, totalOlderModels)
      : thisYearModels > 0 ? 'New!' : '0%';
    
    return {
      recentReleases,
      recentReleasesGrowth,
      languagePairsGrowth,
      modelsGrowthPercent
    };
  }, [calculatePercentageChange]);

  const fetchDashboardData = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch all data in parallel
        const [
          langPairsData,
          storageOverview,
          systemStatusData,
          activeEvaluationsData
        ] = await Promise.all([
          getLanguagePairs(),
          getStorageOverview(),
          getSystemStatus(),
          getActiveEvaluations()
        ]);
        
        setLangPairs(langPairsData);
        setStorageData(storageOverview);
        setSystemStatus(systemStatusData);
        setActiveEvaluations(activeEvaluationsData);
        
        // Create data for chart and calculate stats
        const langPairCounts: { name: string; count: number }[] = [];
        const recentVersionsArray: ModelVersion[] = [];
        let totalVersions = 0;
        
        // For each language pair, fetch model versions
        for (const langPair of langPairsData) {
          const versionResponse = await getModelVersions(langPair.lang_pair_id, 1, 1000);
          const versions = versionResponse.items;
          
          // Count models per language pair
          langPairCounts.push({
            name: `${langPair.source_language_code}-${langPair.target_language_code}`,
            count: versions.length
          });
          
          totalVersions += versions.length;
          
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
        
        // Calculate growth metrics using helper function
        const growthMetrics = calculateGrowthMetrics(
          recentVersionsArray, 
          totalVersions, 
          langPairsData.length
        );
        
        // Update stats with calculated values
        setStats({
          totalLanguagePairs: langPairsData.length,
          totalModelVersions: totalVersions,
          recentReleases: growthMetrics.recentReleases,
          evaluationsRunning: activeEvaluationsData.active_count,
          languagePairsGrowth: growthMetrics.languagePairsGrowth,
          recentReleasesGrowth: growthMetrics.recentReleasesGrowth,
          modelsGrowthPercent: growthMetrics.modelsGrowthPercent
        });
        
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else if (err.response?.data && typeof err.response.data === 'object') {
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
  }, [calculateGrowthMetrics]);
    
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getLanguagePairName = (langPairId: number) => {
    const langPair = langPairs.find(lp => lp.lang_pair_id === langPairId);
    return langPair 
      ? `${langPair.source_language_code}-${langPair.target_language_code}` 
      : 'Unknown';
  };

  const handleVersionClick = (versionId: number) => {
    navigate(`/model-versions/${versionId}`);
  };

  // Transform recent versions to activity format
  const activityData: ActivityItem[] = recentVersions.map(version => ({
    id: version.version_id,
    title: version.version_name,
    subtitle: getLanguagePairName(version.lang_pair_id),
    status: version.release_date ? 'completed' : 'pending' as const,
    type: 'model' as const,
    date: version.release_date || version.created_at,
    metadata: { langPairId: version.lang_pair_id }
  }));

  if (isLoading) {
    return <LoadingIndicator message="Loading dashboard data..." />;
  }

  if (error) {
    return (
      <ErrorDisplay 
        message={error} 
        onRetry={fetchDashboardData} 
      />
    );
  }

  return (
    <Box sx={{ p: 0 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                color: '#344767',
                fontWeight: 600,
                mb: 0.5
              }}
            >
              Dashboard
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#67748e',
                fontSize: '0.875rem'
              }}
            >
              Neural Machine Translation Release Management
            </Typography>
          </Box>
          
          <Tooltip title="Refresh dashboard">
            <IconButton
              onClick={fetchDashboardData}
              sx={{
                color: '#344767',
                backgroundColor: 'rgba(94,114,228,0.1)',
                border: '1px solid rgba(94,114,228,0.2)',
                borderRadius: '0.5rem',
                '&:hover': {
                  backgroundColor: 'rgba(94,114,228,0.2)',
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
          {/* Statistics Cards */}
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Language Pairs"
              value={stats.totalLanguagePairs}
              subtitle="Total supported pairs"
              change={stats.languagePairsGrowth}
              changeType={
                stats.languagePairsGrowth === 'Well covered' || stats.languagePairsGrowth === 'Active' ? 'positive' :
                stats.languagePairsGrowth === 'Need models' ? 'negative' : 'neutral'
              }
              icon={LanguageIcon}
              gradientColors={['#667eea', '#764ba2']}
              onClick={() => navigate('/language-pairs')}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Model Versions"
              value={stats.totalModelVersions}
              subtitle="Total model versions"
              change={`+${stats.recentReleases} this month`}
              changeType="positive"
              icon={CodeIcon}
              gradientColors={['#f093fb', '#f5576c']}
              onClick={() => navigate('/model-versions')}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Recent Releases"
              value={stats.recentReleases}
              subtitle="Last 30 days"
              change={stats.recentReleasesGrowth}
              changeType={
                stats.recentReleasesGrowth.includes('+') ? 'positive' :
                stats.recentReleasesGrowth.includes('-') ? 'negative' : 'neutral'
              }
              icon={TrendingUpIcon}
              gradientColors={['#4facfe', '#00f2fe']}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Active Evaluations"
              value={stats.evaluationsRunning}
              subtitle="Currently running"
              change={activeEvaluations ? `${activeEvaluations.completed_today} completed today` : "No data"}
              changeType="neutral"
              icon={AssessmentIcon}
              gradientColors={['#43e97b', '#38f9d7']}
              onClick={() => navigate('/evaluation-translation')}
            />
          </Grid>
          
          {/* Charts Section */}
          <Grid item xs={12} lg={8}>
            <DashboardChart
              title="Models by Language Pair"
              subtitle="Distribution of model versions across language pairs"
              data={modelCountByLangPair}
              type="bar"
              dataKey="count"
              xAxisKey="name"
              gradientColors={['#667eea', '#764ba2']}
              height={400}
              showPercentage={true}
              percentageChange={stats.modelsGrowthPercent + ' this year'}
              percentageType={
                stats.modelsGrowthPercent.includes('+') ? 'positive' :
                stats.modelsGrowthPercent.includes('-') ? 'negative' : 'neutral'
              }
              onRefresh={fetchDashboardData}
              allowTypeChange={true}
              allowExport={true}
            />
          </Grid>
          
          {/* Recent Activity Table */}
          <Grid item xs={12} lg={4}>
            <ActivityTable
              title="Recent Model Releases"
              subtitle="Latest model versions and updates"
              data={activityData}
              maxItems={6}
              onItemClick={(item) => handleVersionClick(item.id as number)}
              onRefresh={fetchDashboardData}
              allowExport={true}
              allowFilter={false}
            />
          </Grid>
          
          {/* Additional Info Cards */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                background: '#ffffff',
                border: '1px solid rgba(102, 126, 234, 0.2)',
                height: 350
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Avatar
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      border: '2px solid rgba(102, 126, 234, 0.2)'
                    }}
                  >
                    <StorageIcon sx={{ color: '#667eea' }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                    Storage Overview
                  </Typography>
                </Stack>
                
                <List>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, backgroundColor: '#e3f2fd' }}>
                        <TranslateIcon sx={{ fontSize: 16, color: '#1976d2' }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Model Files"
                      secondary={storageData?.model_files?.display || "Loading..."}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem', color: '#2c3e50' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem', color: '#637381' }}
                    />
                  </ListItem>
                  <Divider variant="inset" />
                  
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, backgroundColor: '#f3e5f5' }}>
                        <FlagIcon sx={{ fontSize: 16, color: '#9c27b0' }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Test Sets"
                      secondary={storageData?.testsets?.display || "Loading..."}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem', color: '#2c3e50' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem', color: '#637381' }}
                    />
                  </ListItem>
                  <Divider variant="inset" />
                  
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, backgroundColor: '#fff3e0' }}>
                        <ScheduleIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Evaluation Logs"
                      secondary={storageData?.evaluation_logs?.display || "Loading..."}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem', color: '#2c3e50' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem', color: '#637381' }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                background: '#ffffff',
                border: '1px solid rgba(76, 175, 80, 0.2)',
                height: 350
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Avatar
                    sx={{
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      border: '2px solid rgba(76, 175, 80, 0.2)'
                    }}
                  >
                    <CheckCircleIcon sx={{ color: '#4caf50' }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                    System Status
                  </Typography>
                </Stack>
                
                <List>
                  <ListItem>
                    <ListItemAvatar>
                      <CheckCircleIcon sx={{ 
                        color: systemStatus?.api_server?.status === 'online' ? '#4caf50' : '#f44336', 
                        fontSize: 20 
                      }} />
                    </ListItemAvatar>
                    <ListItemText
                      primary="API Server"
                      secondary={systemStatus?.api_server?.message || "Loading..."}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem', color: '#2c3e50' }}
                      secondaryTypographyProps={{ 
                        fontSize: '0.75rem', 
                        color: systemStatus?.api_server?.status === 'online' ? '#4caf50' : '#f44336'
                      }}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemAvatar>
                      <CheckCircleIcon sx={{ 
                        color: systemStatus?.database?.status === 'connected' ? '#4caf50' : '#f44336', 
                        fontSize: 20 
                      }} />
                    </ListItemAvatar>
                    <ListItemText
                      primary="Database"
                      secondary={systemStatus?.database?.message || "Loading..."}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem', color: '#2c3e50' }}
                      secondaryTypographyProps={{ 
                        fontSize: '0.75rem', 
                        color: systemStatus?.database?.status === 'connected' ? '#4caf50' : '#f44336'
                      }}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemAvatar>
                      <ScheduleIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                    </ListItemAvatar>
                    <ListItemText
                      primary="Background Jobs"
                      secondary={systemStatus?.background_jobs?.message || "Loading..."}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem', color: '#2c3e50' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem', color: '#ff9800' }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
    </Box>
  );
};

export default Dashboard; 