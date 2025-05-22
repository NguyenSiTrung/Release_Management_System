import React, { useState, useEffect } from 'react';
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
  Typography,
  SelectChangeEvent,
  Chip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  CloudDownload as CloudDownloadIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  getLanguagePairs,
  getTestsets,
  createTestset,
  updateTestset,
  deleteTestset,
  downloadTestsetFile
} from '../services/api';
import { LanguagePair, Testset } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';
import ConfirmDialog from '../components/common/ConfirmDialog';

// Validation schema for testset form
const validationSchema = Yup.object({
  testset_name: Yup.string().required('Testset name is required'),
  lang_pair_id: Yup.number().required('Language pair is required'),
  description: Yup.string(),
});

const TestsetsPage: React.FC = () => {
  const { isReleaseManager } = useAuth();
  
  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [selectedLangPair, setSelectedLangPair] = useState<number | ''>('');
  const [testsets, setTestsets] = useState<Testset[]>([]);
  const [filteredTestsets, setFilteredTestsets] = useState<Testset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTestsets, setIsLoadingTestsets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedTestset, setSelectedTestset] = useState<Testset | null>(null);
  
  // File states
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  
  // Confirm dialog state
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [testsetToDelete, setTestsetToDelete] = useState<Testset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Fetch testsets when a language pair is selected or all testsets if no language pair is selected
  const fetchTestsets = async (langPairId?: number) => {
    try {
      setIsLoadingTestsets(true);
      setError(null);
      const data = await getTestsets(langPairId);
      setTestsets(data);
      setFilteredTestsets(data);
    } catch (err) {
      console.error('Error fetching testsets:', err);
      setError('Failed to load testsets. Please try again.');
    } finally {
      setIsLoadingTestsets(false);
    }
  };

  useEffect(() => {
    fetchLanguagePairs();
    fetchTestsets(); // Fetch all testsets initially
  }, []);

  // Filter testsets based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTestsets(testsets);
    } else {
      const filtered = testsets.filter(
        (testset) =>
          testset.testset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (testset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      );
      setFilteredTestsets(filtered);
    }
  }, [searchTerm, testsets]);

  // Handle language pair selection change
  const handleLangPairChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedLangPair(typeof value === 'number' ? value : value === '' ? '' : parseInt(value as string));
    setSearchTerm('');
    
    if (value === '') {
      fetchTestsets(); // Fetch all testsets
    } else {
      const langPairId = typeof value === 'number' ? value : parseInt(value as string);
      fetchTestsets(langPairId);
    }
  };
  
  // Handle file change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'source' | 'target') => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (fileType === 'source') {
        setSourceFile(file);
      } else {
        setTargetFile(file);
      }
    }
  };
  
  // Handle file download
  const handleDownloadFile = async (testsetId: number, fileType: 'source' | 'target') => {
    try {
      const fileBlob = await downloadTestsetFile(testsetId, fileType);
      
      // Create download link
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get the testset
      const testset = testsets.find(t => t.testset_id === testsetId);
      if (!testset) return;
      
      // Set file name based on file type
      let fileName;
      if (fileType === 'source') {
        fileName = testset.source_file_name || `source_${testsetId}.txt`;
      } else {
        fileName = testset.target_file_name || `target_${testsetId}.txt`;
      }
      
      a.download = fileName;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Failed to download ${fileType} file:`, error);
      setError(`Failed to download ${fileType} file. Please try again.`);
    }
  };

  // Formik setup for testset form
  const formik = useFormik({
    initialValues: {
      testset_name: '',
      lang_pair_id: '',
      description: '',
      source_file_path: '',
      target_file_path: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        if (dialogMode === 'create') {
          await createTestset({
            ...values,
            lang_pair_id: Number(values.lang_pair_id),
          }, sourceFile || undefined, targetFile || undefined);
        } else if (dialogMode === 'edit' && selectedTestset) {
          await updateTestset(selectedTestset.testset_id, {
            testset_name: values.testset_name,
            description: values.description || undefined,
          }, sourceFile || undefined, targetFile || undefined);
        }
        
        // Reset file states
        setSourceFile(null);
        setTargetFile(null);
        
        handleCloseDialog();
        resetForm();
        if (selectedLangPair !== '') {
          await fetchTestsets(selectedLangPair as number);
        } else {
          await fetchTestsets();
        }
      } catch (err: any) {
        console.error('Error saving testset:', err);
        
        // Handle specific error codes
        if (err.response) {
          const status = err.response.status;
          
          // Handle 409 Conflict - duplicate testset name
          if (status === 409) {
            handleCloseDialog();
            setError(err.response.data?.detail || 'A testset with this name already exists. Testset names must be unique across all language pairs.');
          } else if (status === 400) {
            handleCloseDialog();
            setError(err.response.data?.detail || 'Invalid request. Please check your input.');
          } else {
            setError(err.response.data?.detail || 'Failed to save testset. Please try again.');
          }
        } else {
          setError('Failed to save testset. Please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Open dialog for creating a new testset
  const handleOpenCreateDialog = () => {
    formik.resetForm();
    formik.setFieldValue('lang_pair_id', selectedLangPair);
    setDialogMode('create');
    setSourceFile(null);
    setTargetFile(null);
    setOpenDialog(true);
  };

  // Open dialog for editing a testset
  const handleOpenEditDialog = (testset: Testset) => {
    formik.setValues({
      testset_name: testset.testset_name,
      lang_pair_id: testset.lang_pair_id.toString(),
      description: testset.description || '',
      source_file_path: testset.source_file_path || '',
      target_file_path: testset.target_file_path || '',
    });
    setSelectedTestset(testset);
    setDialogMode('edit');
    setSourceFile(null);
    setTargetFile(null);
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTestset(null);
    setSourceFile(null);
    setTargetFile(null);
    formik.resetForm();
  };

  // Open confirm dialog for deleting a testset
  const handleOpenDeleteDialog = (testset: Testset) => {
    setTestsetToDelete(testset);
    setOpenConfirmDialog(true);
  };

  // Delete testset
  const handleDeleteTestset = async () => {
    if (!testsetToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteTestset(testsetToDelete.testset_id);
      
      if (selectedLangPair !== '') {
        await fetchTestsets(selectedLangPair as number);
      } else {
        await fetchTestsets();
      }
      
      setOpenConfirmDialog(false);
      setTestsetToDelete(null);
    } catch (err: any) {
      console.error('Error deleting testset:', err);
      
      // Get the specific error message from the backend if available
      let errorMessage = 'Failed to delete testset.';
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
      setOpenConfirmDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get language pair name by ID
  const getLanguagePairName = (langPairId: number) => {
    const langPair = languagePairs.find(lp => lp.lang_pair_id === langPairId);
    return langPair 
      ? `${langPair.source_language_code}-${langPair.target_language_code}` 
      : 'Unknown';
  };

  if (isLoading) {
    return <LoadingIndicator message="Loading testsets data..." />;
  }

  return (
    <Box>
      <PageHeader
        title="Testsets"
        action={
          isReleaseManager
            ? {
                text: 'Add New Testset',
                onClick: handleOpenCreateDialog,
                disabled: false,
              }
            : undefined
        }
      />

      {error && (
        <ErrorDisplay 
          message={error} 
          onRetry={() => fetchTestsets(selectedLangPair ? Number(selectedLangPair) : undefined)} 
        />
      )}

      <Paper sx={{ width: '100%', mb: 2, p: 2 }}>
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="language-pair-select-label">Language Pair</InputLabel>
              <Select
                labelId="language-pair-select-label"
                id="language-pair-select"
                value={selectedLangPair}
                label="Language Pair"
                onChange={handleLangPairChange}
              >
                <MenuItem value="">
                  <em>All Language Pairs</em>
                </MenuItem>
                {languagePairs.map((pair) => (
                  <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                    {pair.source_language_code}-{pair.target_language_code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="Search testsets by name or description"
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
          </Grid>
        </Grid>

        {isLoadingTestsets ? (
          <LoadingIndicator message="Loading testsets..." />
        ) : filteredTestsets.length === 0 ? (
          <Typography variant="body1" align="center" sx={{ py: 4 }}>
            No testsets found. {isReleaseManager && 'Click "Add New Testset" to create one.'}
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Testset Name</TableCell>
                  <TableCell>Language Pair</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Source File</TableCell>
                  <TableCell>Target File</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTestsets.map((testset) => (
                  <TableRow key={testset.testset_id}>
                    <TableCell>{testset.testset_name}</TableCell>
                    <TableCell>{getLanguagePairName(testset.lang_pair_id)}</TableCell>
                    <TableCell>{testset.description || '—'}</TableCell>
                    <TableCell>
                      {testset.source_file_name ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip 
                            label={testset.source_file_name} 
                            size="small" 
                            sx={{ mr: 1 }} 
                          />
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleDownloadFile(testset.testset_id, 'source')}
                          >
                            <CloudDownloadIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        testset.source_file_path || '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {testset.target_file_name ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip 
                            label={testset.target_file_name} 
                            size="small" 
                            sx={{ mr: 1 }} 
                          />
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleDownloadFile(testset.testset_id, 'target')}
                          >
                            <CloudDownloadIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        testset.target_file_path || '—'
                      )}
                    </TableCell>
                    <TableCell>
                    {isReleaseManager && (
                        <>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleOpenEditDialog(testset)}
                          >
                            <EditIcon fontSize="small" />
                        </IconButton>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(testset)}
                          >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                        </>
                      )}
                      </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New Testset' : 'Edit Testset'}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="testset_name"
                  name="testset_name"
                  label="Testset Name"
                  value={formik.values.testset_name}
                  onChange={formik.handleChange}
                  error={formik.touched.testset_name && Boolean(formik.errors.testset_name)}
                  helperText={formik.touched.testset_name && formik.errors.testset_name}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="lang-pair-label">Language Pair</InputLabel>
                  <Select
                    labelId="lang-pair-label"
                    id="lang_pair_id"
                    name="lang_pair_id"
                    value={formik.values.lang_pair_id}
                    onChange={formik.handleChange}
                    label="Language Pair"
                    error={formik.touched.lang_pair_id && Boolean(formik.errors.lang_pair_id)}
                    disabled={dialogMode === 'edit'} // Can't change language pair in edit mode
                  >
                    {languagePairs.map((pair) => (
                      <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                        {pair.source_language_code}-{pair.target_language_code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                  multiline
                  rows={3}
                  margin="normal"
                />
              </Grid>
              
              {/* Source File Upload */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Source File
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{ mr: 2 }}
                  >
                    {sourceFile ? 'Replace File' : 'Upload File'}
                    <input
                      type="file"
                      hidden
                      onChange={(e) => handleFileChange(e, 'source')}
                    />
                  </Button>
                  {sourceFile && (
                    <Typography variant="body2">
                      {sourceFile.name} ({Math.round(sourceFile.size / 1024)} KB)
                    </Typography>
                  )}
                </Box>
                {dialogMode === 'edit' && selectedTestset?.source_file_name && !sourceFile && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Current file: {selectedTestset.source_file_name}
                    </Typography>
                  </Box>
                )}
              </Grid>
              
              {/* Target File Upload */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Target File
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{ mr: 2 }}
                  >
                    {targetFile ? 'Replace File' : 'Upload File'}
                    <input
                      type="file"
                      hidden
                      onChange={(e) => handleFileChange(e, 'target')}
                    />
                  </Button>
                  {targetFile && (
                    <Typography variant="body2">
                      {targetFile.name} ({Math.round(targetFile.size / 1024)} KB)
                    </Typography>
                  )}
                </Box>
                {dialogMode === 'edit' && selectedTestset?.target_file_name && !targetFile && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Current file: {selectedTestset.target_file_name}
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary">
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={openConfirmDialog}
        title="Delete Testset"
        message={`Are you sure you want to delete testset "${testsetToDelete?.testset_name}"? This action cannot be undone.`}
        onConfirm={handleDeleteTestset}
        onCancel={() => {
          setOpenConfirmDialog(false);
          setTestsetToDelete(null);
        }}
        isLoading={isDeleting}
      />
    </Box>
  );
};

export default TestsetsPage; 