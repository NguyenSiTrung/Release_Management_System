import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Chip,
  Slider,
  Alert,
  InputAdornment,
  Tooltip
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { 
  createSQEResult, 
  updateSQEResult
} from '../../services/sqeService';
import { getModelVersions, getLanguagePairs } from '../../services/api';
import { 
  SQEResultCreate, 
  SQEResultUpdate, 
  SQEResult 
} from '../../types/sqe';
import { ModelVersion, LanguagePair } from '../../types';
import LoadingIndicator from '../common/LoadingIndicator';

interface SQEResultFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  editData?: SQEResult | null;
  preselectedVersionId?: number;
}

const SQEResultForm: React.FC<SQEResultFormProps> = ({
  open,
  onClose,
  onSuccess,
  mode,
  editData,
  preselectedVersionId
}) => {
  const [formData, setFormData] = useState<SQEResultCreate & { sqe_result_id?: number }>({
    version_id: preselectedVersionId || 0,
    average_score: 2.000,
    total_test_cases: 1,
    test_cases_changed: false,
    change_percentage: 0.0,
    has_one_point_case: false,
    test_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [selectedLanguagePair, setSelectedLanguagePair] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Function definitions moved here to avoid "used before declaration" errors
  const fetchLanguagePairs = async () => {
    try {
      setLoading(true);
      const pairs = await getLanguagePairs();
      setLanguagePairs(pairs);
      
      if (mode === 'edit' && editData) {
        // Find the language pair for the edit data
        const modelVersionsForEdit = await getModelVersions(pairs[0]?.lang_pair_id || 1);
        const editVersion = modelVersionsForEdit.items.find((v: any) => v.version_id === editData.version_id);
        if (editVersion) {
          setSelectedLanguagePair(editVersion.lang_pair_id);
        }
      } else if (preselectedVersionId && pairs.length > 0) {
        // Try to find which language pair contains the preselected version
        for (const pair of pairs) {
          try {
            const versions = await getModelVersions(pair.lang_pair_id);
            if (versions.items.some((v: any) => v.version_id === preselectedVersionId)) {
              setSelectedLanguagePair(pair.lang_pair_id);
              break;
            }
          } catch (err) {
            // Continue searching
          }
        }
      } else if (pairs.length > 0) {
        setSelectedLanguagePair(pairs[0].lang_pair_id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch language pairs');
    } finally {
      setLoading(false);
    }
  };

  const fetchModelVersions = async (langPairId: number) => {
    try {
      const versions = await getModelVersions(langPairId);
      setModelVersions(versions.items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch model versions');
    }
  };

  const resetForm = () => {
    if (mode === 'edit' && editData) {
      setFormData({
        sqe_result_id: editData.sqe_result_id,
        version_id: editData.version_id,
        average_score: editData.average_score,
        total_test_cases: editData.total_test_cases,
        test_cases_changed: editData.test_cases_changed,
        change_percentage: editData.change_percentage,
        has_one_point_case: editData.has_one_point_case,
        test_date: editData.test_date || new Date().toISOString().split('T')[0],
        notes: editData.notes || ''
      });
    } else {
      setFormData({
        version_id: preselectedVersionId || 0,
        average_score: 2.000,
        total_test_cases: 1,
        test_cases_changed: false,
        change_percentage: 0.0,
        has_one_point_case: false,
        test_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    setValidationErrors({});
    setError(null);
  };

  const fetchLanguagePairsCallback = React.useCallback(fetchLanguagePairs, [mode, editData, preselectedVersionId]);
  const resetFormCallback = React.useCallback(resetForm, [mode, editData, preselectedVersionId]);

  useEffect(() => {
    if (open) {
      fetchLanguagePairsCallback();
      resetFormCallback();
    }
  }, [open, fetchLanguagePairsCallback, resetFormCallback]);

  useEffect(() => {
    if (selectedLanguagePair) {
      fetchModelVersions(selectedLanguagePair);
    }
  }, [selectedLanguagePair]);

  const handleInputChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | 
    React.ChangeEvent<{ value: unknown }>
  ) => {
    let value = event.target.value;
    
    // Handle number fields
    if (field === 'average_score' || field === 'total_test_cases' || field === 'change_percentage') {
      const numValue = parseFloat(value as string);
      if (!isNaN(numValue)) {
        if (field === 'average_score') {
          // Clamp score between 1 and 3
          value = Math.max(1, Math.min(3, numValue)) as any;
        } else if (field === 'total_test_cases') {
          // Ensure minimum 1 test case
          value = Math.max(1, Math.floor(numValue)) as any;
        } else if (field === 'change_percentage') {
          // Clamp percentage between 0 and 100
          value = Math.max(0, Math.min(100, numValue)) as any;
        }
      } else if (value === '') {
        // Allow empty string for clearing field
        value = field === 'average_score' ? 2.000 : 
               field === 'total_test_cases' ? 1 : 0 as any;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSwitchChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
  };

  const handleSliderChange = (field: keyof typeof formData) => (
    event: Event,
    value: number | number[]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: Array.isArray(value) ? value[0] : value
    }));
  };

  const handleLanguagePairChange = (event: any) => {
    const langPairId = event.target.value;
    setSelectedLanguagePair(langPairId);
    setFormData(prev => ({
      ...prev,
      version_id: 0 // Reset version selection
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.version_id) {
      errors.version_id = 'Please select a model version';
    }

    if (formData.average_score < 1 || formData.average_score > 3) {
      errors.average_score = 'Score must be between 1 and 3';
    }

    if (formData.total_test_cases < 1) {
      errors.total_test_cases = 'Total test cases must be at least 1';
    }

    if (formData.test_cases_changed && formData.change_percentage !== undefined && (formData.change_percentage < 0 || formData.change_percentage > 100)) {
      errors.change_percentage = 'Change percentage must be between 0 and 100';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);

      const submitData: SQEResultCreate | SQEResultUpdate = {
        version_id: formData.version_id,
        average_score: formData.average_score,
        total_test_cases: formData.total_test_cases,
        test_cases_changed: formData.test_cases_changed,
        change_percentage: formData.test_cases_changed ? formData.change_percentage : 0,
        has_one_point_case: formData.has_one_point_case,
        test_date: formData.test_date,
        notes: formData.notes || undefined
      };

      if (mode === 'create') {
        await createSQEResult(submitData as SQEResultCreate);
      } else if (mode === 'edit' && formData.sqe_result_id) {
        await updateSQEResult(formData.sqe_result_id, submitData as SQEResultUpdate);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to ${mode} SQE result`);
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score > 2.5) return '#4caf50'; // Pass: Green
    if (score >= 2.0) return '#ff9800'; // Warning: Orange  
    return '#f44336'; // Fail: Red
  };

  const getScoreDescription = (score: number): string => {
    if (score > 2.5) return 'Pass';
    if (score >= 2.0) return 'Marginal';
    return 'Fail';
  };

  const getOverallResult = (score: number, hasOnePointCase: boolean): { status: string; color: string } => {
    if (score > 2.5 && !hasOnePointCase) {
      return { status: 'PASS', color: '#4caf50' };
    } else {
      return { status: 'FAIL', color: '#f44336' };
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <LoadingIndicator message="Loading form data..." />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '1rem',
          boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
        }
      }}
    >
      <DialogTitle sx={{ 
        fontWeight: 600, 
        color: '#344767',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon sx={{ color: 'rgba(94,114,228,0.8)' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#344767' }}>
            {mode === 'create' ? 'Add SQE Result' : 'Edit SQE Result'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Model Version Selection */}
          <Grid item xs={12} md={6}>
            <FormControl 
              fullWidth 
              size="small" 
              error={!!validationErrors.language_pair}
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
                value={selectedLanguagePair}
                label="Language Pair"
                onChange={handleLanguagePairChange}
                disabled={mode === 'edit'}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      borderRadius: '0.5rem',
                      boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
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
                {languagePairs.map((pair) => (
                  <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                    {pair.source_language_code} → {pair.target_language_code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl 
              fullWidth 
              size="small" 
              error={!!validationErrors.version_id}
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
                value={formData.version_id}
                label="Model Version"
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    version_id: e.target.value as number
                  });
                }}
                disabled={mode === 'edit'}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      borderRadius: '0.5rem',
                      boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
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
                {modelVersions.map((version) => (
                  <MenuItem key={version.version_id} value={version.version_id}>
                    {version.version_name}
                  </MenuItem>
                ))}
              </Select>
              {validationErrors.version_id && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {validationErrors.version_id}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Score Section */}
          <Grid item xs={12}>
            <Box sx={{ 
              border: '1px solid rgba(0,0,0,0.08)', 
              borderRadius: '1rem', 
              p: 3, 
              mb: 2,
              background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(250,250,255,0.95) 100%)'
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#344767', mb: 3 }}>
                Test Score (1.000 - 3.000 scale)
              </Typography>
              
              <Grid container spacing={3}>
                {/* Direct Input */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Score"
                    type="number"
                    value={formData.average_score}
                    onChange={handleInputChange('average_score')}
                    error={!!validationErrors.average_score}
                    helperText={validationErrors.average_score}
                    inputProps={{ min: 1, max: 3, step: 0.001 }}
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
                      '& .MuiOutlinedInput-input': {
                        color: '#344767',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textAlign: 'center',
                      },
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Enter score between 1.000 and 3.000">
                            <InfoIcon sx={{ color: '#7b809a', fontSize: 18 }} />
                          </Tooltip>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                {/* Status Chips */}
                <Grid item xs={12} md={8}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={formData.average_score.toFixed(3)}
                      sx={{
                        backgroundColor: getScoreColor(formData.average_score),
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '1rem',
                        minWidth: '100px',
                        height: '36px',
                        borderRadius: '0.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Chip
                      label={getScoreDescription(formData.average_score)}
                      variant="outlined"
                      sx={{ 
                        color: getScoreColor(formData.average_score),
                        borderColor: getScoreColor(formData.average_score),
                        fontWeight: 500,
                        borderRadius: '0.5rem'
                      }}
                    />
                    <Chip
                      label={getOverallResult(formData.average_score, formData.has_one_point_case ?? false).status}
                      sx={{
                        backgroundColor: getOverallResult(formData.average_score, formData.has_one_point_case ?? false).color,
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        borderRadius: '0.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                  </Box>
                </Grid>

                {/* Slider */}
                <Grid item xs={12}>
                  <Box sx={{ px: 2, mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#7b809a', mb: 2, display: 'block' }}>
                      Use the slider below for quick adjustments:
                    </Typography>
                    <Slider
                      value={formData.average_score}
                      onChange={handleSliderChange('average_score')}
                      min={1}
                      max={3}
                      step={0.001}
                      marks={[
                        { value: 1, label: '1.000' },
                        { value: 1.5, label: '1.500' },
                        { value: 2, label: '2.000' },
                        { value: 2.5, label: '2.500' },
                        { value: 3, label: '3.000' }
                      ]}
                      sx={{
                        color: getScoreColor(formData.average_score),
                        height: 8,
                        '& .MuiSlider-track': {
                          border: 'none',
                          background: `linear-gradient(90deg, ${getScoreColor(formData.average_score)}80, ${getScoreColor(formData.average_score)})`
                        },
                        '& .MuiSlider-thumb': {
                          backgroundColor: getScoreColor(formData.average_score),
                          width: 20,
                          height: 20,
                          '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                            boxShadow: `0 0 0 8px ${getScoreColor(formData.average_score)}32`
                          }
                        },
                        '& .MuiSlider-markLabel': {
                          fontSize: '0.75rem',
                          color: '#7b809a'
                        },
                        '& .MuiSlider-mark': {
                          backgroundColor: '#bfbfbf',
                          height: 8,
                          width: 2,
                          '&.MuiSlider-markActive': {
                            backgroundColor: getScoreColor(formData.average_score)
                          }
                        }
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Test Cases */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="Total Test Cases"
              type="number"
              value={formData.total_test_cases}
              onChange={handleInputChange('total_test_cases')}
              error={!!validationErrors.total_test_cases}
              helperText={validationErrors.total_test_cases}
              inputProps={{ min: 1 }}
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
                '& .MuiOutlinedInput-input': {
                  color: '#344767',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Total number of test cases evaluated">
                      <InfoIcon sx={{ color: '#7b809a', fontSize: 18 }} />
                    </Tooltip>
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="Test Date"
              type="date"
              value={formData.test_date}
              onChange={handleInputChange('test_date')}
              InputLabelProps={{ shrink: true }}
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
                '& .MuiOutlinedInput-input': {
                  color: '#344767',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                },
              }}
            />
          </Grid>

          {/* Test Case Changes */}
          <Grid item xs={12}>
            <Box sx={{ 
              border: '1px solid rgba(0,0,0,0.08)', 
              borderRadius: '1rem', 
              p: 3,
              background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(250,250,255,0.95) 100%)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <TrendingUpIcon sx={{ color: '#2196f3', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#344767' }}>
                  Test Case Changes
                </Typography>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.test_cases_changed ?? false}
                    onChange={handleSwitchChange('test_cases_changed')}
                    sx={{
                      '& .MuiSwitch-switchBase': {
                        '&.Mui-checked': {
                          color: '#1976d2',
                          '& + .MuiSwitch-track': {
                            background: 'linear-gradient(90deg, rgba(25,118,210,0.8) 0%, rgba(66,165,245,0.8) 100%)',
                            opacity: 1,
                            border: 0,
                          },
                        },
                      },
                      '& .MuiSwitch-track': {
                        borderRadius: 13,
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        opacity: 1,
                        transition: 'background-color 200ms',
                      },
                      '& .MuiSwitch-thumb': {
                        boxShadow: '0 2px 4px 0 rgba(35,57,66,0.3)',
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        transition: 'all 200ms',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: '#344767', fontSize: '0.875rem', fontWeight: 500 }}>
                    Test cases changed compared to previous version
                  </Typography>
                }
                sx={{ mb: formData.test_cases_changed ? 3 : 0 }}
              />

              {formData.test_cases_changed && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Change Percentage"
                      type="number"
                      value={formData.change_percentage}
                      onChange={handleInputChange('change_percentage')}
                      error={!!validationErrors.change_percentage}
                      helperText={validationErrors.change_percentage}
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
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
                        '& .MuiOutlinedInput-input': {
                          color: '#344767',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                        },
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end" sx={{ color: '#7b809a' }}>
                            %
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                </Grid>
              )}
            </Box>
          </Grid>

          {/* Critical Issues */}
          <Grid item xs={12}>
            <Box sx={{ 
              border: '1px solid rgba(244,67,54,0.1)', 
              borderRadius: '1rem', 
              p: 3,
              background: formData.has_one_point_case 
                ? 'linear-gradient(145deg, rgba(255,245,245,0.9) 0%, rgba(255,235,238,0.95) 100%)'
                : 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(250,250,255,0.95) 100%)',
              boxShadow: formData.has_one_point_case 
                ? '0 2px 4px rgba(244,67,54,0.1)' 
                : '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.3s ease'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <WarningIcon sx={{ color: '#f44336', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#344767' }}>
                  Critical Issues Detection
                </Typography>
                {formData.has_one_point_case && (
                  <Chip 
                    label="CRITICAL" 
                    size="small" 
                    sx={{ 
                      backgroundColor: '#f44336', 
                      color: 'white', 
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }} 
                  />
                )}
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.has_one_point_case ?? false}
                    onChange={handleSwitchChange('has_one_point_case')}
                    sx={{
                      '& .MuiSwitch-switchBase': {
                        '&.Mui-checked': {
                          color: '#f44336',
                          '& + .MuiSwitch-track': {
                            background: 'linear-gradient(90deg, rgba(244,67,54,0.8) 0%, rgba(239,83,80,0.8) 100%)',
                            opacity: 1,
                            border: 0,
                          },
                        },
                      },
                      '& .MuiSwitch-track': {
                        borderRadius: 13,
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        opacity: 1,
                        transition: 'background-color 200ms',
                      },
                      '& .MuiSwitch-thumb': {
                        boxShadow: '0 2px 4px 0 rgba(35,57,66,0.3)',
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        transition: 'all 200ms',
                      },
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 0.5 }}>
                    <Typography sx={{ color: '#344767', fontSize: '0.875rem', fontWeight: 500 }}>
                      Has test cases with score 1 (critical issues)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#7b809a', fontSize: '0.75rem' }}>
                      Enable if any test case received the lowest possible score (1 point)
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Notes"
              value={formData.notes}
              onChange={handleInputChange('notes')}
              placeholder="Add any additional notes about the test results, specific issues found, or recommendations for improvement..."
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
                '& .MuiOutlinedInput-input': {
                  color: '#344767',
                  fontSize: '0.875rem',
                  fontWeight: 400,
                  lineHeight: 1.6,
                },
                '& .MuiInputBase-inputMultiline': {
                  padding: '12px 14px',
                },
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        borderTop: '1px solid rgba(0,0,0,0.05)',
        gap: 1
      }}>
        <Button
          onClick={onClose}
          startIcon={<CancelIcon />}
          disabled={submitting}
          sx={{
            borderColor: '#67748e',
            color: '#67748e',
            borderRadius: '0.5rem',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.5,
            fontSize: '0.875rem',
            '&:hover': {
              borderColor: '#5a6479',
              backgroundColor: 'rgba(103,116,142,0.08)',
            }
          }}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          startIcon={<SaveIcon />}
          disabled={submitting}
          sx={{
            background: 'linear-gradient(90deg, rgba(94,114,228,1) 0%, rgba(130,94,228,1) 100%)',
            boxShadow: '0 3px 5px -1px rgba(94,114,228,.2), 0 6px 10px 0 rgba(94,114,228,.14), 0 1px 18px 0 rgba(94,114,228,.12)',
            borderRadius: '0.5rem',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.5,
            fontSize: '0.875rem',
            '&:hover': {
              background: 'linear-gradient(90deg, rgba(84,104,218,1) 0%, rgba(120,84,218,1) 100%)',
            },
            '&:disabled': {
              background: 'rgba(0,0,0,0.12)',
              color: 'rgba(0,0,0,0.26)',
            }
          }}
        >
          {submitting ? 'Saving...' : (mode === 'create' ? 'Add Result' : 'Update Result')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SQEResultForm; 