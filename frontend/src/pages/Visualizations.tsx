import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
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
  getLanguagePairs,
  getTestsets,
  getModelVersions,
  getComparisonData,
  getProgressData,
} from '../services/api';
import { LanguagePair, ModelVersion, Testset } from '../types';
import PageHeader from '../components/common/PageHeader';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';

// Custom color palette for charts
const colors = ['#3f51b5', '#f50057', '#00bcd4', '#4caf50', '#ff9800', '#9c27b0'];

const Visualizations: React.FC = () => {
  // State for language pairs, model versions, and testsets
  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [selectedLangPair, setSelectedLangPair] = useState<number | ''>('');
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | ''>('');
  const [testsets, setTestsets] = useState<Testset[]>([]);
  const [selectedTestset, setSelectedTestset] = useState<number | ''>('');
  
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
        const testsetsData = await getTestsets();
        setTestsets(testsetsData);
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
        const data = await getModelVersions(selectedLangPair as number);
        setModelVersions(data);
        
        // Reset selected version
        setSelectedVersion('');
        
        // Fetch progress data for this language pair
        await fetchProgressData(selectedLangPair as number, selectedMetric, selectedTestset ? selectedTestset as number : undefined);
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

  // Fetch comparison data when a version is selected
  useEffect(() => {
    const fetchComparisonData = async () => {
      if (selectedVersion === '') return;
      
      try {
        setIsLoadingCharts(true);
        const data = await getComparisonData(
          selectedVersion as number,
          selectedTestset ? selectedTestset as number : undefined
        );
        setComparisonData(data);
      } catch (err) {
        console.error('Error fetching comparison data:', err);
        setError('Failed to load comparison data. Please try again.');
      } finally {
        setIsLoadingCharts(false);
      }
    };
    
    if (selectedVersion !== '') {
      fetchComparisonData();
    }
  }, [selectedVersion, selectedTestset]);

  // Fetch progress data for a language pair
  const fetchProgressData = async (langPairId: number, metric: 'bleu' | 'comet', testsetId?: number) => {
    try {
      setIsLoadingCharts(true);
      const data = await getProgressData(langPairId, metric, testsetId);
      setProgressData(data);
    } catch (err) {
      console.error('Error fetching progress data:', err);
      setError('Failed to load progress data. Please try again.');
    } finally {
      setIsLoadingCharts(false);
    }
  };

  // Handlers for selection changes
  const handleLangPairChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedLangPair(typeof value === 'number' ? value : value === '' ? '' : parseInt(value as string));
    setSelectedVersion('');
    setComparisonData([]);
  };

  const handleVersionChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedVersion(typeof value === 'number' ? value : value === '' ? '' : parseInt(value as string));
  };

  const handleTestsetChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedTestset(typeof value === 'number' ? value : value === '' ? '' : parseInt(value as string));
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
      ? `${langPair.source_language_code}-${langPair.target_language_code}` 
      : 'Unknown';
  };

  const getTestsetName = (testsetId: number) => {
    const testset = testsets.find(t => t.testset_id === testsetId);
    return testset ? testset.testset_name : 'Unknown';
  };

  // Formatting functions for charts
  const formatScoreValue = (value: number) => {
    return selectedMetric === 'bleu' 
      ? value.toFixed(2)  // BLEU with 2 decimal places
      : value.toFixed(4);  // COMET with 4 decimal places
  };

  // THÊM HÀM MỚI: Định dạng giá trị hiển thị trên trục Y dựa trên loại metric
  const getYAxisDomain = (metric: 'bleu' | 'comet') => {
    return metric === 'bleu' ? [0, 100] : [0, 1];
  };

  // THÊM HÀM MỚI: Định dạng giá trị tooltip của biểu đồ
  const formatTooltipValue = (value: number, metric: 'bleu' | 'comet') => {
    return metric === 'bleu' 
      ? value.toFixed(2)  // BLEU with 2 decimal places
      : value.toFixed(4);  // COMET with 4 decimal places
  };

  if (isLoading) {
    return <LoadingIndicator message="Loading visualization data..." />;
  }

  return (
    <Box>
      <PageHeader title="Performance Visualizations" />

      {error && <ErrorDisplay message={error} onRetry={() => window.location.reload()} />}

      <Grid container spacing={3}>
        {/* Filter Controls */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel id="lang-pair-label">Language Pair</InputLabel>
                  <Select
                    labelId="lang-pair-label"
                    value={selectedLangPair}
                    onChange={handleLangPairChange}
                    label="Language Pair"
                  >
                    <MenuItem value="">
                      <em>Select a language pair</em>
                    </MenuItem>
                    {languagePairs.map((pair) => (
                      <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                        {pair.source_language_code}-{pair.target_language_code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth disabled={selectedLangPair === ''}>
                  <InputLabel id="version-label">Model Version</InputLabel>
                  <Select
                    labelId="version-label"
                    value={selectedVersion}
                    onChange={handleVersionChange}
                    label="Model Version"
                  >
                    <MenuItem value="">
                      <em>Select a model version</em>
                    </MenuItem>
                    {modelVersions.map((version) => (
                      <MenuItem key={version.version_id} value={version.version_id}>
                        {version.version_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel id="testset-label">Testset</InputLabel>
                  <Select
                    labelId="testset-label"
                    value={selectedTestset}
                    onChange={handleTestsetChange}
                    label="Testset"
                  >
                    <MenuItem value="">
                      <em>All Testsets</em>
                    </MenuItem>
                    {testsets
                      .filter(t => selectedLangPair === '' || t.lang_pair_id === selectedLangPair)
                      .map((testset) => (
                        <MenuItem key={testset.testset_id} value={testset.testset_id}>
                          {testset.testset_name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <ToggleButtonGroup
                  color="primary"
                  value={selectedMetric}
                  exclusive
                  onChange={handleMetricChange}
                  aria-label="Metric"
                  fullWidth
                >
                  <ToggleButton value="bleu">BLEU</ToggleButton>
                  <ToggleButton value="comet">COMET</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Progress Chart */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {selectedMetric.toUpperCase()} Score Progress
              {selectedLangPair !== '' && (
                <> for {getLanguagePairName(selectedLangPair as number)}</>
              )}
              {selectedTestset !== '' && (
                <> on {getTestsetName(selectedTestset as number)}</>
              )}
            </Typography>
            
            {isLoadingCharts ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <LoadingIndicator message="Loading chart data..." />
              </Box>
            ) : progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="version_name" />
                  <YAxis 
                    domain={selectedMetric === 'bleu' ? [0, 100] : [0, 1]} 
                    tickFormatter={(value) => selectedMetric === 'bleu' ? value.toString() : value.toString()}
                  />
                  <Tooltip 
                    formatter={(value: number) => 
                      selectedMetric === 'bleu' 
                        ? value.toFixed(2)  // Display BLEU with 2 decimal places
                        : value.toFixed(4)  // Display COMET with 4 decimal places
                    } 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    name={`${selectedMetric.toUpperCase()} Score`} 
                    stroke="#3f51b5" 
                    activeDot={{ r: 8 }}
                  >
                    {/* Display values on each data point */}
                    <LabelList 
                      dataKey="score" 
                      position="top" 
                      formatter={(value: number) => 
                        selectedMetric === 'bleu' 
                          ? value.toFixed(2)  // Display BLEU with 2 decimal places
                          : value.toFixed(4)  // Display COMET with 4 decimal places
                      } 
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            ) : selectedLangPair === '' ? (
              <Typography variant="body1" sx={{ textAlign: 'center', mt: 10 }}>
                Please select a language pair to view progress data.
              </Typography>
            ) : (
              <Typography variant="body1" sx={{ textAlign: 'center', mt: 10 }}>
                No progress data available for the selected criteria.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Comparison Chart */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Base vs. Finetuned Model Comparison
              {selectedVersion !== '' && (
                <> for {modelVersions.find(v => v.version_id === selectedVersion)?.version_name || 'Selected Version'}</>
              )}
              {selectedTestset !== '' && (
                <> on {getTestsetName(selectedTestset as number)}</>
              )}
            </Typography>
            
            {isLoadingCharts ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <LoadingIndicator message="Loading chart data..." />
              </Box>
            ) : comparisonData.length > 0 ? (
              <Grid container spacing={2}>
                {/* BLEU Score Comparison Chart */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" align="center" gutterBottom>
                    BLEU Score (0-100)
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart 
                      data={comparisonData.filter(item => item.metric === "BLEU")} 
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis 
                        domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
                        tickFormatter={value => value.toString()}
                      />
                      <Tooltip formatter={(value: number) => value.toFixed(2)} />
                      <Legend />
                      <Bar dataKey="base_model" name="Base Model" fill="#e91e63">
                        <LabelList 
                          dataKey="base_model" 
                          position="top"
                          formatter={(value: number) => value.toFixed(2)} // Display BLEU with 2 decimal places
                        />
                      </Bar>
                      <Bar dataKey="finetuned_model" name="Finetuned Model" fill="#3f51b5">
                        <LabelList 
                          dataKey="finetuned_model" 
                          position="top"
                          formatter={(value: number) => value.toFixed(2)} // Display BLEU with 2 decimal places
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
                
                {/* COMET Score Comparison Chart */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" align="center" gutterBottom>
                    COMET Score (0-1)
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart 
                      data={comparisonData.filter(item => item.metric === "COMET")} 
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis 
                        domain={[0, 1]}
                        tickFormatter={value => value.toString()}
                      />
                      <Tooltip formatter={(value: number) => value.toFixed(4)} />
                      <Legend />
                      <Bar dataKey="base_model" name="Base Model" fill="#e91e63">
                        <LabelList 
                          dataKey="base_model" 
                          position="top"
                          formatter={(value: number) => value.toFixed(4)} // Display COMET with 4 decimal places
                        />
                      </Bar>
                      <Bar dataKey="finetuned_model" name="Finetuned Model" fill="#3f51b5">
                        <LabelList 
                          dataKey="finetuned_model" 
                          position="top"
                          formatter={(value: number) => value.toFixed(4)} // Display COMET with 4 decimal places
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            ) : selectedVersion === '' ? (
              <Typography variant="body1" sx={{ textAlign: 'center', mt: 10 }}>
                Please select a model version to view comparison data.
              </Typography>
            ) : (
              <Typography variant="body1" sx={{ textAlign: 'center', mt: 10 }}>
                No comparison data available for the selected criteria.
              </Typography>
            )}
          </Paper>
        </Grid>
        
        {/* Additional Information */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              About the Metrics
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1">BLEU Score</Typography>
                <Typography variant="body2">
                  BLEU (Bilingual Evaluation Understudy) is an algorithm for evaluating the quality of text
                  that has been machine-translated from one natural language to another. BLEU scores range from 0 to 1,
                  where values closer to 1 represent translations that are closer to professional human translations.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1">COMET Score</Typography>
                <Typography variant="body2">
                  COMET (Crosslingual Optimized Metric for Evaluation of Translation) is a neural-based metric that 
                  leverages recent breakthroughs in cross-lingual learning to improve correlation with human judgments.
                  COMET scores typically range from -1 to 1, with higher values indicating better translations.
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Visualizations; 