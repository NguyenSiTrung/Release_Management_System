import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Tabs,
  Tab,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  FormHelperText,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import { Send as SendIcon, Science as ScienceIcon, Translate as TranslateIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ModelVersion, EvaluationResultData, EvaluationStatus } from '../types';
import { getModelVersions, getLanguagePairs, getTestsets } from '../services/api';
import { runEvaluation, getEvaluationStatus, translateText } from '../services/evaluationService';
import PageHeader from '../components/common/PageHeader';
import LoadingIndicator from '../components/common/LoadingIndicator';
// import ErrorDisplay from '../components/common/ErrorDisplay';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tab-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Define available mode types
const MODE_TYPES = [
  "Interpreter Listening Mode",
  "Interpreter Conversation Mode",
  "Keyboard, Voice Recorder Mode",
  "Samsung Note Mode",
  "Samsung Internet Mode",
  "Custom"
];

// Define available model types for evaluation
const EVAL_MODEL_TYPES = [
  { value: "finetuned", label: "Finetuned Model (GRPO+ORPO)" },
  { value: "base", label: "Base Model" },
  { value: "both", label: "Both Models (for comparison)" }
];

// Define available model types for direct translation
const TRANSLATION_MODEL_TYPES = [
  { value: "finetuned", label: "Finetuned Model (GRPO+ORPO)" },
  { value: "base", label: "Base Model" }
];

