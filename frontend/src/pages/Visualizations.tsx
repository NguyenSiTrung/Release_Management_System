import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  SelectChangeEvent,
  Stack,
  Alert,
  Avatar,
  Chip,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  ShowChart as ShowChartIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import {
  getLanguagePairs,
  getTestsets,
  getModelVersions,
  getTestsetComparison,
  getProgressData,
} from '../services/api';
import { LanguagePair, ModelVersion, Testset } from '../types';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';

// Custom color palette for charts (currently unused but kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];

const Visualizations: React.FC = () => {
  // State for language pairs, model versions, and testsets
  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [selectedLangPair, setSelectedLangPair] = useState<number | ''>('');
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | 'all'>('all');
  const [testsets, setTestsets] = useState<Testset[]>([]);
  const [selectedTestset, setSelectedTestset] = useState<number | 'all'>('all');
  
  // State for chart data
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'bleu' | 'comet'>('bleu');
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const langPairsData = await getLanguagePairs();
        setLanguagePairs(langPairsData);
        const testsetsResponse = await getTestsets(undefined, 1, 1000);
        setTestsets(testsetsResponse.items);
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load initial data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  // Fetch model versions when a language pair is selected
  useEffect(() => {
    const fetchVersions = async () => {
      if (selectedLangPair === '') return;
      
      try {
        setIsLoadingCharts(true);
        const versionResponse = await getModelVersions(selectedLangPair as number, 1, 1000);
        setModelVersions(versionResponse.items);
        
        setSelectedVersion('all');
        
        await fetchProgressData(selectedLangPair as number, selectedMetric, selectedTestset !== 'all' ? selectedTestset as number : undefined);
      } catch (err) {
        console.error('Error fetching model versions:', err);
        setError('Failed to load model versions. Please try again.');
      } finally {
        setIsLoadingCharts(false);
      }
    };
    
    if (selectedLangPair !== '') {
      fetchVersions();
    }
  }, [selectedLangPair, selectedMetric, selectedTestset]);

  // Fetch comparison data when a version is selected OR when we want to show average across all versions
  useEffect(() => {
    const fetchComparisonData = async () => {
      if (selectedLangPair === '') return; // Need at least a language pair
      
      try {
        setIsLoadingCharts(true);
        
        if (selectedVersion === 'all') {
          // Show average across all versions for this language pair
          console.log('📊 Fetching average comparison across all versions for language pair:', selectedLangPair);
          
          // Get all versions for this language pair
          const versionsToProcess = modelVersions.length > 0 ? modelVersions : [];
          
          if (versionsToProcess.length === 0) {
            setComparisonData([]);
            return;
          }
          
          // Fetch data for all versions and aggregate
          const allVersionsData = await Promise.all(
            versionsToProcess.map(async (version) => {
              try {
                const data = await getTestsetComparison(version.version_id, selectedMetric);
                return data.testsets || [];
              } catch (err) {
                console.log(`No data for version ${version.version_name}`);
                return [];
              }
            })
          );
          
          // Aggregate data by testset_name
          const aggregatedData: { [key: string]: { base_scores: number[], finetuned_scores: number[] } } = {};
          
          allVersionsData.flat().forEach((testset: any) => {
            if (!aggregatedData[testset.testset_name]) {
              aggregatedData[testset.testset_name] = { base_scores: [], finetuned_scores: [] };
            }
            if (testset.base_score !== null && testset.base_score !== undefined) {
              aggregatedData[testset.testset_name].base_scores.push(testset.base_score);
            }
            if (testset.finetuned_score !== null && testset.finetuned_score !== undefined) {
              aggregatedData[testset.testset_name].finetuned_scores.push(testset.finetuned_score);
            }
          });
          
          // Calculate averages
          const transformedData = Object.keys(aggregatedData).map(testsetName => {
            const data = aggregatedData[testsetName];
            const avgBase = data.base_scores.length > 0 
              ? data.base_scores.reduce((a, b) => a + b, 0) / data.base_scores.length 
              : 0;
            const avgFinetuned = data.finetuned_scores.length > 0 
              ? data.finetuned_scores.reduce((a, b) => a + b, 0) / data.finetuned_scores.length 
              : 0;
            
            return {
              testset_name: testsetName,
              base_model: avgBase,
              finetuned_model: avgFinetuned
            };
          });
          
          console.log('🔄 Transformed Average Comparison Data:', transformedData);
          setComparisonData(transformedData);
          
        } else {
          // Show data for specific version
          const data = await getTestsetComparison(
            selectedVersion as number,
            selectedMetric
          );
          console.log('🔍 Testset Comparison Data received:', data);
          
          // Transform data for recharts - include both base and finetuned scores
          const transformedData = data.testsets?.map((item: any) => ({
            testset_name: item.testset_name,
            base_model: item.base_score || 0,
            finetuned_model: item.finetuned_score || 0
          })) || [];
          console.log('🔄 Transformed Comparison Data:', transformedData);
          
          setComparisonData(transformedData);
        }
        
      } catch (err: any) {
        console.error('Error fetching comparison data:', err);
        if (err?.response?.status === 404) {
          console.log('No training results found');
          setComparisonData([]); // Set empty array instead of error
        } else {
          setError('Failed to load comparison data. Please try again.');
        }
      } finally {
        setIsLoadingCharts(false);
      }
    };
    
    if (selectedLangPair !== '') {
      fetchComparisonData();
    }
  }, [selectedVersion, selectedTestset, selectedMetric, selectedLangPair, modelVersions]);

  // Fetch progress data for a language pair
  const fetchProgressData = async (langPairId: number, metric: 'bleu' | 'comet', testsetId?: number) => {
    try {
      setIsLoadingCharts(true);
      const data = await getProgressData(langPairId, metric, testsetId);
      console.log('🔍 Progress Data received:', data);
      
      // Transform data for recharts - map score to selectedMetric field
      const transformedData = data.map(item => ({
        ...item,
        [metric]: item.score  // Add dynamic field based on selected metric
      }));
      console.log('🔄 Transformed Progress Data:', transformedData);
      
      setProgressData(transformedData);
    } catch (err: any) {
      console.error('Error fetching progress data:', err);
      if (err?.response?.status === 404) {
        console.log('No progress data found for this language pair');
        setProgressData([]); // Set empty array instead of error
      } else {
        setError('Failed to load progress data. Please try again.');
      }
    } finally {
      setIsLoadingCharts(false);
    }
  };

  // Handlers for selection changes
  const handleLangPairChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedLangPair(typeof value === 'number' ? value : value === '' ? '' : parseInt(value as string));
    setSelectedVersion('all');
    setComparisonData([]);
  };

  const handleVersionChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedVersion(value === 'all' ? 'all' : typeof value === 'number' ? value : parseInt(value as string));
  };

  const handleTestsetChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedTestset(value === 'all' ? 'all' : typeof value === 'number' ? value : parseInt(value as string));
  };

  const handleMetricChange = (event: React.MouseEvent<HTMLElement>, newMetric: 'bleu' | 'comet') => {
    if (newMetric !== null) {
      setSelectedMetric(newMetric);
    }
  };

  // Helper functions for display
  const getLanguagePairName = (langPairId: number) => {
    const langPair = languagePairs.find(lp => lp.lang_pair_id === langPairId);
    return langPair 
      ? `${langPair.source_language_code} → ${langPair.target_language_code}` 
      : 'Unknown';
  };

  const getTestsetName = (testsetId: number) => {
    const testset = testsets.find(t => t.testset_id === testsetId);
    return testset ? testset.testset_name : 'Unknown';
  };

  // Formatting functions for charts
  const formatScoreValue = (value: number) => {
    return selectedMetric === 'bleu' 
      ? value.toFixed(2)
      : value.toFixed(4);
  };

  const getYAxisDomain = (metric: 'bleu' | 'comet') => {
    return metric === 'bleu' ? [0, 100] : [0, 1];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            padding: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => {
            const displayName = entry.dataKey === 'base_model' ? 'Base Model' : 
                               entry.dataKey === 'finetuned_model' ? 'Finetuned Model' : 
                               entry.dataKey;
            return (
              <Typography
                key={index}
                variant="body2"
                sx={{ color: entry.color }}
              >
                {`${displayName}: ${formatScoreValue(entry.value)}`}
              </Typography>
            );
          })}
        </Box>
      );
    }
    return null;
  };

  // Debug logging for data changes
  useEffect(() => {
    if (progressData.length > 0) {
      console.log('📊 Progress Data updated:', progressData);
    }
  }, [progressData]);

  useEffect(() => {
    if (comparisonData.length > 0) {
      console.log('📊 Comparison Data updated:', comparisonData);
    }
  }, [comparisonData]);

  if (isLoading) {
    return <LoadingIndicator message="Loading visualization data..." />;
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
              Visualizations
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#67748e',
                fontSize: '0.875rem'
              }}
            >
              Interactive charts and analytics for model performance tracking
            </Typography>
          </Box>
        </Stack>
        
        {error && (
          <ErrorDisplay 
            message={error} 
            onRetry={() => window.location.reload()} 
          />
        )}
      </Box>

      {/* Main Content Card */}
      <Card
        sx={{
          borderRadius: '1rem',
          boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
          border: '0px',
          background: '#fff',
          mb: 3,
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Filters Section */}
          <Box sx={{ p: 3, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                mr: 2,
                width: 32,
                height: 32
              }}>
                <TrendingUpIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#344767' }}>
                Analysis Filters
              </Typography>
            </Box>
            
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl 
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.5rem',
                      backgroundColor: '#fff',
                      '& fieldset': {
                        borderColor: 'rgba(0,0,0,0.1)',
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(94,114,228,0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(94,114,228,0.8)',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#8392ab',
                      fontSize: '0.875rem',
                      '&.Mui-focused': {
                        color: 'rgba(94,114,228,0.8)',
                      },
                    },
                    '& .MuiSelect-select': {
                      color: '#344767',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    },
                  }}
                >
                  <InputLabel>Language Pair</InputLabel>
                  <Select
                    value={selectedLangPair}
                    label="Language Pair"
                    onChange={handleLangPairChange}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: '0.5rem',
                          boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
                          maxHeight: 240,
                          '& .MuiMenuItem-root': {
                            fontSize: '0.875rem',
                            color: '#344767',
                            py: 1.5,
                            '&:hover': {
                              backgroundColor: 'rgba(94,114,228,0.08)',
                            },
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(94,114,228,0.12)',
                              '&:hover': {
                                backgroundColor: 'rgba(94,114,228,0.16)',
                              },
                            },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value="" sx={{ fontStyle: 'italic', color: '#8392ab' }}>
                      All Language Pairs
                    </MenuItem>
                    {languagePairs.map((langPair) => (
                      <MenuItem key={langPair.lang_pair_id} value={langPair.lang_pair_id}>
                        {langPair.source_language_code} → {langPair.target_language_code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl 
                  fullWidth 
                  disabled={!selectedLangPair}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.5rem',
                      backgroundColor: '#fff',
                      '& fieldset': {
                        borderColor: 'rgba(0,0,0,0.1)',
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(94,114,228,0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(94,114,228,0.8)',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#8392ab',
                      fontSize: '0.875rem',
                      '&.Mui-focused': {
                        color: 'rgba(94,114,228,0.8)',
                      },
                    },
                    '& .MuiSelect-select': {
                      color: '#344767',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    },
                  }}
                >
                  <InputLabel>Model Version</InputLabel>
                  <Select
                    value={selectedVersion}
                    label="Model Version"
                    onChange={handleVersionChange}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: '0.5rem',
                          boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
                          maxHeight: 240,
                          '& .MuiMenuItem-root': {
                            fontSize: '0.875rem',
                            color: '#344767',
                            py: 1.5,
                            '&:hover': {
                              backgroundColor: 'rgba(94,114,228,0.08)',
                            },
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(94,114,228,0.12)',
                              '&:hover': {
                                backgroundColor: 'rgba(94,114,228,0.16)',
                              },
                            },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value="all" sx={{ fontStyle: 'italic', color: '#8392ab' }}>
                      All Versions
                    </MenuItem>
                    {modelVersions.map((version) => (
                      <MenuItem key={version.version_id} value={version.version_id}>
                        {version.version_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl 
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.5rem',
                      backgroundColor: '#fff',
                      '& fieldset': {
                        borderColor: 'rgba(0,0,0,0.1)',
                        borderWidth: '1px',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(94,114,228,0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(94,114,228,0.8)',
                        borderWidth: '2px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#8392ab',
                      fontSize: '0.875rem',
                      '&.Mui-focused': {
                        color: 'rgba(94,114,228,0.8)',
                      },
                    },
                    '& .MuiSelect-select': {
                      color: '#344767',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    },
                  }}
                >
                  <InputLabel>Test Set</InputLabel>
                  <Select
                    value={selectedTestset}
                    label="Test Set"
                    onChange={handleTestsetChange}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: '0.5rem',
                          boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
                          maxHeight: 240,
                          '& .MuiMenuItem-root': {
                            fontSize: '0.875rem',
                            color: '#344767',
                            py: 1.5,
                            '&:hover': {
                              backgroundColor: 'rgba(94,114,228,0.08)',
                            },
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(94,114,228,0.12)',
                              '&:hover': {
                                backgroundColor: 'rgba(94,114,228,0.16)',
                              },
                            },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value="all" sx={{ fontStyle: 'italic', color: '#8392ab' }}>
                      All Test Sets
                    </MenuItem>
                    {testsets.map((testset) => (
                      <MenuItem key={testset.testset_id} value={testset.testset_id}>
                        {testset.testset_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <ToggleButtonGroup
                  value={selectedMetric}
                  exclusive
                  onChange={handleMetricChange}
                  fullWidth
                  sx={{
                    '& .MuiToggleButton-root': {
                      borderRadius: '0.5rem',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&.Mui-selected': {
                        background: 'linear-gradient(90deg, rgba(94,114,228,1) 0%, rgba(130,94,228,1) 100%)',
                        color: 'white',
                        '&:hover': {
                          background: 'linear-gradient(90deg, rgba(84,104,218,1) 0%, rgba(120,84,218,1) 100%)',
                        }
                      }
                    }
                  }}
                >
                  <ToggleButton value="bleu">BLEU</ToggleButton>
                  <ToggleButton value="comet">COMET</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </Grid>

            {selectedLangPair && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`Language: ${getLanguagePairName(selectedLangPair as number)}`}
                  color="primary"
                  size="small"
                />
                {selectedTestset !== 'all' && (
                  <Chip
                    label={`Test Set: ${getTestsetName(selectedTestset as number)}`}
                    color="secondary"
                    size="small"
                  />
                )}
                <Chip
                  label={`Metric: ${selectedMetric.toUpperCase()}`}
                  color="info"
                  size="small"
                />
              </Box>
            )}
          </Box>

          <Divider />

          {/* Charts Section */}
          <Box sx={{ p: 3 }}>
            {isLoadingCharts ? (
              <LoadingIndicator message="Loading charts..." />
            ) : (
              <Grid container spacing={4}>
                {/* Progress Chart */}
                <Grid item xs={12} lg={6}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '1px solid rgba(0,0,0,0.05)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Avatar sx={{ 
                          background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                          mr: 2,
                          width: 40,
                          height: 40
                        }}>
                          <ShowChartIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#344767' }}>
                            Progress Over Time
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#67748e' }}>
                            Model performance evolution
                          </Typography>
                        </Box>
                      </Box>

                      {progressData.length > 0 ? (
                        <Box sx={{ height: 350 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={progressData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                              <XAxis 
                                dataKey="version_name" 
                                tick={{ fontSize: 12, fill: '#67748e' }}
                              />
                              <YAxis 
                                domain={getYAxisDomain(selectedMetric)}
                                tick={{ fontSize: 12, fill: '#67748e' }}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey={selectedMetric}
                                stroke="#667eea"
                                strokeWidth={3}
                                dot={{ fill: '#667eea', strokeWidth: 2, r: 6 }}
                                activeDot={{ r: 8, fill: '#667eea' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      ) : (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          {selectedLangPair ? 
                            'No progress data available for selected filters.' : 
                            'Please select a language pair to view progress data.'
                          }
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Comparison Chart */}
                <Grid item xs={12} lg={6}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '1px solid rgba(0,0,0,0.05)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Avatar sx={{ 
                          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                          mr: 2,
                          width: 40,
                          height: 40
                        }}>
                          <BarChartIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#344767' }}>
                            Model Comparison
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#67748e' }}>
                            {selectedVersion === 'all' 
                              ? 'Average performance across all versions' 
                              : `Performance for ${modelVersions.find(v => v.version_id === selectedVersion)?.version_name || 'selected version'}`
                            }
                          </Typography>
                        </Box>
                      </Box>

                      {comparisonData.length > 0 ? (
                        <Box sx={{ height: 350 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData}>
                              <defs>
                                <linearGradient id="baseModelGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#dc3545" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#fd7e14" stopOpacity={0.8}/>
                                </linearGradient>
                                <linearGradient id="finetunedModelGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#28a745" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#20c997" stopOpacity={0.8}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                              <XAxis 
                                dataKey="testset_name" 
                                tick={{ fontSize: 12, fill: '#67748e' }}
                              />
                              <YAxis 
                                domain={getYAxisDomain(selectedMetric)}
                                tick={{ fontSize: 12, fill: '#67748e' }}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Bar 
                                dataKey="base_model" 
                                name="Base Model"
                                fill="url(#baseModelGradient)"
                                radius={[4, 4, 0, 0]}
                              >
                                <LabelList dataKey="base_model" position="top" fontSize={12} />
                              </Bar>
                              <Bar 
                                dataKey="finetuned_model" 
                                name="Finetuned Model"
                                fill="url(#finetunedModelGradient)"
                                radius={[4, 4, 0, 0]}
                              >
                                <LabelList dataKey="finetuned_model" position="top" fontSize={12} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      ) : (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          {selectedLangPair === '' ? 
                            'Please select a language pair to view comparison data.' :
                            selectedVersion === 'all' ?
                            'No training results available for any versions in this language pair.' :
                            'No comparison data available for selected version.'
                          }
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Visualizations; 