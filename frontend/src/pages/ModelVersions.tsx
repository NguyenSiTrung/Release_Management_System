import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Link,
  Typography,
  SelectChangeEvent,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  CloudDownload as CloudDownloadIcon,
  FileDownload as FileDownloadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  getLanguagePairs,
  getModelVersions,
  createModelVersion,
  updateModelVersion,
  deleteModelVersion,
  exportModelVersions,
  getModelVersion,
} from '../services/api';
import { LanguagePair, ModelVersion } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';
import ConfirmDialog from '../components/common/ConfirmDialog';

// Validation schema for model version form
const validationSchema = Yup.object({
  version_name: Yup.string().required('Version name is required'),
  lang_pair_id: Yup.number().required('Language pair is required'),
  release_date: Yup.date().nullable(),
  description: Yup.string(),
});

// Add a constant for localStorage key
const STORAGE_KEY_LANGUAGE_PAIR = 'nmt_selected_language_pair';

const ModelVersionsPage: React.FC = () => {
  const { isReleaseManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [selectedLangPair, setSelectedLangPair] = useState<number | ''>('');
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [filteredVersions, setFilteredVersions] = useState<ModelVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedVersion, setSelectedVersion] = useState<ModelVersion | null>(null);
  
  // Confirm dialog state
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<ModelVersion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export dialog states
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'markdown'>('excel');
  const [isExporting, setIsExporting] = useState(false);

  // Parse URL parameters and check localStorage
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const editVersionId = searchParams.get('edit');
    const langPairId = searchParams.get('langPairId');

    const init = async () => {
      await fetchLanguagePairs();
      
      // Try to get language pair ID from URL first, then localStorage if not in URL
      let langPairIdToUse: string | null = langPairId;
      
      if (!langPairIdToUse) {
        // Check localStorage if not in URL
        langPairIdToUse = localStorage.getItem(STORAGE_KEY_LANGUAGE_PAIR);
      }
      
      // If we have a language pair ID from URL or localStorage, select it and load versions
      if (langPairIdToUse) {
        const langPairIdNum = parseInt(langPairIdToUse);
        setSelectedLangPair(langPairIdNum);
        await fetchModelVersions(langPairIdNum);
        
        // If editing a model version, open the edit dialog
        if (editVersionId) {
          const versionIdNum = parseInt(editVersionId);
          const versionToEdit = await getModelVersion(versionIdNum);
          if (versionToEdit) {
            handleOpenEditDialog(versionToEdit);
            
            // Clear the URL parameters after handling them
            navigate('/model-versions', { replace: true });
          }
        }
      }
    };
    
    init();
  }, [location.search]);

  // Add a new effect to save selected language pair to localStorage when it changes
  useEffect(() => {
    if (selectedLangPair !== '') {
      localStorage.setItem(STORAGE_KEY_LANGUAGE_PAIR, selectedLangPair.toString());
    }
  }, [selectedLangPair]);

  // Fetch language pairs for dropdown
  const fetchLanguagePairs = async () => {
    try {
      setIsLoading(true);
      const data = await getLanguagePairs();
      setLanguagePairs(data);
    } catch (err) {
      console.error('Error fetching language pairs:', err);
      setError('Failed to load language pairs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch model versions when a language pair is selected
  const fetchModelVersions = async (langPairId: number) => {
    try {
      setIsLoadingVersions(true);
      setError(null);
      const data = await getModelVersions(langPairId);
      setModelVersions(data);
      setFilteredVersions(data);
    } catch (err) {
      console.error('Error fetching model versions:', err);
      setError('Failed to load model versions. Please try again.');
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // Filter model versions based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredVersions(modelVersions);
    } else {
      const filtered = modelVersions.filter(
        (version) =>
          version.version_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (version.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      );
      setFilteredVersions(filtered);
    }
  }, [searchTerm, modelVersions]);

  // Handle language pair selection change
  const handleLangPairChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedLangPair(typeof value === 'number' ? value : value === '' ? '' : parseInt(value as string));
    setModelVersions([]);
    setFilteredVersions([]);
    setSearchTerm('');
    
    if (value !== '') {
      fetchModelVersions(typeof value === 'number' ? value : parseInt(value as string));
    }
  };

  // Formik setup for model version form
  const formik = useFormik({
    initialValues: {
      version_name: '',
      lang_pair_id: '',
      release_date: '',
      description: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        if (dialogMode === 'create') {
          const newVersion = await createModelVersion({
            ...values,
            lang_pair_id: Number(values.lang_pair_id),
          });
          
          handleCloseDialog();
          resetForm();
          
          // Redirect to the detail page after creation
          navigate(`/model-versions/${newVersion.version_id}`, { 
            state: { newlyCreated: true, message: 'Model Version created successfully. Please add training results with BLEU and COMET scores.' } 
          });
        } else if (dialogMode === 'edit' && selectedVersion) {
          await updateModelVersion(selectedVersion.version_id, {
            version_name: values.version_name,
            release_date: values.release_date || undefined,
            description: values.description || undefined,
          });
          
          handleCloseDialog();
          resetForm();
          if (selectedLangPair !== '') {
            await fetchModelVersions(selectedLangPair as number);
          }
        }
      } catch (err) {
        console.error('Error saving model version:', err);
        setError('Failed to save model version. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Open dialog for creating a new model version
  const handleOpenCreateDialog = () => {
    formik.resetForm();
    formik.setFieldValue('lang_pair_id', selectedLangPair);
    setDialogMode('create');
    setOpenDialog(true);
  };

  // Open dialog for editing a model version
  const handleOpenEditDialog = (version: ModelVersion) => {
    formik.setValues({
      version_name: version.version_name,
      lang_pair_id: version.lang_pair_id.toString(),
      release_date: version.release_date || '',
      description: version.description || '',
    });
    setSelectedVersion(version);
    setDialogMode('edit');
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedVersion(null);
    formik.resetForm();
  };

  // Open confirm dialog for deleting a model version
  const handleOpenDeleteDialog = (version: ModelVersion) => {
    setVersionToDelete(version);
    setOpenConfirmDialog(true);
  };

  // Delete model version
  const handleDeleteModelVersion = async () => {
    if (!versionToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteModelVersion(versionToDelete.version_id);
      
      if (selectedLangPair !== '') {
        await fetchModelVersions(selectedLangPair as number);
      }
      
      setOpenConfirmDialog(false);
      setVersionToDelete(null);
    } catch (err) {
      console.error('Error deleting model version:', err);
      setError('Failed to delete model version.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Navigate to model version details
  const handleViewVersion = (versionId: number) => {
    navigate(`/model-versions/${versionId}`);
  };

  // Get language pair name for display
  const getLanguagePairName = (langPairId: number) => {
    const pair = languagePairs.find((p) => p.lang_pair_id === langPairId);
    return pair
      ? `${pair.source_language_code} -> ${pair.target_language_code}`
      : 'Unknown';
  };

  // Handle opening export dialog
  const handleOpenExportDialog = () => {
    setOpenExportDialog(true);
  };

  // Handle closing export dialog
  const handleCloseExportDialog = () => {
    setOpenExportDialog(false);
  };

  // Handle export format change
  const handleExportFormatChange = (event: SelectChangeEvent) => {
    setExportFormat(event.target.value as 'excel' | 'markdown');
  };

  // Handle export action
  const handleExport = async () => {
    if (selectedLangPair === '') {
      setError('Please select a language pair first.');
      return;
    }

    try {
      setIsExporting(true);
      const blob = await exportModelVersions(selectedLangPair as number, exportFormat);
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element
      const a = document.createElement('a');
      a.href = url;
      
      // Set the file name
      const langPair = languagePairs.find(lp => lp.lang_pair_id === selectedLangPair);
      const fileName = `model_versions_${langPair?.source_language_code}_${langPair?.target_language_code}_${new Date().toISOString().split('T')[0]}`;
      a.download = exportFormat === 'excel' ? `${fileName}.xlsx` : `${fileName}.md`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      handleCloseExportDialog();
    } catch (err) {
      console.error('Error exporting model versions:', err);
      setError('Failed to export model versions. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <LoadingIndicator message="Loading language pairs..." />;
  }

  return (
    <Box>
      <PageHeader
        title="Model Versions"
        action={
          isReleaseManager && selectedLangPair !== ''
            ? {
                text: 'Add New Model Version',
                onClick: handleOpenCreateDialog,
                disabled: false,
              }
            : undefined
        }
      />

      {error && (
        <ErrorDisplay 
          message={error} 
          onRetry={() => {
            if (selectedLangPair !== '') {
              fetchModelVersions(selectedLangPair as number);
            } else {
              fetchLanguagePairs();
            }
          }} 
        />
      )}

      <Paper sx={{ width: '100%', mb: 2, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Select Language Pair
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="language-pair-select-label">Language Pair</InputLabel>
          <Select
            labelId="language-pair-select-label"
            id="language-pair-select"
            value={selectedLangPair}
            label="Language Pair"
            onChange={handleLangPairChange}
          >
            <MenuItem value="">
              <em>Select a language pair</em>
            </MenuItem>
            {languagePairs.map((pair) => (
              <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                {pair.source_language_code} -&gt; {pair.target_language_code}
                {pair.description && ` (${pair.description})`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedLangPair !== '' && isAdmin && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<CloudDownloadIcon />}
              onClick={handleOpenExportDialog}
            >
              Export Data
            </Button>
          </Box>
        )}
      </Paper>

      {selectedLangPair !== '' && (
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by version name or description"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {isLoadingVersions ? (
            <Box sx={{ p: 2 }}>
              <LoadingIndicator message="Loading model versions..." />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Version Name</TableCell>
                    <TableCell>Release Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredVersions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No model versions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVersions.map((version) => (
                      <TableRow key={version.version_id}>
                        <TableCell>
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => handleViewVersion(version.version_id)}
                            color="primary"
                            underline="hover"
                          >
                            {version.version_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {version.release_date
                            ? new Date(version.release_date).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>{version.description || '-'}</TableCell>
                        <TableCell>
                          {new Date(version.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="info"
                            onClick={() => handleViewVersion(version.version_id)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                          {isReleaseManager && (
                            <>
                              <IconButton
                                color="primary"
                                onClick={() => handleOpenEditDialog(version)}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                color="error"
                                onClick={() => handleOpenDeleteDialog(version)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Model Version Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {dialogMode === 'create' ? 'Add New Model Version' : 'Edit Model Version'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {dialogMode === 'create' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="lang-pair-label">Language Pair</InputLabel>
                    <Select
                      labelId="lang-pair-label"
                      id="lang_pair_id"
                      name="lang_pair_id"
                      value={formik.values.lang_pair_id}
                      onChange={formik.handleChange}
                      label="Language Pair"
                      error={
                        formik.touched.lang_pair_id &&
                        Boolean(formik.errors.lang_pair_id)
                      }
                    >
                      {languagePairs.map((pair) => (
                        <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                          {pair.source_language_code} -&gt; {pair.target_language_code}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="version_name"
                  name="version_name"
                  label="Version Name"
                  value={formik.values.version_name}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.version_name &&
                    Boolean(formik.errors.version_name)
                  }
                  helperText={
                    formik.touched.version_name && formik.errors.version_name
                  }
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="release_date"
                  name="release_date"
                  label="Release Date"
                  type="date"
                  value={formik.values.release_date}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.release_date &&
                    Boolean(formik.errors.release_date)
                  }
                  helperText={
                    formik.touched.release_date && formik.errors.release_date
                  }
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Description"
                  multiline
                  rows={4}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.description && Boolean(formik.errors.description)
                  }
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting
                ? 'Saving...'
                : dialogMode === 'create'
                ? 'Create'
                : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={openConfirmDialog}
        title="Delete Model Version"
        message={`Are you sure you want to delete the model version "${
          versionToDelete?.version_name || ''
        }"? All training results and release notes related to this version will also be deleted.`}
        onConfirm={handleDeleteModelVersion}
        onCancel={() => {
          setOpenConfirmDialog(false);
          setVersionToDelete(null);
        }}
        isLoading={isDeleting}
        confirmText="Delete"
        confirmColor="error"
      />

      {/* Export Dialog */}
      <Dialog open={openExportDialog} onClose={handleCloseExportDialog}>
        <DialogTitle>Export Model Versions</DialogTitle>
        <DialogContent>
          <Box py={1}>
            <Typography variant="body2" gutterBottom>
              Export all model versions, training results, and release notes for the selected language pair.
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="export-format-label">Format</InputLabel>
              <Select
                labelId="export-format-label"
                id="export-format"
                value={exportFormat}
                label="Format"
                onChange={handleExportFormatChange}
              >
                <MenuItem value="excel">
                  <ListItemIcon>
                    <FileDownloadIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Excel Spreadsheet" secondary=".xlsx" />
                </MenuItem>
                <MenuItem value="markdown">
                  <ListItemIcon>
                    <DescriptionIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Markdown Document" secondary=".md" />
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExportDialog}>Cancel</Button>
          <Button 
            onClick={handleExport} 
            variant="contained" 
            color="primary"
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModelVersionsPage; 