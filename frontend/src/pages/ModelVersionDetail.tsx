import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  IconButton,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Container,
  Chip,
  CircularProgress,
  Avatar,
  Stack,

} from '@mui/material';
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  Code as CodeIcon,
  CalendarToday as CalendarIcon,
  Language as LanguageIcon,
  Assessment as AssessmentIcon,
  Article as ArticleIcon,
  Close as CloseIcon,
  Analytics as AnalyticsIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  getModelVersion,
  getLanguagePair,
  getTrainingResults,
  createTrainingResult,
  updateTrainingResult,
  deleteTrainingResult,
  getReleaseNote,
  createReleaseNote,
  updateReleaseNote,
  getTestsets,
} from '../services/api';
import { ModelVersion, LanguagePair, TrainingResult, ReleaseNote, Testset } from '../types';
import ErrorDisplay from '../components/common/ErrorDisplay';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ModelVersionForm from '../components/ModelVersion/ModelVersionForm';
import ModelVersionDetailsTabs from '../components/ModelVersion/ModelVersionDetailsTabs';



// Validation schema for training result form
const trainingResultSchema = Yup.object({
  testset_id: Yup.number().required('Testset is required'),
  base_model_bleu: Yup.number().nullable().min(0, 'Must be greater than or equal to 0').max(100, 'Must be less than or equal to 100'),
  base_model_comet: Yup.number().nullable().min(-1, 'Must be greater than or equal to -1').max(1, 'Must be less than or equal to 1'),
  finetuned_model_bleu: Yup.number().nullable().min(0, 'Must be greater than or equal to 0').max(100, 'Must be less than or equal to 100'),
  finetuned_model_comet: Yup.number().nullable().min(-1, 'Must be greater than or equal to -1').max(1, 'Must be less than or equal to 1'),
  training_details_notes: Yup.string(),
});

// Validation schema for release note form
const releaseNoteSchema = Yup.object({
  title: Yup.string(),
  content: Yup.string(),
});

