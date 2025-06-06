import React, { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  IconButton,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Description as FileIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
  FolderOpen as FolderIcon
} from '@mui/icons-material';
import { ModelVersion, ModelVersionCreate, ModelVersionUpdate, LanguagePair } from '../../types';
import * as modelVersionService from '../../services/modelVersionService';
import * as api from '../../services/api';

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
  
  // Language pairs state
  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [loadingLanguagePairs, setLoadingLanguagePairs] = useState(false);
  
  // Finetuned model files
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [hparamsFile, setHparamsFile] = useState<File | null>(null);
  
  // Base model files
  const [baseModelFile, setBaseModelFile] = useState<File | null>(null);
  const [baseHparamsFile, setBaseHparamsFile] = useState<File | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch language pairs when dialog opens and reset form
  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        fetchLanguagePairs();
        // Reset form for create mode
        setFormData({
          version_name: '',
          description: '',
          release_date: '',
          lang_pair_id: langPairId
        });
      } else if (mode === 'edit' && modelVersion) {
        // Set form data for edit mode
        setFormData({
          version_name: modelVersion.version_name,
          description: modelVersion.description || '',
          release_date: modelVersion.release_date || '',
          lang_pair_id: modelVersion.lang_pair_id
        });
      }
      // Clear errors
      setErrors({});
      // Clear files
      setModelFile(null);
      setHparamsFile(null);
      setBaseModelFile(null);
      setBaseHparamsFile(null);
    }
  }, [open, mode, langPairId, modelVersion]);

  const fetchLanguagePairs = async () => {
    setLoadingLanguagePairs(true);
    try {
      const pairs = await api.getLanguagePairs();
      setLanguagePairs(pairs);
    } catch (error) {
      console.error('Error fetching language pairs:', error);
      setErrors(prev => ({ ...prev, lang_pair_id: 'Failed to load language pairs' }));
    } finally {
      setLoadingLanguagePairs(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when field is changed
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleLanguagePairChange = (event: SelectChangeEvent<number>) => {
    const value = event.target.value as number;
    setFormData({ ...formData, lang_pair_id: value });
    // Clear error when field is changed
    if (errors.lang_pair_id) {
      setErrors({ ...errors, lang_pair_id: '' });
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

  const removeFile = (fileType: 'model' | 'hparams' | 'base_model' | 'base_hparams') => {
    switch (fileType) {
      case 'model':
        setModelFile(null);
        break;
      case 'hparams':
        setHparamsFile(null);
        break;
      case 'base_model':
        setBaseModelFile(null);
        break;
      case 'base_hparams':
        setBaseHparamsFile(null);
        break;
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

  const FileUploadBox = ({ 
    label, 
    fileType, 
    accept, 
    currentFile, 
    selectedFile,
    avatarColor
  }: { 
    label: string;
    fileType: 'model' | 'hparams' | 'base_model' | 'base_hparams';
    accept: string;
    currentFile?: string | null;
    selectedFile: File | null;
    avatarColor?: string;
  }) => (
    <Card 
      sx={{ 
        height: '100%',
        borderRadius: 3,
        border: '1px solid',
        borderColor: selectedFile ? 'success.300' : currentFile ? 'info.300' : 'grey.300',
        boxShadow: selectedFile || currentFile ? 2 : 1,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ 
            background: avatarColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            width: 32,
            height: 32,
            mr: 2
          }}>
            <FolderIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
        
        {selectedFile ? (
          <Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 2,
              p: 2,
              backgroundColor: '#e8f5e8',
              borderRadius: 2,
              border: '1px solid #4caf50'
            }}>
              <Avatar sx={{ width: 24, height: 24, backgroundColor: 'success.main', mr: 1.5 }}>
                <FileIcon sx={{ fontSize: 14 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.dark' }}>
                  New File Selected
                </Typography>
                <Typography variant="body2" sx={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  fontSize: '0.8rem',
                  color: 'text.secondary'
                }}>
                  {selectedFile.name}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => removeFile(fileType)}
                sx={{ color: 'error.main' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            
            <Chip 
              label="File Ready for Upload" 
              color="success" 
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>
        ) : (
          <>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadIcon />}
              fullWidth
              sx={{ 
                borderStyle: 'dashed',
                borderColor: 'grey.400',
                color: 'text.secondary',
                borderRadius: 2,
                py: 2,
                mb: 2,
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'primary.50'
                }
              }}
            >
              Choose File
              <input
                type="file"
                hidden
                onChange={(e) => handleFileChange(e, fileType)}
                accept={accept}
              />
            </Button>
            
            {currentFile && (
              <Box sx={{ 
                p: 2,
                backgroundColor: '#f0f8ff',
                borderRadius: 2,
                border: '1px solid #2196f3'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ width: 20, height: 20, backgroundColor: 'info.main', mr: 1 }}>
                    <FileIcon sx={{ fontSize: 12 }} />
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.dark' }}>
                    Current File
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ 
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace'
                }}>
                  {currentFile}
                </Typography>
              </Box>
            )}
            
            {!currentFile && (
              <Box sx={{ 
                textAlign: 'center',
                py: 2,
                color: 'text.secondary'
              }}>
                <Typography variant="body2">
                  No file uploaded
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

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
        gap: 2,
        p: 3
      }}>
        <Avatar sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
          {mode === 'create' ? <AddIcon /> : <SettingsIcon />}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {mode === 'create' ? 'Create New Model Version' : 'Edit Model Version'}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {mode === 'create' ? 'Add a new model version with files' : 'Update model version details and files'}
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          disabled={isSubmitting}
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
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ m: 3, borderRadius: 2 }}>
            Please fix the following errors: {Object.values(errors).join(', ')}
          </Alert>
        )}

        {/* Basic Information */}
        <Card sx={{ m: 3, borderRadius: 3, border: '1px solid #e9ecef' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ 
                background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                mr: 2
              }}>
                <SettingsIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Basic Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure model version details and metadata
                </Typography>
              </Box>
            </Box>
            
            <Grid container spacing={3}>
              {mode === 'create' && (
                <Grid item xs={12}>
                  <FormControl 
                    fullWidth 
                    error={!!errors.lang_pair_id}
                    variant="outlined"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    <InputLabel id="language-pair-label">Language Pair *</InputLabel>
                    <Select
                      labelId="language-pair-label"
                      value={formData.lang_pair_id || ''}
                      onChange={handleLanguagePairChange}
                      label="Language Pair *"
                      disabled={loadingLanguagePairs}
                    >
                      {languagePairs.map((pair) => (
                        <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={pair.source_language_code.toUpperCase()} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                            <Typography>→</Typography>
                            <Chip 
                              label={pair.target_language_code.toUpperCase()} 
                              size="small" 
                              color="secondary" 
                              variant="outlined"
                            />
                            {pair.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                ({pair.description})
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.lang_pair_id && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                        {errors.lang_pair_id}
                      </Typography>
                    )}
                    {loadingLanguagePairs && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 2 }}>
                        Loading language pairs...
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              )}
              
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
                  variant="outlined"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                  variant="outlined"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                  variant="outlined"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Finetuned Model Files */}
        <Card sx={{ m: 3, borderRadius: 3, border: '1px solid #e9ecef' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                mr: 2
              }}>
                <AssessmentIcon />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Finetuned Model Files
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload optimized model files (GRPO + ORPO)
                </Typography>
              </Box>
              <Chip 
                label="GRPO + ORPO" 
                size="small" 
                color="primary" 
                sx={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}
              />
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FileUploadBox
                  label="Model File"
                  fileType="model"
                  accept=".bin,.model"
                  currentFile={modelVersion?.model_file_name}
                  selectedFile={modelFile}
                  avatarColor="linear-gradient(135deg, #28a745 0%, #20c997 100%)"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FileUploadBox
                  label="HParams File"
                  fileType="hparams"
                  accept=".json"
                  currentFile={modelVersion?.hparams_file_name}
                  selectedFile={hparamsFile}
                  avatarColor="linear-gradient(135deg, #17a2b8 0%, #138496 100%)"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Base Model Files */}
        <Card sx={{ m: 3, borderRadius: 3, border: '1px solid #e9ecef' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ 
                background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                mr: 2
              }}>
                <ScienceIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Base Model Files
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload base model files for evaluation comparison
                </Typography>
              </Box>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FileUploadBox
                  label="Base Model File"
                  fileType="base_model"
                  accept=".bin,.model"
                  currentFile={modelVersion?.base_model_file_name}
                  selectedFile={baseModelFile}
                  avatarColor="linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%)"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FileUploadBox
                  label="Base HParams File"
                  fileType="base_hparams"
                  accept=".json"
                  currentFile={modelVersion?.base_hparams_file_name}
                  selectedFile={baseHparamsFile}
                  avatarColor="linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)"
                />
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
          disabled={isSubmitting}
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
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : (mode === 'create' ? <AddIcon /> : <SettingsIcon />)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              transform: 'translateY(-1px)',
              boxShadow: 4
            },
            '&:disabled': {
              background: '#e9ecef',
              color: '#6c757d'
            }
          }}
        >
          {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Create' : 'Update')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ModelVersionForm; 