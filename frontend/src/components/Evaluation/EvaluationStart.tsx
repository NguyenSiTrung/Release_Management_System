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
  Divider
} from '@mui/material';
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Start Evaluation</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel id="testset-select-label">Testset</InputLabel>
              <Select
                labelId="testset-select-label"
                id="testset-select"
                value={selectedTestset}
                label="Testset"
                onChange={handleTestsetChange}
                disabled={loading || testsets.length === 0}
              >
                {testsets.map((testset) => (
                  <MenuItem key={testset.testset_id} value={testset.testset_id}>
                    {testset.testset_name}
                  </MenuItem>
                ))}
              </Select>
              {testsets.length === 0 && (
                <FormHelperText>No testsets available for this language pair</FormHelperText>
              )}
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Model Selection
              </Typography>
            </Divider>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="model-type-select-label">Model Type</InputLabel>
              <Select
                labelId="model-type-select-label"
                id="model-type-select"
                value={modelType}
                label="Model Type"
                onChange={handleModelTypeChange}
                disabled={loading}
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
                    {type.label}
                    {type.value === 'base' && !hasBaseModelFiles && ' (files not available)'}
                    {type.value === 'both' && (!hasBaseModelFiles || !hasFinetunedModelFiles) && ' (files not available)'}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {modelType === 'both' 
                  ? 'Will evaluate both models and allow comparison of results' 
                  : 'Select which model to evaluate'}
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Evaluation Mode
              </Typography>
            </Divider>
          </Grid>
          
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
              >
                {MODE_TYPES.map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {mode}
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
                >
                  <MenuItem value="plain">Plain</MenuItem>
                  <MenuItem value="tagged">Tagged</MenuItem>
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
                placeholder="e.g. --tm-on -nsp -f -m plain"
                helperText="Enter custom parameters for the Docker command"
              />
            </Grid>
          )}
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={addToDetails}
                  onChange={(e) => setAddToDetails(e.target.checked)}
                  disabled={loading}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">
                    Add results to training details
                  </Typography>
                  {modelType === 'both' && (
                    <Typography variant="caption" color="text.secondary">
                      (When checked, results will be added to Training Results)
                    </Typography>
                  )}
                </Box>
              }
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading || !selectedTestset}
        >
          {loading ? 'Starting...' : 'Start Evaluation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EvaluationStart; 