const ModelVersionDetailPage: React.FC = () => {
  const { versionId } = useParams<{ versionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [modelVersion, setModelVersion] = useState<ModelVersion | null>(null);
  const [languagePair, setLanguagePair] = useState<LanguagePair | null>(null);
  const [trainingResults, setTrainingResults] = useState<TrainingResult[]>([]);
  const [releaseNote, setReleaseNote] = useState<ReleaseNote | null>(null);
  const [testsets, setTestsets] = useState<Testset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [openTrainingDialog, setOpenTrainingDialog] = useState(false);
  const [trainingDialogMode, setTrainingDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedTrainingResult, setSelectedTrainingResult] = useState<TrainingResult | null>(null);

  const [openReleaseNoteDialog, setOpenReleaseNoteDialog] = useState(false);
  
  // Confirm dialog state
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [resultToDelete, setResultToDelete] = useState<TrainingResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchModelVersionData = useCallback(async () => {
    if (!versionId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch model version
      const versionData = await getModelVersion(parseInt(versionId));
      setModelVersion(versionData);
      
      // Fetch language pair
      const langPairData = await getLanguagePair(versionData.lang_pair_id);
      setLanguagePair(langPairData);
      
      // Fetch training results
      const resultsData = await getTrainingResults(parseInt(versionId));
      setTrainingResults(resultsData);
      
      // Fetch release note
      try {
        const noteData = await getReleaseNote(parseInt(versionId));
        setReleaseNote(noteData);
      } catch (err) {
        // It's ok if there's no release note yet
        setReleaseNote(null);
      }
      
      // Fetch testsets for this language pair
      const testsetsResponse = await getTestsets(versionData.lang_pair_id, 1, 1000); // Get up to 1000 testsets
      setTestsets(testsetsResponse.items); // Extract items from paginated response
      
    } catch (err) {
      console.error('Error fetching model version data:', err);
      setError('Failed to load model version data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    fetchModelVersionData();
  }, [fetchModelVersionData]);

  // Clear location state after reading it
  useEffect(() => {
    if (location.state?.message) {
      // Replace the current state to avoid showing the message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Training Result form
  const trainingFormik = useFormik({
    initialValues: {
      testset_id: '',
      base_model_bleu: '',
      base_model_comet: '',
      finetuned_model_bleu: '',
      finetuned_model_comet: '',
      training_details_notes: '',
    },
    validationSchema: trainingResultSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      if (!versionId) return;
      
      try {
        const numericValues = {
          testset_id: Number(values.testset_id),
          base_model_bleu: values.base_model_bleu === '' ? undefined : Number(values.base_model_bleu),
          base_model_comet: values.base_model_comet === '' ? undefined : Number(values.base_model_comet),
          finetuned_model_bleu: values.finetuned_model_bleu === '' ? undefined : Number(values.finetuned_model_bleu),
          finetuned_model_comet: values.finetuned_model_comet === '' ? undefined : Number(values.finetuned_model_comet),
          training_details_notes: values.training_details_notes || undefined,
        };
        
        if (trainingDialogMode === 'create') {
          await createTrainingResult(parseInt(versionId), {
            ...numericValues,
            version_id: parseInt(versionId)
          });
        } else if (trainingDialogMode === 'edit' && selectedTrainingResult) {
          await updateTrainingResult(selectedTrainingResult.result_id, numericValues);
        }
        
        handleCloseTrainingDialog();
        resetForm();
        await fetchModelVersionData();
      } catch (err) {
        console.error('Error saving training result:', err);
        setError('Failed to save training result. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Release Note form
  const releaseNoteFormik = useFormik({
    initialValues: {
      title: '',
      content: '',
    },
    validationSchema: releaseNoteSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      if (!versionId) return;
      
      try {
        const versionIdNum = parseInt(versionId);
        if (releaseNote) {
          await updateReleaseNote(versionIdNum, values);
        } else {
          await createReleaseNote(versionIdNum, {
            version_id: versionIdNum,
            ...values
          });
        }
        
        handleCloseReleaseNoteDialog();
        await fetchModelVersionData();
      } catch (err) {
        console.error('Error saving release note:', err);
        setError('Failed to save release note. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Training Result Dialog Functions
  const handleOpenCreateTrainingDialog = () => {
    trainingFormik.resetForm();
    setTrainingDialogMode('create');
    setOpenTrainingDialog(true);
  };



  const handleCloseTrainingDialog = () => {
    setOpenTrainingDialog(false);
    setSelectedTrainingResult(null);
    trainingFormik.resetForm();
  };

  // Release Note Dialog Functions
  const handleOpenReleaseNoteDialog = () => {
    releaseNoteFormik.setValues({
      title: releaseNote?.title || '',
      content: releaseNote?.content || '',
    });
    setOpenReleaseNoteDialog(true);
  };

  const handleCloseReleaseNoteDialog = () => {
    setOpenReleaseNoteDialog(false);
    releaseNoteFormik.resetForm();
  };

  // Delete training result functions
  const handleDeleteTrainingResult = async () => {
    if (!resultToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteTrainingResult(resultToDelete.result_id);
      await fetchModelVersionData();
      setOpenConfirmDialog(false);
      setResultToDelete(null);
    } catch (err) {
      console.error('Error deleting training result:', err);
      setError('Failed to delete training result.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get testset name from id
  const getTestsetName = (testsetId: number) => {
    const testset = testsets.find(t => t.testset_id === testsetId);
    return testset ? testset.testset_name : 'Unknown Testset';
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    fetchModelVersionData();
  };

    if (isLoading) {
    return (
      <Box sx={{ 
        minHeight: '80vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography color="text.secondary">Loading model version details...</Typography>
        </Card>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        minHeight: '80vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        p: 3
      }}>
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 3, maxWidth: 500 }}>
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          <Button 
            variant="contained" 
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{
              background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            Back
          </Button>
        </Card>
      </Box>
    );
  }

  if (!modelVersion || !languagePair) {
    return (
      <ErrorDisplay 
        message="Model version not found or failed to load data." 
        onRetry={fetchModelVersionData} 
      />
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      pt: 3,
      pb: 6
    }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <Card sx={{ mb: 3, borderRadius: 3, overflow: 'visible' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <IconButton 
                onClick={handleBack} 
                sx={{ 
                  mr: 2,
                  backgroundColor: '#fff',
                  color: '#344767',
                  border: '1px solid #e3e6f0',
                  '&:hover': {
                    backgroundColor: '#f8f9fa',
                    borderColor: '#667eea',
                    color: '#667eea'
                  }
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Avatar sx={{ 
                    background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                    width: 40,
                    height: 40
                  }}>
                    <CodeIcon />
                  </Avatar>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {modelVersion.version_name}
                  </Typography>
                  <IconButton 
                    color="primary" 
                    onClick={handleEditClick} 
                    sx={{ 
                      background: 'rgba(102, 126, 234, 0.1)',
                      '&:hover': {
                        background: 'rgba(102, 126, 234, 0.2)',
                      }
                    }}
                    aria-label="edit model version"
                  >
                    <EditIcon />
                  </IconButton>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CodeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      ID: {modelVersion.version_id}
                    </Typography>
                  </Box>
                  
                  {modelVersion.release_date && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Released: {new Date(modelVersion.release_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                  
                  <Chip 
                    icon={<LanguageIcon />}
                    label={`${languagePair.source_language_code} → ${languagePair.target_language_code}`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Box>
            </Box>

            {modelVersion.description && (
              <Box sx={{ 
                mt: 3, 
                p: 3, 
                borderRadius: 2, 
                backgroundColor: 'grey.50',
                border: '1px solid',
                borderColor: 'grey.200'
              }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Description
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', color: 'text.secondary', lineHeight: 1.6 }}>
                  {modelVersion.description}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <ModelVersionDetailsTabs 
          modelVersion={modelVersion} 
          onRefresh={fetchModelVersionData}
          releaseNote={releaseNote}
          trainingResults={trainingResults}
          testsets={testsets}
          onAddTrainingResult={handleOpenCreateTrainingDialog}
          onEditReleaseNote={handleOpenReleaseNoteDialog}
        />
      </Container>

      {/* Training Result Dialog */}
      <Dialog 
        open={openTrainingDialog} 
        onClose={handleCloseTrainingDialog}
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: 4
          }
        }}
      >
        <form onSubmit={trainingFormik.handleSubmit}>
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 600,
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Avatar sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <AssessmentIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {trainingDialogMode === 'create' 
                  ? 'Add Training Result' 
                  : 'Edit Training Result'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {trainingDialogMode === 'create' 
                  ? 'Add BLEU and COMET scores for model evaluation'
                  : 'Update existing training results and scores'}
              </Typography>
            </Box>
            <Button
              onClick={handleCloseTrainingDialog}
              sx={{ 
                color: 'white', 
                minWidth: 'auto',
                p: 1,
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <CloseIcon />
            </Button>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {/* Testset Selection Section */}
            <Card sx={{ borderRadius: 2, boxShadow: 1, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ 
                    background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                    width: 40,
                    height: 40,
                    mr: 2
                  }}>
                    <AnalyticsIcon sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Testset Selection
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Choose the testset for evaluation metrics
                    </Typography>
                  </Box>
                </Box>
                
                <FormControl fullWidth error={
                  trainingFormik.touched.testset_id && 
                  Boolean(trainingFormik.errors.testset_id)
                }>
                  <InputLabel id="testset-label">Testset</InputLabel>
                  <Select
                    labelId="testset-label"
                    id="testset_id"
                    name="testset_id"
                    value={trainingFormik.values.testset_id}
                    onChange={trainingFormik.handleChange}
                    label="Testset"
                    disabled={trainingDialogMode === 'edit'}
                    sx={{ borderRadius: 2 }}
                  >
                    {testsets.map((testset) => (
                      <MenuItem key={testset.testset_id} value={testset.testset_id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, backgroundColor: 'info.main', fontSize: '0.7rem' }}>
                            {testset.testset_name.charAt(0).toUpperCase()}
                          </Avatar>
                          {testset.testset_name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>

            {/* Model Scores Section */}
            <Card sx={{ borderRadius: 2, boxShadow: 1, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ 
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    width: 40,
                    height: 40,
                    mr: 2
                  }}>
                    <AssessmentIcon sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Model Performance Scores
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enter BLEU and COMET scores for model comparison
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="base_model_bleu"
                      name="base_model_bleu"
                      label="Base Model BLEU"
                      type="number"
                      inputProps={{ step: 0.01, min: 0, max: 100 }}
                      value={trainingFormik.values.base_model_bleu}
                      onChange={trainingFormik.handleChange}
                      error={
                        trainingFormik.touched.base_model_bleu &&
                        Boolean(trainingFormik.errors.base_model_bleu)
                      }
                      helperText={
                        trainingFormik.touched.base_model_bleu &&
                        trainingFormik.errors.base_model_bleu
                      }
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="base_model_comet"
                      name="base_model_comet"
                      label="Base Model COMET"
                      type="number"
                      inputProps={{ step: 0.0001, min: -1, max: 1 }}
                      value={trainingFormik.values.base_model_comet}
                      onChange={trainingFormik.handleChange}
                      error={
                        trainingFormik.touched.base_model_comet &&
                        Boolean(trainingFormik.errors.base_model_comet)
                      }
                      helperText={
                        trainingFormik.touched.base_model_comet &&
                        trainingFormik.errors.base_model_comet
                      }
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="finetuned_model_bleu"
                      name="finetuned_model_bleu"
                      label="GRPO+ORPO BLEU"
                      type="number"
                      inputProps={{ step: 0.01, min: 0, max: 100 }}
                      value={trainingFormik.values.finetuned_model_bleu}
                      onChange={trainingFormik.handleChange}
                      error={
                        trainingFormik.touched.finetuned_model_bleu &&
                        Boolean(trainingFormik.errors.finetuned_model_bleu)
                      }
                      helperText={
                        trainingFormik.touched.finetuned_model_bleu &&
                        trainingFormik.errors.finetuned_model_bleu
                      }
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="finetuned_model_comet"
                      name="finetuned_model_comet"
                      label="GRPO+ORPO COMET"
                      type="number"
                      inputProps={{ step: 0.0001, min: -1, max: 1 }}
                      value={trainingFormik.values.finetuned_model_comet}
                      onChange={trainingFormik.handleChange}
                      error={
                        trainingFormik.touched.finetuned_model_comet &&
                        Boolean(trainingFormik.errors.finetuned_model_comet)
                      }
                      helperText={
                        trainingFormik.touched.finetuned_model_comet &&
                        trainingFormik.errors.finetuned_model_comet
                      }
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Training Notes Section */}
            <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ 
                    background: 'linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%)',
                    width: 40,
                    height: 40,
                    mr: 2
                  }}>
                    <NotesIcon sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Training Notes
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Additional details about the training process
                    </Typography>
                  </Box>
                </Box>
                
                <TextField
                  fullWidth
                  id="training_details_notes"
                  name="training_details_notes"
                  label="Training Details & Notes"
                  multiline
                  rows={4}
                  value={trainingFormik.values.training_details_notes}
                  onChange={trainingFormik.handleChange}
                  error={
                    trainingFormik.touched.training_details_notes &&
                    Boolean(trainingFormik.errors.training_details_notes)
                  }
                  helperText={
                    trainingFormik.touched.training_details_notes &&
                    trainingFormik.errors.training_details_notes
                  }
                  sx={{ 
                    '& .MuiOutlinedInput-root': { borderRadius: 2 },
                    '& textarea': { fontFamily: 'monospace', fontSize: '0.875rem' }
                  }}
                />
              </CardContent>
            </Card>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                onClick={handleCloseTrainingDialog}
                sx={{
                  color: 'text.secondary',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={trainingFormik.isSubmitting}
                startIcon={<AssessmentIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: 3
                  }
                }}
              >
                {trainingFormik.isSubmitting
                  ? 'Saving...'
                  : trainingDialogMode === 'create'
                  ? 'Add Training Result'
                  : 'Save Changes'}
              </Button>
            </Stack>
          </DialogActions>
        </form>
      </Dialog>

      {/* Release Note Dialog */}
      <Dialog 
        open={openReleaseNoteDialog} 
        onClose={handleCloseReleaseNoteDialog}
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: 4
          }
        }}
      >
        <form onSubmit={releaseNoteFormik.handleSubmit}>
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
            color: 'white',
            fontWeight: 600,
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Avatar sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <ArticleIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {releaseNote ? 'Edit Release Note' : 'Create Release Note'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {releaseNote ? 'Update release documentation' : 'Document important changes and improvements'}
              </Typography>
            </Box>
            <Button
              onClick={handleCloseReleaseNoteDialog}
              sx={{ 
                color: 'white', 
                minWidth: 'auto',
                p: 1,
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <CloseIcon />
            </Button>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            {/* Title Section */}
            <Card sx={{ borderRadius: 2, boxShadow: 1, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ 
                    background: 'linear-gradient(135deg, #007bff 0%, #6610f2 100%)',
                    width: 40,
                    height: 40,
                    mr: 2
                  }}>
                    <ArticleIcon sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Release Title
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Provide a clear and descriptive title
                    </Typography>
                  </Box>
                </Box>
                
                <TextField
                  fullWidth
                  id="title"
                  name="title"
                  label="Release Title"
                  placeholder="e.g., Version 2.1.0 - Performance Improvements"
                  value={releaseNoteFormik.values.title}
                  onChange={releaseNoteFormik.handleChange}
                  error={
                    releaseNoteFormik.touched.title &&
                    Boolean(releaseNoteFormik.errors.title)
                  }
                  helperText={
                    releaseNoteFormik.touched.title && releaseNoteFormik.errors.title
                  }
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </CardContent>
            </Card>

            {/* Content Section */}
            <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ 
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    width: 40,
                    height: 40,
                    mr: 2
                  }}>
                    <NotesIcon sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Release Content
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Document changes, features, and improvements
                    </Typography>
                  </Box>
                </Box>
                
                <TextField
                  fullWidth
                  id="content"
                  name="content"
                  label="Release Notes Content"
                  placeholder="## What's New&#10;- Feature A: Description&#10;- Enhancement B: Details&#10;&#10;## Bug Fixes&#10;- Fixed issue with X&#10;- Resolved problem Y"
                  multiline
                  rows={12}
                  value={releaseNoteFormik.values.content}
                  onChange={releaseNoteFormik.handleChange}
                  error={
                    releaseNoteFormik.touched.content &&
                    Boolean(releaseNoteFormik.errors.content)
                  }
                  helperText={
                    releaseNoteFormik.touched.content && releaseNoteFormik.errors.content
                  }
                  sx={{ 
                    '& .MuiOutlinedInput-root': { borderRadius: 2 },
                    '& textarea': { fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: 1.7 }
                  }}
                />
              </CardContent>
            </Card>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                onClick={handleCloseReleaseNoteDialog}
                sx={{
                  color: 'text.secondary',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={releaseNoteFormik.isSubmitting}
                startIcon={<ArticleIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #218838 0%, #1e7e34 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: 3
                  }
                }}
              >
                {releaseNoteFormik.isSubmitting
                  ? 'Saving...'
                  : releaseNote ? 'Update Release Note' : 'Create Release Note'}
              </Button>
            </Stack>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={openConfirmDialog}
        title="Delete Training Result"
        message={`Are you sure you want to delete the training result for testset "${
          resultToDelete ? getTestsetName(resultToDelete.testset_id) : ''
        }"?`}
        onConfirm={handleDeleteTrainingResult}
        onCancel={() => {
          setOpenConfirmDialog(false);
          setResultToDelete(null);
        }}
        isLoading={isDeleting}
        confirmText="Delete"
        confirmColor="error"
      />

      {/* Edit Dialog */}
      {editDialogOpen && (
        <ModelVersionForm
          open={editDialogOpen}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
          modelVersion={modelVersion}
          mode="edit"
        />
      )}
    </Box>
  );
};

export default ModelVersionDetailPage; 