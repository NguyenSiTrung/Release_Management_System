import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  IconButton,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link,
  Alert,
  Container,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  ArrowBack as ArrowBackIcon,
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
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ModelVersionForm from '../components/ModelVersion/ModelVersionForm';
import ModelVersionDetailsTabs from '../components/ModelVersion/ModelVersionDetailsTabs';

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
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

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
  const { isReleaseManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if redirected from creation with message
  const [successMessage, setSuccessMessage] = useState<string | null>(
    location.state?.message || null
  );
  const isNewlyCreated = location.state?.newlyCreated || false;

  const [tabValue, setTabValue] = useState(isNewlyCreated ? 0 : 0);
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
      const testsetsData = await getTestsets(versionData.lang_pair_id);
      setTestsets(testsetsData);
      
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

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

  const handleOpenEditTrainingDialog = (result: TrainingResult) => {
    trainingFormik.setValues({
      testset_id: result.testset_id.toString(),
      base_model_bleu: result.base_model_bleu?.toString() || '',
      base_model_comet: result.base_model_comet?.toString() || '',
      finetuned_model_bleu: result.finetuned_model_bleu?.toString() || '',
      finetuned_model_comet: result.finetuned_model_comet?.toString() || '',
      training_details_notes: result.training_details_notes || '',
    });
    setSelectedTrainingResult(result);
    setTrainingDialogMode('edit');
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
  const handleOpenDeleteDialog = (result: TrainingResult) => {
    setResultToDelete(result);
    setOpenConfirmDialog(true);
  };

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
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="outlined" 
          sx={{ mt: 2 }} 
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back
        </Button>
      </Container>
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
    <Container sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={handleBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {modelVersion.version_name}
              </Typography>
        <IconButton 
          color="primary" 
          onClick={handleEditClick} 
          sx={{ ml: 2 }}
          aria-label="edit model version"
        >
          <EditIcon />
        </IconButton>
          </Box>

      <Paper sx={{ mb: 4, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              ID: {modelVersion.version_id}
            </Typography>
            {modelVersion.release_date && (
              <Typography variant="body2" color="text.secondary">
                Release Date: {new Date(modelVersion.release_date).toLocaleDateString()}
              </Typography>
            )}
          </Box>
          <Chip 
            label={`${languagePair.source_language_code} → ${languagePair.target_language_code}`}
            color="primary"
            variant="outlined"
          />
          </Box>

        {modelVersion.description && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6">Description</Typography>
            <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
              {modelVersion.description}
            </Typography>
          </>
                )}
      </Paper>

      <ModelVersionDetailsTabs 
        modelVersion={modelVersion} 
        onRefresh={fetchModelVersionData}
        releaseNote={releaseNote}
        trainingResults={trainingResults}
        testsets={testsets}
        onAddTrainingResult={handleOpenCreateTrainingDialog}
        onEditReleaseNote={handleOpenReleaseNoteDialog}
      />

      {/* Training Result Dialog */}
      <Dialog 
        open={openTrainingDialog} 
        onClose={handleCloseTrainingDialog}
        maxWidth="md" 
        fullWidth
      >
        <form onSubmit={trainingFormik.handleSubmit}>
          <DialogTitle>
            {trainingDialogMode === 'create' 
              ? 'Add Training Result' 
              : 'Edit Training Result'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
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
                  >
                    {testsets.map((testset) => (
                      <MenuItem key={testset.testset_id} value={testset.testset_id}>
                        {testset.testset_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
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
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="training_details_notes"
                  name="training_details_notes"
                  label="Training Notes"
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
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTrainingDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={trainingFormik.isSubmitting}
            >
              {trainingFormik.isSubmitting
                ? 'Saving...'
                : trainingDialogMode === 'create'
                ? 'Add'
                : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Release Note Dialog */}
      <Dialog 
        open={openReleaseNoteDialog} 
        onClose={handleCloseReleaseNoteDialog}
        maxWidth="md" 
        fullWidth
      >
        <form onSubmit={releaseNoteFormik.handleSubmit}>
          <DialogTitle>
            {releaseNote ? 'Edit Release Note' : 'Create Release Note'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="title"
                  name="title"
                  label="Title"
                  value={releaseNoteFormik.values.title}
                  onChange={releaseNoteFormik.handleChange}
                  error={
                    releaseNoteFormik.touched.title &&
                    Boolean(releaseNoteFormik.errors.title)
                  }
                  helperText={
                    releaseNoteFormik.touched.title && releaseNoteFormik.errors.title
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="content"
                  name="content"
                  label="Content"
                  multiline
                  rows={10}
                  value={releaseNoteFormik.values.content}
                  onChange={releaseNoteFormik.handleChange}
                  error={
                    releaseNoteFormik.touched.content &&
                    Boolean(releaseNoteFormik.errors.content)
                  }
                  helperText={
                    releaseNoteFormik.touched.content && releaseNoteFormik.errors.content
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseReleaseNoteDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={releaseNoteFormik.isSubmitting}
            >
              {releaseNoteFormik.isSubmitting
                ? 'Saving...'
                : 'Save Release Note'}
            </Button>
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
    </Container>
  );
};

export default ModelVersionDetailPage; 