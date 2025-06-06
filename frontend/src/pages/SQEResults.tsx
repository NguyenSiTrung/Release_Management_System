import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Tab,
  Box,
  Grid,
  Card,
  Alert,
  Typography,
  Stack,
  CardContent,
  Button,
  Tooltip
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,

  ReportProblem as ReportProblemIcon
} from '@mui/icons-material';

import StatCard from '../components/common/StatCard';
import SQEResultsTable from '../components/SQEResults/SQEResultsTable';
import SQEAnalyticsCharts from '../components/SQEResults/SQEAnalyticsCharts';
import SQEResultForm from '../components/SQEResults/SQEResultForm';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';

import { getOverallAnalytics } from '../services/sqeService';
import { SQEAnalytics } from '../types/sqe';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sqe-tabpanel-${index}`}
      aria-labelledby={`sqe-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `sqe-tab-${index}`,
    'aria-controls': `sqe-tabpanel-${index}`,
  };
};

const SQEResults: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [analytics, setAnalytics] = useState<SQEAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingSQEResult, setEditingSQEResult] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [refreshTrigger]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOverallAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error fetching SQE analytics:', err);
      setError('Failed to load SQE analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
  };

  const handleOpenEditDialog = (result: any) => {
    setEditingSQEResult(result);
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditingSQEResult(null);
  };

  const handleDialogSuccess = () => {
    // Refresh both analytics and table data
    handleDataChange();
    fetchAnalytics();
    
    // Close dialogs
    handleCloseAddDialog();
    handleCloseEditDialog();
  };

  const getScoreTrend = (score: number): 'positive' | 'negative' | 'neutral' => {
    if (score >= 2.5) return 'positive';  // Pass
    if (score < 2.0) return 'negative';   // Fail
    return 'neutral';                     // Warning
  };

  const getCriticalColor = (count: number): string => {
    return count > 0 ? '#f44336' : '#4caf50';
  };

  const getCriticalMessage = (count: number): string => {
    if (count === 0) return 'All systems clear';
    if (count === 1) return 'Requires attention';
    if (count <= 3) return 'Multiple issues found';
    return 'Critical review needed';
  };

  const getCriticalChangeType = (count: number): 'positive' | 'negative' | 'neutral' => {
    return count === 0 ? 'positive' : 'negative';
  };

  if (loading && !analytics) {
    return <LoadingIndicator message="Loading SQE Results..." />;
  }

  if (error && !analytics) {
    return (
      <Box sx={{ p: 0 }}>
        <ErrorDisplay message={error} onRetry={fetchAnalytics} />
      </Box>
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
              SQE Testing Results
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#67748e',
                fontSize: '0.875rem'
              }}
            >
              Comprehensive quality evaluation and analysis for your NMT models
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            sx={{
              background: 'linear-gradient(90deg, rgba(94,114,228,1) 0%, rgba(130,94,228,1) 100%)',
              boxShadow: '0 3px 5px -1px rgba(94,114,228,.2), 0 6px 10px 0 rgba(94,114,228,.14), 0 1px 18px 0 rgba(94,114,228,.12)',
              borderRadius: '0.5rem',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1,
              '&:hover': {
                background: 'linear-gradient(90deg, rgba(84,104,218,1) 0%, rgba(120,84,218,1) 100%)',
              }
            }}
          >
            Add SQE Result
          </Button>
        </Stack>
      </Box>

      {/* Statistics Cards */}
      {analytics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Average Score"
              value={analytics.overall_stats.average_score.toFixed(1)}
              subtitle="Overall Performance"
              change={analytics.overall_stats.average_score >= 8.0 ? "+Good" : "Needs Improvement"}
              changeType={getScoreTrend(analytics.overall_stats.average_score)}
              icon={AssessmentIcon}
              iconColor="#2196f3"
              gradientColors={['#2196f3', '#42a5f5']}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Results"
              value={analytics.overall_stats.total_results}
              subtitle="Model Versions Tested"
              icon={TrendingUpIcon}
              iconColor="#4caf50"
              gradientColors={['#4caf50', '#66bb6a']}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Tooltip 
              title="Counts language pairs with critical issues in their latest SQE result (by test date). Each language pair contributes maximum 1 critical issue."
              placement="top"
            >
              <Box>
                                          <StatCard
                            title="Critical Issues"
                            value={analytics.overall_stats.critical_cases}
                            subtitle="Quality status overview"
                            change={getCriticalMessage(analytics.overall_stats.critical_cases)}
                            changeType={getCriticalChangeType(analytics.overall_stats.critical_cases)}
                            icon={ReportProblemIcon}
                            iconColor={getCriticalColor(analytics.overall_stats.critical_cases)}
                            gradientColors={analytics.overall_stats.critical_cases > 0 
                              ? ['#f44336', '#ef5350'] 
                              : ['#4caf50', '#66bb6a']
                            }
                            noIconShadow={true}
                          />
              </Box>
            </Tooltip>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Avg Test Cases"
              value={analytics.overall_stats.average_test_cases.toFixed(0)}
              subtitle="Per Model Version"
              icon={AddIcon}
              iconColor="#ff9800"
              gradientColors={['#ff9800', '#ffb74d']}
            />
          </Grid>
        </Grid>
      )}

      {/* Alert for Critical Issues */}
      {analytics && analytics.overall_stats.critical_cases > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Quality Alert:</strong> {analytics.overall_stats.critical_cases} language pair{analytics.overall_stats.critical_cases > 1 ? 's' : ''} 
          {analytics.overall_stats.critical_cases === 1 ? ' has' : ' have'} critical issues in their latest test results. 
          Please review the failing test cases and address the identified problems.
        </Alert>
      )}

      {/* Tab Navigation */}
      <Card 
        sx={{
          borderRadius: '1rem',
          boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
          border: '0px',
          background: '#fff',
          mb: 3
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 64,
                '&.Mui-selected': {
                  color: 'rgba(94,114,228,0.8)',
                }
              },
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(90deg, rgba(94,114,228,1) 0%, rgba(130,94,228,1) 100%)',
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab 
              icon={<AssessmentIcon />} 
              iconPosition="start"
              label="Results Overview" 
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<TrendingUpIcon />} 
              iconPosition="start"
              label="Analytics & Charts" 
              {...a11yProps(1)} 
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          <CardContent sx={{ p: 0 }}>
            <SQEResultsTable 
              onDataChange={handleDataChange}
              onEditClick={handleOpenEditDialog}
              refreshTrigger={refreshTrigger}
            />
          </CardContent>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <CardContent sx={{ p: 3 }}>
            <SQEAnalyticsCharts onRefresh={handleDataChange} />
          </CardContent>
        </TabPanel>
      </Card>

      {/* Add SQE Result Dialog */}
      <SQEResultForm 
        open={openAddDialog}
        onClose={handleCloseAddDialog}
        onSuccess={handleDialogSuccess}
        mode="create"
      />

      {/* Edit SQE Result Dialog */}
      <SQEResultForm 
        open={openEditDialog}
        onClose={handleCloseEditDialog}
        onSuccess={handleDialogSuccess}
        mode="edit"
        editData={editingSQEResult}
      />
    </Box>
  );
};

export default SQEResults; 