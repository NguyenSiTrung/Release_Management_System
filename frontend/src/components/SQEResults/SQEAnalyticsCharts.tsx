import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  LinearProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon,
  Compare as CompareIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { 
  getLanguagePairTrends, 
  getCrossComparison, 
  getScoreDistribution
} from '../../services/sqeService';
import { getLanguagePairs } from '../../services/api';
import { 
  SQELanguagePairTrend, 
  SQECrossComparison
} from '../../types/sqe';
import { LanguagePair } from '../../types';
import LoadingIndicator from '../common/LoadingIndicator';
import ErrorDisplay from '../common/ErrorDisplay';

interface SQEAnalyticsChartsProps {
  onRefresh?: () => void;
}

const SQEAnalyticsCharts: React.FC<SQEAnalyticsChartsProps> = ({ onRefresh }) => {
  // Removed unused analytics state
  const [distributionData, setDistributionData] = useState<{ ranges: Array<{ range: string; count: number; }>; total: number; } | null>(null);
  const [trends, setTrends] = useState<SQELanguagePairTrend[]>([]);
  const [comparison, setComparison] = useState<SQECrossComparison[]>([]);
  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedLanguagePair, setSelectedLanguagePair] = useState<number | ''>('');
  const [selectedDistributionLanguagePair, setSelectedDistributionLanguagePair] = useState<number | 'all'>('all');
  const [chartType, setChartType] = useState<'trends' | 'comparison' | 'distribution'>('trends');

  const fetchDistributionData = React.useCallback(async () => {
    try {
      const langPairId = selectedDistributionLanguagePair === 'all' ? undefined : selectedDistributionLanguagePair;
      const distribution = await getScoreDistribution(langPairId);
      setDistributionData(distribution);
    } catch (err: any) {
      console.error('Error fetching distribution data:', err);
      setError(err.message || 'Failed to fetch distribution data');
    }
  }, [selectedDistributionLanguagePair]);

  useEffect(() => {
    fetchData();
    fetchLanguagePairs();
    fetchDistributionData();
  }, [fetchDistributionData]);

  useEffect(() => {
    if (selectedLanguagePair && chartType === 'trends') {
      fetchTrends(selectedLanguagePair);
    }
  }, [selectedLanguagePair, chartType]);

  useEffect(() => {
    if (chartType === 'distribution') {
      fetchDistributionData();
    }
  }, [selectedDistributionLanguagePair, chartType, fetchDistributionData]);

  const fetchLanguagePairs = async () => {
    try {
      const pairs = await getLanguagePairs();
      setLanguagePairs(pairs);
      if (pairs.length > 0) {
        setSelectedLanguagePair(pairs[0].lang_pair_id);
      }
    } catch (err) {
      console.error('Error fetching language pairs:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const comparisonData = await getCrossComparison();
      
      setComparison(comparisonData.comparison);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async (languagePairId: number) => {
    try {
      const trendsData = await getLanguagePairTrends(languagePairId);
      setTrends(trendsData.trends);
    } catch (err: any) {
      console.error('Error fetching trends:', err);
    }
  };



  const handleChartTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: 'trends' | 'comparison' | 'distribution'
  ) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score > 2.5) return '#4caf50'; // Pass: Green
    if (score >= 2.0) return '#ff9800'; // Warning: Orange  
    return '#f44336'; // Fail: Red
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon sx={{ color: '#4caf50', fontSize: 16 }} />;
      case 'down':
        return <TrendingDownIcon sx={{ color: '#f44336', fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const COLORS = ['#1976d2', '#42a5f5', '#90caf9', '#bbdefb', '#e3f2fd', '#4caf50', '#ff9800', '#f44336'];

  if (loading) {
    return <LoadingIndicator message="Loading analytics..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchData} />;
  }

  return (
    <Box>
      {/* Chart Type Selector */}
      <Box sx={{ 
        mb: 3, 
        p: 2,
        borderRadius: '1rem',
        background: 'linear-gradient(195deg, rgba(73, 163, 241, 0.1), rgba(26, 115, 232, 0.1))',
        display: 'flex', 
        gap: 2, 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <Typography variant="body1" sx={{ 
          color: '#344767', 
          fontWeight: 600,
          mr: 1
        }}>
          Chart Type:
        </Typography>
        
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={handleChartTypeChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              border: '1px solid #d2d6da',
              borderRadius: '0.5rem',
              color: '#7b809a',
              backgroundColor: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              px: 2,
              py: 1,
              '&:hover': {
                backgroundColor: '#f8f9fa',
                color: '#1976d2'
              },
              '&.Mui-selected': {
                backgroundColor: '#1976d2',
                color: '#ffffff',
                border: '1px solid #1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0',
                  color: '#ffffff'
                }
              },
              '&:not(:first-of-type)': {
                marginLeft: '8px'
              }
            }
          }}
        >
          <ToggleButton value="trends" sx={{ gap: 1 }}>
            <TimelineIcon sx={{ fontSize: '1rem' }} />
            Trends
          </ToggleButton>
          <ToggleButton value="comparison" sx={{ gap: 1 }}>
            <CompareIcon sx={{ fontSize: '1rem' }} />
            Comparison
          </ToggleButton>
          <ToggleButton value="distribution" sx={{ gap: 1 }}>
            <BarChartIcon sx={{ fontSize: '1rem' }} />
            Distribution
          </ToggleButton>
        </ToggleButtonGroup>

        {chartType === 'trends' && (
          <FormControl size="small" sx={{ 
            minWidth: 220,
            '& .MuiOutlinedInput-root': {
              borderRadius: '0.5rem',
              backgroundColor: '#ffffff',
              '& fieldset': {
                borderColor: '#d2d6da'
              },
              '&:hover fieldset': {
                borderColor: '#1976d2'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1976d2'
              }
            },
            '& .MuiInputLabel-root': {
              color: '#7b809a',
              fontSize: '0.875rem'
            },
            '& .MuiSelect-select': {
              color: '#344767',
              fontSize: '0.875rem'
            }
          }}>
            <InputLabel>Language Pair</InputLabel>
            <Select
              value={selectedLanguagePair}
              label="Language Pair"
              onChange={(e) => setSelectedLanguagePair(e.target.value as number)}
              MenuProps={{
                PaperProps: {
                  sx: {
                    borderRadius: '0.5rem',
                    '& .MuiMenuItem-root': {
                      fontSize: '0.875rem',
                      color: '#344767',
                      '&:hover': {
                        backgroundColor: '#f8f9fa'
                      },
                      '&.Mui-selected': {
                        backgroundColor: '#1976d2',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#1565c0'
                        }
                      }
                    }
                  }
                }
              }}
            >
              {languagePairs.map((pair) => (
                <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                  {pair.source_language_code} → {pair.target_language_code}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {chartType === 'distribution' && (
          <FormControl size="small" sx={{ 
            minWidth: 220,
            '& .MuiOutlinedInput-root': {
              borderRadius: '0.5rem',
              backgroundColor: '#ffffff',
              '& fieldset': {
                borderColor: '#d2d6da'
              },
              '&:hover fieldset': {
                borderColor: '#1976d2'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1976d2'
              }
            },
            '& .MuiInputLabel-root': {
              color: '#7b809a',
              fontSize: '0.875rem'
            },
            '& .MuiSelect-select': {
              color: '#344767',
              fontSize: '0.875rem'
            }
          }}>
            <InputLabel>Language Pair Filter</InputLabel>
            <Select
              value={selectedDistributionLanguagePair}
              label="Language Pair Filter"
              onChange={(e) => setSelectedDistributionLanguagePair(e.target.value as number | 'all')}
              MenuProps={{
                PaperProps: {
                  sx: {
                    borderRadius: '0.5rem',
                    '& .MuiMenuItem-root': {
                      fontSize: '0.875rem',
                      color: '#344767',
                      '&:hover': {
                        backgroundColor: '#f8f9fa'
                      },
                      '&.Mui-selected': {
                        backgroundColor: '#1976d2',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#1565c0'
                        }
                      }
                    }
                  }
                }
              }}
            >
              <MenuItem value="all">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#4caf50'
                    }}
                  />
                  All Language Pairs
                </Box>
              </MenuItem>
              {languagePairs.map((pair) => (
                <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#1976d2'
                      }}
                    />
                    {pair.source_language_code} → {pair.target_language_code}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Trends Chart */}
        {chartType === 'trends' && (
          <Grid item xs={12}>
            <Card sx={{ boxShadow: '0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <TimelineIcon sx={{ color: '#1976d2' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#344767' }}>
                    Score Trends Over Time
                  </Typography>
                  <Chip 
                    label={`${trends.length} releases`} 
                    size="small" 
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </Box>

                {trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="version_name" 
                        tick={{ fontSize: 12, fill: '#7b809a' }}
                        tickLine={{ stroke: '#d2d6da' }}
                        axisLine={{ stroke: '#d2d6da' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        domain={[1, 3]}
                        tick={{ fontSize: 12, fill: '#7b809a' }}
                        tickLine={{ stroke: '#d2d6da' }}
                        axisLine={{ stroke: '#d2d6da' }}
                        label={{ 
                          value: 'Average Score (1.0-3.0)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle', fill: '#7b809a', fontSize: '12px' }
                        }}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: any) => [
                          `${Number(value).toFixed(3)}`,
                          'Average Score'
                        ]}
                        labelFormatter={(label) => `Version: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="average_score" 
                        stroke="#1976d2" 
                        strokeWidth={3}
                        dot={{ fill: '#1976d2', strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, stroke: '#1976d2', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <TimelineIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#7b809a', mb: 1 }}>
                      No Trend Data Available
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
                      Add SQE results for this language pair to see trends.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Cross-Language Comparison */}
        {chartType === 'comparison' && (
          <Grid item xs={12}>
            <Card sx={{ boxShadow: '0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <CompareIcon sx={{ color: '#1976d2' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#344767' }}>
                    Language Pair Comparison
                  </Typography>
                  <Chip 
                    label={`${comparison.length} pairs`} 
                    size="small" 
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </Box>

                {comparison.length > 0 ? (
                  <Grid container spacing={2}>
                    {comparison.map((item) => (
                      <Grid item xs={12} md={6} key={item.language_pair_id}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#344767' }}>
                                {item.language_pair_name}
                              </Typography>
                              {getTrendIcon(item.score_trend)}
                            </Box>

                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" sx={{ color: '#7b809a' }}>
                                  Latest Score
                                </Typography>
                                <Chip
                                  label={item.latest_score?.toFixed(3) || 'N/A'}
                                  size="small"
                                  sx={{
                                    backgroundColor: item.latest_score ? getScoreColor(item.latest_score) : '#9e9e9e',
                                    color: 'white',
                                    fontWeight: 600
                                  }}
                                />
                              </Box>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" sx={{ color: '#7b809a' }}>
                                  Test Cases
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#344767', fontWeight: 500 }}>
                                  {item.latest_test_cases || 'N/A'}
                                </Typography>
                              </Box>

                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Tooltip 
                                  title="Based on latest SQE result by test date. Each language pair contributes max 1 critical issue."
                                  placement="top"
                                >
                                  <Typography variant="body2" sx={{ color: '#7b809a', cursor: 'help' }}>
                                    Critical Issues
                                  </Typography>
                                </Tooltip>
                                <Chip
                                  label={item.has_critical_issues ? 'Yes' : 'No'}
                                  size="small"
                                  color={item.has_critical_issues ? 'error' : 'success'}
                                  variant="outlined"
                                />
                              </Box>
                            </Box>

                            {item.latest_score && (
                              <Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={((item.latest_score - 1) / 2) * 100}
                                  sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: '#f5f5f5',
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: getScoreColor(item.latest_score),
                                      borderRadius: 4
                                    }
                                  }}
                                />
                                <Typography variant="caption" sx={{ color: '#7b809a', mt: 0.5, display: 'block' }}>
                                  {(((item.latest_score - 1) / 2) * 100).toFixed(0)}% of maximum score (Scale: 1.0-3.0)
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CompareIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#7b809a', mb: 1 }}>
                      No Comparison Data Available
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
                      Add SQE results for multiple language pairs to see comparisons.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Score Distribution */}
        {chartType === 'distribution' && distributionData && (
          <Grid item xs={12}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card sx={{ boxShadow: '0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                      <BarChartIcon sx={{ color: '#1976d2' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#344767' }}>
                        Score Distribution
                        {selectedDistributionLanguagePair !== 'all' && (
                          <Typography component="span" sx={{ fontSize: '0.875rem', color: '#7b809a', ml: 1 }}>
                            - {languagePairs.find(p => p.lang_pair_id === selectedDistributionLanguagePair)?.source_language_code} → {languagePairs.find(p => p.lang_pair_id === selectedDistributionLanguagePair)?.target_language_code}
                          </Typography>
                        )}
                      </Typography>
                      <Chip 
                        label="Scale: 1.0-3.0" 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          ml: 1,
                          borderColor: '#7b809a',
                          color: '#7b809a',
                          fontSize: '0.75rem'
                        }}
                      />
                      <Chip 
                        label={`${distributionData.total} results`} 
                        size="small" 
                        variant="filled"
                        sx={{ 
                          backgroundColor: selectedDistributionLanguagePair === 'all' ? '#4caf50' : '#1976d2',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      />
                    </Box>

                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={distributionData.ranges} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="range" 
                          tick={{ fontSize: 12, fill: '#7b809a' }}
                          tickLine={{ stroke: '#d2d6da' }}
                          axisLine={{ stroke: '#d2d6da' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#7b809a' }}
                          tickLine={{ stroke: '#d2d6da' }}
                          axisLine={{ stroke: '#d2d6da' }}
                          allowDecimals={false}
                        />
                        <RechartsTooltip 
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value: any) => [
                            `${value} results`,
                            'Count'
                          ]}
                          labelFormatter={(label) => `Score Range: ${label}`}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#1976d2"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ boxShadow: '0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#344767' }}>
                        Distribution Summary
                      </Typography>
                      <Chip 
                        label={`${distributionData.total} total`} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          borderColor: '#1976d2',
                          color: '#1976d2',
                          fontWeight: 600
                        }}
                      />
                    </Box>

                    {distributionData.total > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={distributionData.ranges}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {distributionData.ranges.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                              }}
                              formatter={(value: any) => [
                                `${value} results (${((value / distributionData.total) * 100).toFixed(1)}%)`,
                                'Count'
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>

                        <Box sx={{ mt: 2 }}>
                          {distributionData.ranges.map((range, index) => (
                            <Box key={range.range} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  backgroundColor: COLORS[index % COLORS.length]
                                }}
                              />
                              <Typography variant="body2" sx={{ color: '#7b809a', flex: 1 }}>
                                {range.range}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#344767', fontWeight: 500 }}>
                                {range.count} ({((range.count / distributionData.total) * 100).toFixed(1)}%)
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <BarChartIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
                        <Typography variant="h6" sx={{ color: '#7b809a', mb: 1 }}>
                          No Distribution Data
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
                          {selectedDistributionLanguagePair === 'all' 
                            ? 'No SQE results available to display distribution.'
                            : 'No SQE results for this language pair.'
                          }
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default SQEAnalyticsCharts; 