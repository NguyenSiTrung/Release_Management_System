import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
  Box,
  SelectChangeEvent,
  TextField,
  FormHelperText,
  Grid,

  Card,
  CardContent,
  Avatar,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,

  Settings as SettingsIcon,
  DataUsage as DataUsageIcon,
  Science as ScienceIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Testset, ModelVersion } from '../../types';
import { runEvaluation } from '../../services/evaluationService';
import { getTestsets } from '../../services/testsetService';

interface EvaluationStartProps {
  open: boolean;
  onClose: () => void;
  versionId: number;
  langPairId: number;
  modelVersion?: ModelVersion;
  onEvaluationStarted: (jobId: number) => void;
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

// Define available model types
const MODEL_TYPES = [
  { value: "finetuned", label: "Finetuned Model (GRPO+ORPO)" },
  { value: "base", label: "Base Model" },
  { value: "both", label: "Both Models (for comparison)" }
];

const EvaluationStart: React.FC<EvaluationStartProps> = ({
  open,
  onClose,
  versionId,
  langPairId,
  modelVersion,
  onEvaluationStarted
}) => {
  const [testsets, setTestsets] = useState<Testset[]>([]);
  const [selectedTestset, setSelectedTestset] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addToDetails, setAddToDetails] = useState(true);
  const [modeType, setModeType] = useState<string>("Interpreter Listening Mode");
  const [subModeType, setSubModeType] = useState<string>('plain');
  const [customParams, setCustomParams] = useState<string>('');
  const [modelType, setModelType] = useState<'base' | 'finetuned' | 'both'>('finetuned');
  
  // Check if base model files are available
  const hasBaseModelFiles = !!(modelVersion?.base_model_file_name && modelVersion?.base_hparams_file_name);
  const hasFinetunedModelFiles = !!(modelVersion?.model_file_name && modelVersion?.hparams_file_name);

  useEffect(() => {
    const fetchTestsets = async () => {
      try {
        const data = await getTestsets(langPairId);
        setTestsets(data);
        if (data.length > 0) {
          setSelectedTestset(data[0].testset_id);
        }
      } catch (err) {
        console.error('Failed to fetch testsets:', err);
        setError('Failed to load testsets. Please try again.');
      }
    };

    if (open) {
      fetchTestsets();
    }
  }, [open, langPairId]);

  const handleTestsetChange = (event: SelectChangeEvent<number | string>) => {
    setSelectedTestset(event.target.value as number);
  };

  const handleModeTypeChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setModeType(value);
    
    // Reset sub-mode when mode type changes
    if (value !== "Samsung Note Mode" && value !== "Samsung Internet Mode") {
      setSubModeType('plain');
    }
    
