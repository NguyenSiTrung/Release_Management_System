import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import { ModelVersion, ModelVersionCreate, ModelVersionUpdate } from '../../types';
import * as modelVersionService from '../../services/modelVersionService';

interface ModelVersionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  langPairId?: number;
  modelVersion?: ModelVersion;
}

const ModelVersionForm: React.FC<ModelVersionFormProps> = ({
  open,
  onClose,
  onSuccess,
  mode,
  langPairId,
  modelVersion
}) => {
  const [formData, setFormData] = useState<Partial<ModelVersionCreate & ModelVersionUpdate>>(
    mode === 'edit' && modelVersion
      ? {
          version_name: modelVersion.version_name,
          description: modelVersion.description || '',
          release_date: modelVersion.release_date || '',
          lang_pair_id: modelVersion.lang_pair_id
        }
      : {
          version_name: '',
          description: '',
          release_date: '',
          lang_pair_id: langPairId
        }
  );
  
  // Finetuned model files
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [hparamsFile, setHparamsFile] = useState<File | null>(null);
  
  // Base model files
  const [baseModelFile, setBaseModelFile] = useState<File | null>(null);
  const [baseHparamsFile, setBaseHparamsFile] = useState<File | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when field is changed
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    fileType: 'model' | 'hparams' | 'base_model' | 'base_hparams'
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      switch (fileType) {
        case 'model':
          setModelFile(file);
          break;
        case 'hparams':
          setHparamsFile(file);
          break;
        case 'base_model':
          setBaseModelFile(file);
          break;
        case 'base_hparams':
          setBaseHparamsFile(file);
          break;
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.version_name) {
      newErrors.version_name = 'Version name is required';
    }
    
    if (mode === 'create' && !formData.lang_pair_id) {
      newErrors.lang_pair_id = 'Language pair is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      console.log('Submitting form data:', formData);
      
      // Debug trực tiếp từ form
      console.log('Testing direct FormData creation:');
      const debugFormData = new FormData();
      debugFormData.append('lang_pair_id', String(formData.lang_pair_id));
      debugFormData.append('version_name', String(formData.version_name));
      if (formData.release_date) {
        debugFormData.append('release_date', String(formData.release_date));
      }
      if (formData.description) {
        debugFormData.append('description', String(formData.description));
      }
      debugFormData.append('data', JSON.stringify(formData));
      
      // Log FormData entries
      console.log('Debug FormData entries:');
      for (const pair of Array.from(debugFormData.entries())) {
        console.log(`${pair[0]}: ${pair[1]}`);
      }
      
      if (mode === 'create') {
        console.log('Creating new model version with:', formData);
        await modelVersionService.createModelVersion(
          formData as ModelVersionCreate,
          modelFile || undefined,
          hparamsFile || undefined,
          baseModelFile || undefined,
          baseHparamsFile || undefined
        );
      } else if (mode === 'edit' && modelVersion) {
        console.log('Updating model version with:', formData);
        await modelVersionService.updateModelVersion(
          modelVersion.version_id,
          formData as Partial<ModelVersionUpdate>,
          modelFile || undefined,
          hparamsFile || undefined,
          baseModelFile || undefined,
          baseHparamsFile || undefined
        );
      }
      
      onSuccess();
    } catch (err: any) {
      console.error('Error submitting model version:', err);
      
      // Detailed error handling
      let errorMessage = 'Failed to submit model version';
      
      if (err.response) {
        console.log('Error response:', err.response);
        // Server responded with error
        if (err.response.data && err.response.data.detail) {
          errorMessage = `Server error: ${err.response.data.detail}`;
        } else if (err.response.status) {
          errorMessage = `Server returned status ${err.response.status}`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Check network connection.';
      } else if (err.message) {
        // Error with request setup
        errorMessage = `Request error: ${err.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Create New Model Version' : 'Edit Model Version'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Version Name"
              name="version_name"
              value={formData.version_name}
              onChange={handleChange}
              error={!!errors.version_name}
              helperText={errors.version_name}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Release Date"
              name="release_date"
              type="date"
              value={formData.release_date}
              onChange={handleChange}
              error={!!errors.release_date}
              helperText={errors.release_date || "Format: YYYY-MM-DD"}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="h6">
                Finetuned Model Files (GRPO + ORPO)
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              Model File
            </Typography>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, 'model')}
              accept=".bin,.model"
            />
            {modelVersion?.model_file_name && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Current file: {modelVersion.model_file_name}
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              HParams File
            </Typography>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, 'hparams')}
              accept=".json"
            />
            {modelVersion?.hparams_file_name && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Current file: {modelVersion.hparams_file_name}
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="h6">
                Base Model Files (Optional)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload the base model files to enable evaluation comparison between base and finetuned models
              </Typography>
              <Divider sx={{ mb: 2, mt: 1 }} />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              Base Model File
            </Typography>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, 'base_model')}
              accept=".bin,.model"
            />
            {modelVersion?.base_model_file_name && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Current file: {modelVersion.base_model_file_name}
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              Base HParams File
            </Typography>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, 'base_hparams')}
              accept=".json"
            />
            {modelVersion?.base_hparams_file_name && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Current file: {modelVersion.base_hparams_file_name}
              </Typography>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Create' : 'Update')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ModelVersionForm; 