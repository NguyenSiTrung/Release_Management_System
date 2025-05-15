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
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  getLanguagePairs,
  getTestsets,
  createTestset,
  updateTestset,
  deleteTestset,
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
  source_file_path: Yup.string(),
  target_file_path: Yup.string(),
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
          });
        } else if (dialogMode === 'edit' && selectedTestset) {
          await updateTestset(selectedTestset.testset_id, {
            testset_name: values.testset_name,
            description: values.description || undefined,
            source_file_path: values.source_file_path || undefined,
            target_file_path: values.target_file_path || undefined,
          });
        }
        
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
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTestset(null);
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
    } catch (err) {
      console.error('Error deleting testset:', err);
      setError('Failed to delete testset. It may be in use by model versions.');
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
              placeholder="Search by name or description"
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
        ) : filteredTestsets.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Language Pair</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Created At</TableCell>
                  {isReleaseManager && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTestsets.map((testset) => (
                  <TableRow key={testset.testset_id}>
                    <TableCell>{testset.testset_id}</TableCell>
                    <TableCell>{testset.testset_name}</TableCell>
                    <TableCell>{getLanguagePairName(testset.lang_pair_id)}</TableCell>
                    <TableCell>{testset.description || '-'}</TableCell>
                    <TableCell>
                      {new Date(testset.created_at).toLocaleDateString()}
                    </TableCell>
                    {isReleaseManager && (
                      <TableCell>
                        <IconButton onClick={() => handleOpenEditDialog(testset)} size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleOpenDeleteDialog(testset)} size="small">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body1">
              No testsets found.{' '}
              {isReleaseManager && (
                <Button onClick={handleOpenCreateDialog} color="primary">
                  Create a new testset
                </Button>
              )}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Create/Edit Dialog */}
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="source_file_path"
                  name="source_file_path"
                  label="Source File Path"
                  value={formik.values.source_file_path}
                  onChange={formik.handleChange}
                  error={formik.touched.source_file_path && Boolean(formik.errors.source_file_path)}
                  helperText={formik.touched.source_file_path && formik.errors.source_file_path}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="target_file_path"
                  name="target_file_path"
                  label="Target File Path"
                  value={formik.values.target_file_path}
                  onChange={formik.handleChange}
                  error={formik.touched.target_file_path && Boolean(formik.errors.target_file_path)}
                  helperText={formik.touched.target_file_path && formik.errors.target_file_path}
                  margin="normal"
                />
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