const EvaluationTranslation: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [languagePairs, setLanguagePairs] = useState<any[]>([]);
  const [selectedLangPair, setSelectedLangPair] = useState<number | ''>('');
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [testsets, setTestsets] = useState<any[]>([]);
  
  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResultData | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState<EvaluationStatus | null>(null);
  const [evaluationJobId, setEvaluationJobId] = useState<number | null>(null);
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  
  // Translation state
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState<string>('');
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Language pair change handler
  const handleLangPairChange = (event: SelectChangeEvent<number | string>) => {
    setSelectedLangPair(event.target.value as number);
  };
  
  // Evaluation form
  const evaluationFormik = useFormik({
    initialValues: {
      version_id: '',
      testset_id: '',
      auto_add_to_details: true,
      evaluation_model_type: 'finetuned',
      mode_type: 'Interpreter Listening Mode',
      sub_mode_type: 'plain',
      custom_params: '',
    },
    validationSchema: Yup.object({
      version_id: Yup.number().required('Model version is required'),
      testset_id: Yup.number().required('Testset is required'),
      evaluation_model_type: Yup.string().required('Model type is required'),
      mode_type: Yup.string().required('Mode type is required'),
      sub_mode_type: Yup.string().when('mode_type', {
        is: (modeTypeValue: any) => modeTypeValue === 'Samsung Note Mode' || modeTypeValue === 'Samsung Internet Mode',
        then: schema => schema.required('Sub-mode is required for this mode'),
        otherwise: schema => schema.optional(),
      }),
      custom_params: Yup.string().when('mode_type', {
        is: 'Custom',
        then: schema => schema.required('Custom parameters are required for custom mode'),
        otherwise: schema => schema.optional(),
      }),
    }),
    onSubmit: async (values) => {
      try {
        setIsEvaluating(true);
        setEvaluationResult(null);
        setEvaluationStatus(null);
        setError(null);
        
        const response = await runEvaluation({
          version_id: parseInt(values.version_id as string),
          testset_id: parseInt(values.testset_id as string),
          auto_add_to_details: values.auto_add_to_details,
          evaluation_model_type: values.evaluation_model_type as 'base' | 'finetuned' | 'both',
          mode_type: values.mode_type,
          sub_mode_type: values.sub_mode_type,
          custom_params: values.mode_type === 'Custom' ? values.custom_params : undefined,
        });
        
        setEvaluationJobId(response.job_id);
        setEvaluationStatus(response.status);
        setEvaluationProgress(response.progress_percentage || 0);
        
      } catch (err: any) {
        console.error('Error running evaluation:', err);
        setError(`Failed to start evaluation: ${err.response?.data?.detail || err.message}`);
        setIsEvaluating(false);
      }
    },
  });
  
  // Translation form
  const translationFormik = useFormik({
    initialValues: {
      version_id: '',
      source_text: '',
      model_type: 'finetuned',
      mode_type: 'Interpreter Listening Mode',
      sub_mode_type: 'plain',
      custom_params: '',
    },
    validationSchema: Yup.object({
      version_id: Yup.number().required('Model version is required'),
      source_text: Yup.string().required('Source text is required'),
      model_type: Yup.string().required('Model type is required'),
      mode_type: Yup.string().required('Mode type is required'),
      sub_mode_type: Yup.string().when('mode_type', {
        is: (modeTypeValue: any) => modeTypeValue === 'Samsung Note Mode' || modeTypeValue === 'Samsung Internet Mode',
        then: schema => schema.required('Sub-mode is required for this mode'),
        otherwise: schema => schema.optional(),
      }),
      custom_params: Yup.string().when('mode_type', {
        is: 'Custom',
        then: schema => schema.required('Custom parameters are required for custom mode'),
        otherwise: schema => schema.optional(),
      }),
    }),
    onSubmit: async (values) => {
      try {
        setIsTranslating(true);
        setTranslationResult('');
        setTranslationError(null);
        
        const response = await translateText({
          version_id: parseInt(values.version_id as string),
          source_text: values.source_text,
          model_type: values.model_type,
          mode_type: values.mode_type,
          sub_mode_type: values.sub_mode_type,
          custom_params: values.mode_type === 'Custom' ? values.custom_params : undefined,
        });
        
        setTranslationResult(response.translated_text);
      } catch (err: any) {
        console.error('Error translating text:', err);
        setTranslationError(`Translation failed: ${err.response?.data?.detail || err.message}`);
      } finally {
        setIsTranslating(false);
      }
    },
  });

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get language pairs
        const langPairsData = await getLanguagePairs();
        setLanguagePairs(langPairsData);
        
        // Set first language pair as default if available
        if (langPairsData.length > 0) {
          setSelectedLangPair(langPairsData[0].lang_pair_id);
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load initial data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Load model versions and testsets when language pair changes
  useEffect(() => {
    const fetchModelVersionsAndTestsets = async () => {
      if (!selectedLangPair) return;
      
      try {
        setIsLoading(true);
        
        // Get model versions for selected language pair
        const versionsData = await getModelVersions(selectedLangPair as number);
        setModelVersions(versionsData);
        
        // Get testsets for selected language pair
        const testsetsData = await getTestsets(selectedLangPair as number);
        setTestsets(testsetsData);
        
        // Reset form values when language pair changes
        evaluationFormik.resetForm();
        translationFormik.resetForm();
        
        // Reset results
        setEvaluationResult(null);
        setEvaluationStatus(null);
        setEvaluationJobId(null);
        setTranslationResult('');
        setTranslationError(null);
        
      } catch (err) {
        console.error('Error fetching data for language pair:', err);
        setError(`Failed to load data for the selected language pair. Please try again.`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchModelVersionsAndTestsets();
  }, [selectedLangPair]);
  
  // Poll evaluation status if job is running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (evaluationJobId && evaluationStatus && 
        ![EvaluationStatus.COMPLETED, EvaluationStatus.FAILED].includes(evaluationStatus)) {
      
      interval = setInterval(async () => {
        try {
          const statusData = await getEvaluationStatus(evaluationJobId);
          setEvaluationStatus(statusData.status);
          setEvaluationProgress(statusData.progress_percentage || 0);
          
          if (statusData.status === EvaluationStatus.COMPLETED) {
            setEvaluationResult(statusData.result || null);
            setIsEvaluating(false);
            clearInterval(interval);
          } else if (statusData.status === EvaluationStatus.FAILED) {
            setError(`Evaluation failed: ${statusData.log_message || statusData.error_message || statusData.detail || 'Unknown error'}`);
            setIsEvaluating(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Error polling evaluation status:', err);
          setError('Failed to get evaluation status. Please check job history.');
          setIsEvaluating(false);
          clearInterval(interval);
        }
      }, 2000); // Poll every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [evaluationJobId, evaluationStatus]);

  // Get selected model version details
  const getSelectedModelDetails = (versionId: string | number) => {
    if (!versionId) return null;
    return modelVersions.find(v => v.version_id === parseInt(versionId as string));
  };
  
  // Determine if selected model version has required files for selected model type
  const checkModelFilesAvailability = (values: any, modelType: string) => {
    const selectedVersion = getSelectedModelDetails(values.version_id);
    if (!selectedVersion) return false;
    
    if (modelType === 'finetuned' || modelType === 'both') {
      const hasFinetunedFiles = !!(
        selectedVersion.model_file_name && 
        selectedVersion.hparams_file_name
      );
      if (!hasFinetunedFiles && (modelType === 'finetuned' || modelType === 'both')) {
        return false;
      }
    }
    
    if (modelType === 'base' || modelType === 'both') {
      const hasBaseFiles = !!(
        selectedVersion.base_model_file_name && 
        selectedVersion.base_hparams_file_name
      );
      if (!hasBaseFiles && (modelType === 'base' || modelType === 'both')) {
        return false;
      }
    }
    
    return true;
  };

  // Render function for evaluation results
  const renderEvaluationResults = () => {
    if (!evaluationResult) return null;
    
    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Evaluation Results</Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  {evaluationResult.base_model_result && <TableCell>Base Model</TableCell>}
                  <TableCell>Finetuned Model</TableCell>
                  {evaluationResult.base_model_result && <TableCell>Improvement</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>BLEU</TableCell>
                  {evaluationResult.base_model_result && 
                    <TableCell>{evaluationResult.base_model_result.bleu_score.toFixed(2)}</TableCell>
                  }
                  <TableCell>{evaluationResult.bleu_score.toFixed(2)}</TableCell>
                  {evaluationResult.base_model_result && 
                    <TableCell>
                      {(evaluationResult.bleu_score - evaluationResult.base_model_result.bleu_score).toFixed(2)}
                    </TableCell>
                  }
                </TableRow>
                <TableRow>
                  <TableCell>COMET</TableCell>
                  {evaluationResult.base_model_result && 
                    <TableCell>{evaluationResult.base_model_result.comet_score.toFixed(4)}</TableCell>
                  }
                  <TableCell>{evaluationResult.comet_score.toFixed(4)}</TableCell>
                  {evaluationResult.base_model_result && 
                    <TableCell>
                      {(evaluationResult.comet_score - evaluationResult.base_model_result.comet_score).toFixed(4)}
                    </TableCell>
                  }
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          {evaluationResult.added_to_details && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Results have been added to the model version's training results.
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading && !modelVersions.length && !testsets.length) {
    return <LoadingIndicator />;
  }

  return (
    <Container maxWidth="xl">
      <PageHeader title="Evaluation & Translation" />
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Language pair selection */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel id="lang-pair-select-label">Language Pair</InputLabel>
          <Select
            labelId="lang-pair-select-label"
            id="lang-pair-select"
            value={selectedLangPair}
            label="Language Pair"
            onChange={handleLangPairChange}
          >
            {languagePairs.map((pair) => (
              <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                {pair.source_language_code} → {pair.target_language_code}
              </MenuItem>
            ))}
          </Select>
          {!languagePairs.length && (
            <FormHelperText error>No language pairs available</FormHelperText>
          )}
        </FormControl>
      </Paper>
      
      {/* Tabs for Evaluation and Translation */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab icon={<ScienceIcon />} label="Model Evaluation" />
          <Tab icon={<TranslateIcon />} label="Direct Translation" />
        </Tabs>
        
        {/* Model Evaluation Tab */}
        <TabPanel value={tabValue} index={0}>
          <form onSubmit={evaluationFormik.handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!(evaluationFormik.touched.version_id && evaluationFormik.errors.version_id)}>
                  <InputLabel id="version-select-label">Model Version</InputLabel>
                  <Select
                    labelId="version-select-label"
                    id="version_id"
                    name="version_id"
                    value={evaluationFormik.values.version_id}
                    onChange={evaluationFormik.handleChange}
                    label="Model Version"
                    disabled={isEvaluating || !modelVersions.length}
                  >
                    {modelVersions.map((version) => (
                      <MenuItem key={version.version_id} value={version.version_id}>
                        {version.version_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {(evaluationFormik.touched.version_id && evaluationFormik.errors.version_id) ? (
                    <FormHelperText>{evaluationFormik.errors.version_id}</FormHelperText>
                  ) : !modelVersions.length ? (
                    <FormHelperText error>No model versions available for this language pair</FormHelperText>
                  ) : null}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!(evaluationFormik.touched.testset_id && evaluationFormik.errors.testset_id)}>
                  <InputLabel id="testset-select-label">Testset</InputLabel>
                  <Select
                    labelId="testset-select-label"
                    id="testset_id"
                    name="testset_id"
                    value={evaluationFormik.values.testset_id}
                    onChange={evaluationFormik.handleChange}
                    label="Testset"
                    disabled={isEvaluating || !testsets.length}
                  >
                    {testsets.map((testset) => (
                      <MenuItem key={testset.testset_id} value={testset.testset_id}>
                        {testset.testset_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {(evaluationFormik.touched.testset_id && evaluationFormik.errors.testset_id) ? (
                    <FormHelperText>{evaluationFormik.errors.testset_id}</FormHelperText>
                  ) : !testsets.length ? (
                    <FormHelperText error>No testsets available for this language pair</FormHelperText>
                  ) : null}
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Evaluation Settings
                  </Typography>
                </Divider>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={!!(evaluationFormik.touched.evaluation_model_type && evaluationFormik.errors.evaluation_model_type)}
                >
                  <InputLabel id="model-type-select-label">Model Type</InputLabel>
                  <Select
                    labelId="model-type-select-label"
                    id="evaluation_model_type"
                    name="evaluation_model_type"
                    value={evaluationFormik.values.evaluation_model_type}
                    onChange={evaluationFormik.handleChange}
                    label="Model Type"
                    disabled={isEvaluating}
                  >
                    {EVAL_MODEL_TYPES.map((type) => {
                      const disabled = !checkModelFilesAvailability(evaluationFormik.values, type.value);
                      return (
                        <MenuItem 
                          key={type.value} 
                          value={type.value}
                          disabled={disabled || !evaluationFormik.values.version_id}
                        >
                          {type.label}
                          {disabled && evaluationFormik.values.version_id && ' (files not available)'}
                        </MenuItem>
                      );
                    })}
                  </Select>
                  {(evaluationFormik.touched.evaluation_model_type && evaluationFormik.errors.evaluation_model_type) ? (
                    <FormHelperText>{evaluationFormik.errors.evaluation_model_type}</FormHelperText>
                  ) : null}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth
                  error={!!(evaluationFormik.touched.mode_type && evaluationFormik.errors.mode_type)}
                >
                  <InputLabel id="mode-type-select-label">Mode Type</InputLabel>
                  <Select
                    labelId="mode-type-select-label"
                    id="mode_type"
                    name="mode_type"
                    value={evaluationFormik.values.mode_type}
                    onChange={evaluationFormik.handleChange}
                    label="Mode Type"
                    disabled={isEvaluating}
                  >
                    {MODE_TYPES.map((mode) => (
                      <MenuItem key={mode} value={mode}>
                        {mode}
                      </MenuItem>
                    ))}
                  </Select>
                  {(evaluationFormik.touched.mode_type && evaluationFormik.errors.mode_type) ? (
                    <FormHelperText>{evaluationFormik.errors.mode_type}</FormHelperText>
                  ) : null}
                </FormControl>
              </Grid>
              
              {(evaluationFormik.values.mode_type === 'Samsung Note Mode' || 
                evaluationFormik.values.mode_type === 'Samsung Internet Mode') && (
                <Grid item xs={12} md={6}>
                  <FormControl 
                    fullWidth
                    error={!!(evaluationFormik.touched.sub_mode_type && evaluationFormik.errors.sub_mode_type)}
                  >
                    <InputLabel id="sub-mode-type-select-label">Sub-Mode Type</InputLabel>
                    <Select
                      labelId="sub-mode-type-select-label"
                      id="sub_mode_type"
                      name="sub_mode_type"
                      value={evaluationFormik.values.sub_mode_type}
                      onChange={evaluationFormik.handleChange}
                      label="Sub-Mode Type"
                      disabled={isEvaluating}
                    >
                      <MenuItem value="plain">Plain</MenuItem>
                      <MenuItem value="tagged">Tagged</MenuItem>
                    </Select>
                    {(evaluationFormik.touched.sub_mode_type && evaluationFormik.errors.sub_mode_type) ? (
                      <FormHelperText>{evaluationFormik.errors.sub_mode_type}</FormHelperText>
                    ) : null}
                  </FormControl>
                </Grid>
              )}
              
              {evaluationFormik.values.mode_type === 'Custom' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="custom_params"
                    name="custom_params"
                    label="Custom Parameters"
                    value={evaluationFormik.values.custom_params}
                    onChange={evaluationFormik.handleChange}
                    error={!!(evaluationFormik.touched.custom_params && evaluationFormik.errors.custom_params)}
                    helperText={(evaluationFormik.touched.custom_params && evaluationFormik.errors.custom_params) || 
                      "Enter custom parameters as space-separated values"}
                    disabled={isEvaluating}
                  />
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isEvaluating || !evaluationFormik.values.version_id || !evaluationFormik.values.testset_id}
                  startIcon={isEvaluating ? <CircularProgress size={24} /> : <ScienceIcon />}
                  fullWidth
                >
                  {isEvaluating ? 'Evaluating...' : 'Run Evaluation'}
                </Button>
              </Grid>
            </Grid>
          </form>
          
          {/* Evaluation Progress */}
          {isEvaluating && evaluationStatus && (
            <Box sx={{ my: 3 }}>
              <Typography variant="body1" gutterBottom>
                Evaluation Status: {evaluationStatus}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgressWithLabel value={evaluationProgress} />
                </Box>
              </Box>
            </Box>
          )}
          
          {/* Evaluation Results */}
          {renderEvaluationResults()}
        </TabPanel>
        
        {/* Direct Translation Tab */}
        <TabPanel value={tabValue} index={1}>
          <form onSubmit={translationFormik.handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={!!(translationFormik.touched.version_id && translationFormik.errors.version_id)}
                >
                  <InputLabel id="version-translate-select-label">Model Version</InputLabel>
                  <Select
                    labelId="version-translate-select-label"
                    id="version_id"
                    name="version_id"
                    value={translationFormik.values.version_id}
                    onChange={translationFormik.handleChange}
                    label="Model Version"
                    disabled={isTranslating || !modelVersions.length}
                  >
                    {modelVersions.map((version) => (
                      <MenuItem key={version.version_id} value={version.version_id}>
                        {version.version_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {(translationFormik.touched.version_id && translationFormik.errors.version_id) ? (
                    <FormHelperText>{translationFormik.errors.version_id}</FormHelperText>
                  ) : !modelVersions.length ? (
                    <FormHelperText error>No model versions available for this language pair</FormHelperText>
                  ) : null}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  error={!!(translationFormik.touched.model_type && translationFormik.errors.model_type)}
                >
                  <InputLabel id="model-type-translate-select-label">Model Type</InputLabel>
                  <Select
                    labelId="model-type-translate-select-label"
                    id="model_type"
                    name="model_type"
                    value={translationFormik.values.model_type}
                    onChange={translationFormik.handleChange}
                    label="Model Type"
                    disabled={isTranslating}
                  >
                    {TRANSLATION_MODEL_TYPES.map((type) => {
                      const disabled = !checkModelFilesAvailability(translationFormik.values, type.value);
                      return (
                        <MenuItem 
                          key={type.value} 
                          value={type.value}
                          disabled={disabled || !translationFormik.values.version_id}
                        >
                          {type.label}
                          {disabled && translationFormik.values.version_id && ' (files not available)'}
                        </MenuItem>
                      );
                    })}
                  </Select>
                  {(translationFormik.touched.model_type && translationFormik.errors.model_type) ? (
                    <FormHelperText>{translationFormik.errors.model_type}</FormHelperText>
                  ) : null}
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Translation Settings
                  </Typography>
                </Divider>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth
                  error={!!(translationFormik.touched.mode_type && translationFormik.errors.mode_type)}
                >
                  <InputLabel id="mode-type-translate-select-label">Mode Type</InputLabel>
                  <Select
                    labelId="mode-type-translate-select-label"
                    id="mode_type"
                    name="mode_type"
                    value={translationFormik.values.mode_type}
                    onChange={translationFormik.handleChange}
                    label="Mode Type"
                    disabled={isTranslating}
                  >
                    {MODE_TYPES.map((mode) => (
                      <MenuItem key={mode} value={mode}>
                        {mode}
                      </MenuItem>
                    ))}
                  </Select>
                  {(translationFormik.touched.mode_type && translationFormik.errors.mode_type) ? (
                    <FormHelperText>{translationFormik.errors.mode_type}</FormHelperText>
                  ) : null}
                </FormControl>
              </Grid>
              
              {(translationFormik.values.mode_type === 'Samsung Note Mode' || 
                translationFormik.values.mode_type === 'Samsung Internet Mode') && (
                <Grid item xs={12} md={6}>
                  <FormControl 
                    fullWidth
                    error={!!(translationFormik.touched.sub_mode_type && translationFormik.errors.sub_mode_type)}
                  >
                    <InputLabel id="sub-mode-type-translate-select-label">Sub-Mode Type</InputLabel>
                    <Select
                      labelId="sub-mode-type-translate-select-label"
                      id="sub_mode_type"
                      name="sub_mode_type"
                      value={translationFormik.values.sub_mode_type}
                      onChange={translationFormik.handleChange}
                      label="Sub-Mode Type"
                      disabled={isTranslating}
                    >
                      <MenuItem value="plain">Plain</MenuItem>
                      <MenuItem value="tagged">Tagged</MenuItem>
                    </Select>
                    {(translationFormik.touched.sub_mode_type && translationFormik.errors.sub_mode_type) ? (
                      <FormHelperText>{translationFormik.errors.sub_mode_type}</FormHelperText>
                    ) : null}
                  </FormControl>
                </Grid>
              )}
              
              {translationFormik.values.mode_type === 'Custom' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="custom_params"
                    name="custom_params"
                    label="Custom Parameters"
                    value={translationFormik.values.custom_params}
                    onChange={translationFormik.handleChange}
                    error={!!(translationFormik.touched.custom_params && translationFormik.errors.custom_params)}
                    helperText={(translationFormik.touched.custom_params && translationFormik.errors.custom_params) || 
                      "Enter custom parameters as space-separated values"}
                    disabled={isTranslating}
                  />
                </Grid>
              )}
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="source_text"
                  name="source_text"
                  label="Source Text"
                  multiline
                  rows={5}
                  value={translationFormik.values.source_text}
                  onChange={translationFormik.handleChange}
                  error={!!(translationFormik.touched.source_text && translationFormik.errors.source_text)}
                  helperText={(translationFormik.touched.source_text && translationFormik.errors.source_text) || 
                    "Enter the text you want to translate"}
                  disabled={isTranslating}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isTranslating || !translationFormik.values.version_id || !translationFormik.values.source_text}
                  startIcon={isTranslating ? <CircularProgress size={24} /> : <SendIcon />}
                  fullWidth
                >
                  {isTranslating ? 'Translating...' : 'Translate Text'}
                </Button>
              </Grid>
            </Grid>
          </form>
          
          {/* Translation Error */}
          {translationError && (
            <Alert severity="error" sx={{ mt: 3 }} onClose={() => setTranslationError(null)}>
              {translationError}
            </Alert>
          )}
          
          {/* Translation Result */}
          {translationResult && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Translation Result</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {translationResult}
                </Typography>
              </CardContent>
            </Card>
          )}
        </TabPanel>
      </Paper>
    </Container>
  );
};

// Linear progress bar with label
function LinearProgressWithLabel(props: { value: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">{`${Math.round(
          props.value,
        )}%`}</Typography>
      </Box>
    </Box>
  );
}

export default EvaluationTranslation; 