    // Reset custom params when changing away from Custom mode
    if (value !== "Custom") {
      setCustomParams('');
    }
  };

  const handleSubModeTypeChange = (event: SelectChangeEvent<string>) => {
    setSubModeType(event.target.value);
  };

  const handleModelTypeChange = (event: SelectChangeEvent<string>) => {
    setModelType(event.target.value as 'base' | 'finetuned' | 'both');
    
    // No longer forcing add to details when selecting "both"
  };

  const handleSubmit = async () => {
    if (!selectedTestset) {
      setError('Please select a testset');
      return;
    }
    
    // Validate model type selection based on available model files
    if (modelType === 'base' && !hasBaseModelFiles) {
      setError('Base model files are not available for this model version');
      return;
    }
    
    if (modelType === 'finetuned' && !hasFinetunedModelFiles) {
      setError('Finetuned model files are not available for this model version');
      return;
    }
    
    if (modelType === 'both' && (!hasBaseModelFiles || !hasFinetunedModelFiles)) {
      setError('Both base and finetuned model files are required for comparison evaluation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await runEvaluation({
        version_id: versionId,
        testset_id: selectedTestset as number,
        auto_add_to_details: addToDetails,
        mode_type: modeType || undefined,
        sub_mode_type: subModeType || undefined,
        custom_params: modeType === 'Custom' ? customParams : undefined,
        evaluation_model_type: modelType
      });

      onEvaluationStarted(response.job_id);
      onClose();
    } catch (err) {
      console.error('Failed to start evaluation:', err);
      setError('Failed to start evaluation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 4
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid #e9ecef',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <Avatar sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
          <PlayArrowIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Start Model Evaluation
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Configure and launch evaluation on testsets
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          sx={{ 
            color: 'white',
            minWidth: 'auto',
            p: 1,
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
          }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ m: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Testset Selection Section */}
        <Card sx={{ m: 3, borderRadius: 3, border: '1px solid #e9ecef' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ 
                background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                mr: 2
              }}>
                <DataUsageIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Testset Selection
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose the dataset for evaluation
                </Typography>
              </Box>
            </Box>
            
            <FormControl fullWidth required>
              <InputLabel id="testset-select-label">Testset</InputLabel>
              <Select
                labelId="testset-select-label"
                id="testset-select"
                value={selectedTestset}
                label="Testset"
                onChange={handleTestsetChange}
                disabled={loading || testsets.length === 0}
                sx={{ borderRadius: 2 }}
              >
                {testsets.map((testset) => (
                  <MenuItem key={testset.testset_id} value={testset.testset_id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, backgroundColor: 'primary.main', fontSize: '0.7rem' }}>
                        {testset.testset_name.charAt(0).toUpperCase()}
                      </Avatar>
                      {testset.testset_name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {testsets.length === 0 && (
                <FormHelperText error>No testsets available for this language pair</FormHelperText>
              )}
            </FormControl>
          </CardContent>
        </Card>

        {/* Model Selection Section */}
        <Card sx={{ m: 3, borderRadius: 3, border: '1px solid #e9ecef' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ 
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                mr: 2
              }}>
                <ScienceIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Model Selection
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select which model(s) to evaluate
                </Typography>
              </Box>
            </Box>
            
            <FormControl fullWidth>
              <InputLabel id="model-type-select-label">Model Type</InputLabel>
              <Select
                labelId="model-type-select-label"
                id="model-type-select"
                value={modelType}
                label="Model Type"
                onChange={handleModelTypeChange}
                disabled={loading}
                sx={{ borderRadius: 2 }}
              >
                {MODEL_TYPES.map((type) => (
                  <MenuItem 
                    key={type.value} 
                    value={type.value}
                    disabled={
                      (type.value === 'base' && !hasBaseModelFiles) ||
                      (type.value === 'both' && (!hasBaseModelFiles || !hasFinetunedModelFiles))
                    }
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Chip
                        size="small"
                        label={type.value.toUpperCase()}
                        color={
                          type.value === 'both' ? 'secondary' :
                          type.value === 'base' ? 'info' : 'primary'
                        }
                        sx={{ minWidth: 80 }}
                      />
                      <Typography variant="body2">
                        {type.label}
                        {type.value === 'base' && !hasBaseModelFiles && ' (files not available)'}
                        {type.value === 'both' && (!hasBaseModelFiles || !hasFinetunedModelFiles) && ' (files not available)'}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {modelType === 'both' 
                  ? 'Will evaluate both models and allow comparison of results' 
                  : 'Select which model to evaluate'}
              </FormHelperText>
            </FormControl>
          </CardContent>
        </Card>

        {/* Evaluation Configuration Section */}
        <Card sx={{ m: 3, borderRadius: 3, border: '1px solid #e9ecef' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ 
                background: 'linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%)',
                mr: 2
              }}>
                <SettingsIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Evaluation Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure evaluation parameters and options
                </Typography>
              </Box>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="mode-type-select-label">Mode Type</InputLabel>
                  <Select
                    labelId="mode-type-select-label"
                    id="mode-type-select"
                    value={modeType}
                    label="Mode Type"
                    onChange={handleModeTypeChange}
                    disabled={loading}
                    sx={{ borderRadius: 2 }}
                  >
                    {MODE_TYPES.map((mode) => (
                      <MenuItem key={mode} value={mode}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, backgroundColor: 'warning.main', fontSize: '0.6rem' }}>
                            {mode.charAt(0)}
                          </Avatar>
                          {mode}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Select the evaluation mode type</FormHelperText>
                </FormControl>
              </Grid>
              
              {(modeType === "Samsung Note Mode" || modeType === "Samsung Internet Mode") && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="sub-mode-type-select-label">Sub-Mode Type</InputLabel>
                    <Select
                      labelId="sub-mode-type-select-label"
                      id="sub-mode-type-select"
                      value={subModeType}
                      label="Sub-Mode Type"
                      onChange={handleSubModeTypeChange}
                      disabled={loading}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="plain">
                        <Chip label="PLAIN" size="small" color="primary" sx={{ mr: 1 }} />
                        Plain
                      </MenuItem>
                      <MenuItem value="tagged">
                        <Chip label="TAGGED" size="small" color="secondary" sx={{ mr: 1 }} />
                        Tagged
                      </MenuItem>
                    </Select>
                    <FormHelperText>Select the sub-mode type</FormHelperText>
                  </FormControl>
                </Grid>
              )}
              
              {modeType === "Custom" && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Custom Parameters"
                    value={customParams}
                    onChange={(e) => setCustomParams(e.target.value)}
                    disabled={loading}
                    multiline
                    rows={3}
                    placeholder="e.g. --tm-on -nsp -f -m plain"
                    helperText="Enter custom parameters for the Docker command"
                    sx={{ 
                      '& .MuiOutlinedInput-root': { borderRadius: 2 },
                      '& .MuiInputBase-input': { fontFamily: 'monospace' }
                    }}
                  />
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Card sx={{ backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={addToDetails}
                          onChange={(e) => setAddToDetails(e.target.checked)}
                          disabled={loading}
                          sx={{
                            '&.Mui-checked': {
                              color: '#28a745'
                            }
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Add results to training details
                          </Typography>
                          {modelType === 'both' && (
                            <Typography variant="caption" color="text.secondary">
                              When checked, results will be added to Training Results section
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </DialogContent>
      
      <DialogActions sx={{ 
        borderTop: '1px solid #e9ecef', 
        p: 3,
        backgroundColor: '#f8f9fa'
      }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          variant="outlined"
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={loading || !selectedTestset}
          startIcon={loading ? <CircularProgress size={16} /> : <PlayArrowIcon />}
          sx={{
            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #218838 0%, #1e7e34 100%)',
              transform: 'translateY(-1px)',
              boxShadow: 4
            },
            '&:disabled': {
              background: '#e9ecef',
              color: '#6c757d'
            }
          }}
        >
          {loading ? 'Starting...' : 'Start Evaluation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EvaluationStart; 