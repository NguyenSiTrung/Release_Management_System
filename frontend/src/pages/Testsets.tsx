import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
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
  Tooltip,
  CircularProgress,
  Stack,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  CloudDownload as CloudDownloadIcon,
  Upload as UploadIcon,
  Add as AddIcon,
  Assessment as AssessmentIcon,
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  TextFields as TextFieldsIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  getLanguagePairs,
  getTestsetsPaginated,
  createTestset,
  updateTestset,
  deleteTestset,
  downloadTestsetFile
} from '../services/api';
import { LanguagePair, Testset, TestsetUpdate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';
import ConfirmDialog from '../components/common/ConfirmDialog';
import FileContentEditor from '../components/Testsets/FileContentEditor';

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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedTestset, setSelectedTestset] = useState<Testset | null>(null);
  
  // File states (kept for backward compatibility with API calls)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [targetFile, setTargetFile] = useState<File | null>(null);
  
  // Confirm dialog state
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [testsetToDelete, setTestsetToDelete] = useState<Testset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // File content editor state
  const [openFileEditor, setOpenFileEditor] = useState(false);
  const [testsetForEditing, setTestsetForEditing] = useState<Testset | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);

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
  const fetchTestsets = useCallback(async (langPairId?: number) => {
    try {
      setIsLoadingTestsets(true);
      setError(null);
      const data = await getTestsetsPaginated(langPairId, currentPage);
      setTestsets(data.items);
      setFilteredTestsets(data.items);
    } catch (err) {
      console.error('Error fetching testsets:', err);
      setError('Failed to load testsets. Please try again.');
    } finally {
      setIsLoadingTestsets(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchLanguagePairs();
  }, []);

  useEffect(() => {
    fetchTestsets(selectedLangPair ? Number(selectedLangPair) : undefined);
  }, [currentPage, fetchTestsets, selectedLangPair]);

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
    setPage(0);
  }, [searchTerm, testsets]);

  // Handle language pair selection change
  const handleLangPairChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedLangPair(typeof value === 'number' ? value : value === '' ? '' : parseInt(value as string));
    setSearchTerm('');
    setCurrentPage(1); // Reset to first page
    
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
        formik.setFieldValue('sourceFile', file);
        setSourceFile(file); // Keep for backward compatibility with API call
      } else {
        formik.setFieldValue('targetFile', file);
        setTargetFile(file); // Keep for backward compatibility with API call
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
      document.body.removeChild(a);
      
      // Cleanup
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file. Please try again.');
    }
  };
  
  // Formik setup for testset form
  const formik = useFormik({
    initialValues: {
      testset_name: '',
      lang_pair_id: 0,
      description: '',
      sourceFile: null as File | null,
      targetFile: null as File | null,
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        if (dialogMode === 'create') {
          // Create TestsetCreate object for API
          const testsetData = {
            testset_name: values.testset_name,
            lang_pair_id: values.lang_pair_id,
            description: values.description || undefined,
          };
          
          // Call API with separate parameters
          await createTestset(testsetData, values.sourceFile || undefined, values.targetFile || undefined);
        } else if (dialogMode === 'edit' && selectedTestset) {
          // For edit, update testset data and optionally replace files
          const updateData: TestsetUpdate = {
            testset_name: values.testset_name,
            description: values.description,
          };
          await updateTestset(
            selectedTestset.testset_id, 
            updateData, 
            values.sourceFile || undefined, 
            values.targetFile || undefined
          );
        }
        
        handleCloseDialog();
        resetForm();
        await fetchTestsets(selectedLangPair ? Number(selectedLangPair) : undefined);
      } catch (err) {
        console.error('Error saving testset:', err);
        setError('Failed to save testset. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Open dialog for creating a new testset
  const handleOpenCreateDialog = () => {
    formik.resetForm();
    setSourceFile(null);
    setTargetFile(null);
    setDialogMode('create');
    setOpenDialog(true);
  };

  // Open dialog for editing a testset
  const handleOpenEditDialog = (testset: Testset) => {
    formik.setValues({
      testset_name: testset.testset_name,
      lang_pair_id: testset.lang_pair_id,
      description: testset.description || '',
      sourceFile: null,
      targetFile: null,
    });
    setSelectedTestset(testset);
    setDialogMode('edit');
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTestset(null);
    setSourceFile(null);
    setTargetFile(null);
    formik.resetForm();
    formik.setFieldValue('sourceFile', null);
    formik.setFieldValue('targetFile', null);
  };

  // Open confirm dialog for deleting a testset
  const handleOpenDeleteDialog = (testset: Testset) => {
    setTestsetToDelete(testset);
    setOpenConfirmDialog(true);
  };

  // Open file content editor
  const handleOpenFileEditor = (testset: Testset) => {
    setTestsetForEditing(testset);
    setOpenFileEditor(true);
  };

  // Close file content editor
  const handleCloseFileEditor = () => {
    setOpenFileEditor(false);
    setTestsetForEditing(null);
  };

  // Delete testset
  const handleDeleteTestset = async () => {
    if (!testsetToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteTestset(testsetToDelete.testset_id);
      await fetchTestsets(selectedLangPair ? Number(selectedLangPair) : undefined);
      setOpenConfirmDialog(false);
      setTestsetToDelete(null);
    } catch (err) {
      console.error('Error deleting testset:', err);
      setError('Failed to delete testset. It may be in use by evaluations.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle pagination changes
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getLanguagePairName = (langPairId: number) => {
    const langPair = languagePairs.find(lp => lp.lang_pair_id === langPairId);
    return langPair 
      ? `${langPair.source_language_code} → ${langPair.target_language_code}` 
      : 'Unknown';
  };

  if (isLoading) {
    return <LoadingIndicator message="Loading testsets..." />;
  }

  return (
    <Box sx={{ p: 0 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                color: '#344767',
                fontWeight: 600,
                mb: 0.5
              }}
            >
              Test Sets
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#67748e',
                fontSize: '0.875rem'
              }}
            >
              Manage evaluation datasets for your NMT models
            </Typography>
          </Box>
          
          {isReleaseManager && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              sx={{
                background: 'linear-gradient(90deg, rgba(94,114,228,1) 0%, rgba(130,94,228,1) 100%)',
                boxShadow: '0 3px 5px -1px rgba(94,114,228,.2), 0 6px 10px 0 rgba(94,114,228,.14), 0 1px 18px 0 rgba(94,114,228,.12)',
                borderRadius: '0.5rem',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                '&:hover': {
                  background: 'linear-gradient(90deg, rgba(84,104,218,1) 0%, rgba(120,84,218,1) 100%)',
                }
              }}
            >
              Add Test Set
            </Button>
          )}
        </Stack>
        
        {error && (
          <ErrorDisplay 
            message={error} 
            onRetry={() => fetchTestsets(selectedLangPair ? Number(selectedLangPair) : undefined)} 
          />
        )}
      </Box>

      {/* Main Content Card */}
      <Card
        sx={{
          borderRadius: '1rem',
          boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
          border: '0px',
          background: '#fff',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Filters */}
          <Box sx={{ p: 3, pb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search by testset name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#8392ab' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.5rem',
                      '& fieldset': {
                        borderColor: 'rgba(0,0,0,0.1)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(94,114,228,0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(94,114,228,0.8)',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth
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
                  <InputLabel>Filter by Language Pair</InputLabel>
                  <Select
                    value={selectedLangPair}
                    label="Filter by Language Pair"
                    onChange={handleLangPairChange}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: '0.5rem',
                          boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
                          maxHeight: 240,
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
                    <MenuItem value="" sx={{ fontStyle: 'italic', color: '#8392ab' }}>
                      All Language Pairs
                    </MenuItem>
                    {languagePairs.map((langPair) => (
                      <MenuItem key={langPair.lang_pair_id} value={langPair.lang_pair_id}>
                        {langPair.source_language_code} → {langPair.target_language_code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      color: '#8392ab', 
                      fontWeight: 600, 
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      py: 2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    #
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#8392ab', 
                      fontWeight: 600, 
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      py: 2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    Test Set
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#8392ab', 
                      fontWeight: 600, 
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      py: 2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    Language Pair
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#8392ab', 
                      fontWeight: 600, 
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      py: 2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    Files
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#8392ab', 
                      fontWeight: 600, 
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      py: 2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    Created
                  </TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      color: '#8392ab', 
                      fontWeight: 600, 
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      py: 2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingTestsets ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={40} sx={{ color: '#5e72e4' }} />
                    </TableCell>
                  </TableRow>
                ) : filteredTestsets.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={6} 
                      align="center"
                      sx={{ py: 6, color: '#8392ab' }}
                    >
                      <Stack alignItems="center" spacing={2}>
                        <AssessmentIcon sx={{ fontSize: 48, color: '#dee2e6' }} />
                        <Typography variant="body1" sx={{ color: '#8392ab' }}>
                          No test sets found
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTestsets
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((testset, index) => (
                      <TableRow 
                        key={testset.testset_id}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'rgba(94,114,228,0.03)',
                          },
                        }}
                      >
                        <TableCell 
                          sx={{ 
                            color: '#344767', 
                            fontWeight: 500,
                            py: 2,
                            borderBottom: '1px solid rgba(0,0,0,0.05)'
                          }}
                        >
                          {page * rowsPerPage + index + 1}
                        </TableCell>
                        <TableCell sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                background: 'linear-gradient(90deg, rgba(94,114,228,0.1) 0%, rgba(130,94,228,0.1) 100%)',
                                color: 'rgba(94,114,228,1)',
                              }}
                            >
                              <AssessmentIcon sx={{ fontSize: 16 }} />
                            </Avatar>
                            <Box>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: '#344767', 
                                  fontWeight: 600,
                                  fontSize: '0.875rem'
                                }}
                              >
                                {testset.testset_name}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: '#67748e',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {testset.description || 'No description'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Chip
                            label={getLanguagePairName(testset.lang_pair_id)}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(94,114,228,0.1)',
                              color: 'rgba(94,114,228,1)',
                              fontWeight: 500,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Stack direction="row" spacing={1}>
                            {testset.source_file_name && (
                              <Tooltip title={`Download ${testset.source_file_name}`}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadFile(testset.testset_id, 'source')}
                                  sx={{
                                    color: '#17a2b8',
                                    backgroundColor: 'rgba(23,162,184,0.1)',
                                    '&:hover': {
                                      backgroundColor: 'rgba(23,162,184,0.2)',
                                    }
                                  }}
                                >
                                  <CloudDownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {testset.target_file_name && (
                              <Tooltip title={`Download ${testset.target_file_name}`}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadFile(testset.testset_id, 'target')}
                                  sx={{
                                    color: '#28a745',
                                    backgroundColor: 'rgba(40,167,69,0.1)',
                                    '&:hover': {
                                      backgroundColor: 'rgba(40,167,69,0.2)',
                                    }
                                  }}
                                >
                                  <CloudDownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Chip
                            label={new Date(testset.created_at).toLocaleDateString()}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(94,114,228,0.1)',
                              color: 'rgba(94,114,228,1)',
                              fontWeight: 500,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell 
                          align="right" 
                          sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                        >
                          {(testset.source_file_name || testset.target_file_name) && (
                            <Tooltip title="View & Edit File Content">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenFileEditor(testset)}
                                sx={{
                                  color: '#17a2b8',
                                  mr: 1,
                                  '&:hover': {
                                    backgroundColor: 'rgba(23,162,184,0.1)',
                                  }
                                }}
                              >
                                <TextFieldsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {isReleaseManager && (
                            <>
                              <Tooltip title="Edit Testset">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEditDialog(testset)}
                                  sx={{
                                    color: '#5e72e4',
                                    '&:hover': {
                                      backgroundColor: 'rgba(94,114,228,0.1)',
                                    }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Testset">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDeleteDialog(testset)}
                                  sx={{
                                    color: '#f5365c',
                                    ml: 1,
                                    '&:hover': {
                                      backgroundColor: 'rgba(245,54,92,0.1)',
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ p: 2, pt: 1 }}>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredTestsets.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                '& .MuiTablePagination-toolbar': {
                  color: '#8392ab',
                },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  color: '#8392ab',
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Testset Form Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: 4
          }
        }}
      >
        <form onSubmit={formik.handleSubmit}>
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
              {dialogMode === 'create' ? <AddIcon /> : <EditIcon />}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {dialogMode === 'create' ? 'Add New Test Set' : 'Edit Test Set'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {dialogMode === 'create' ? 'Create a new test set with source and target files' : 'Update test set details'}
              </Typography>
            </Box>
            <Button
              onClick={handleCloseDialog}
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
            {/* Basic Information */}
            <Card sx={{ m: 3, borderRadius: 3, border: '1px solid #e9ecef' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ 
                    background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                    mr: 2
                  }}>
                    <InfoIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Basic Information
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enter test set details and language pair
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="testset_name"
                      name="testset_name"
                      label="Test Set Name"
                      value={formik.values.testset_name}
                      onChange={formik.handleChange}
                      error={formik.touched.testset_name && Boolean(formik.errors.testset_name)}
                      helperText={formik.touched.testset_name && formik.errors.testset_name}
                      required
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl 
                      fullWidth
                      error={formik.touched.lang_pair_id && Boolean(formik.errors.lang_pair_id)}
                      required
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      <InputLabel>Language Pair</InputLabel>
                      <Select
                        id="lang_pair_id"
                        name="lang_pair_id"
                        value={formik.values.lang_pair_id}
                        label="Language Pair"
                        onChange={formik.handleChange}
                        disabled={dialogMode === 'edit'}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              borderRadius: 2,
                              boxShadow: 4,
                              maxHeight: 240,
                            },
                          },
                        }}
                      >
                        {languagePairs.map((langPair) => (
                          <MenuItem key={langPair.lang_pair_id} value={langPair.lang_pair_id}>
                            {langPair.source_language_code} → {langPair.target_language_code}
                          </MenuItem>
                        ))}
                      </Select>
                      {formik.touched.lang_pair_id && formik.errors.lang_pair_id && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75, fontSize: '0.75rem' }}>
                          {formik.errors.lang_pair_id}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="description"
                      name="description"
                      label="Description"
                      multiline
                      rows={3}
                      value={formik.values.description}
                      onChange={formik.handleChange}
                      error={formik.touched.description && Boolean(formik.errors.description)}
                      helperText={formik.touched.description && formik.errors.description}
                      variant="outlined"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* File Upload Section */}
            <Card sx={{ m: 3, borderRadius: 3, border: '1px solid #e9ecef' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ 
                      background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                      mr: 2
                    }}>
                      <CloudUploadIcon />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {dialogMode === 'create' ? 'File Upload' : 'Update Files'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {dialogMode === 'create' ? 'Upload source and target files for this test set' : 'Replace existing files or keep current ones'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Card sx={{ 
                        borderRadius: 2, 
                        border: formik.values.sourceFile ? '2px solid #667eea' : '2px dashed #dee2e6',
                        backgroundColor: formik.values.sourceFile ? 'rgba(102, 126, 234, 0.05)' : '#fff',
                        transition: 'all 0.3s ease'
                      }}>
                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                          {formik.values.sourceFile ? (
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                                <Avatar sx={{ 
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  mr: 1
                                }}>
                                  <CheckIcon sx={{ fontSize: 12 }} />
                                </Avatar>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea' }}>
                                  Source File Selected
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                {formik.values.sourceFile.name} ({(formik.values.sourceFile.size / 1024).toFixed(1)} KB)
                              </Typography>
                              <Chip 
                                label={formik.values.sourceFile.name}
                                onDelete={() => formik.setFieldValue('sourceFile', null)}
                                deleteIcon={<CloseIcon />}
                                size="small"
                                sx={{ 
                                  mt: 1,
                                  backgroundColor: '#667eea',
                                  color: 'white',
                                  '& .MuiChip-deleteIcon': { color: 'white' }
                                }}
                              />
                            </Box>
                          ) : (
                            <Box>
                              <Avatar sx={{ 
                                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                margin: '0 auto',
                                mb: 2
                              }}>
                                <CloudUploadIcon />
                              </Avatar>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                Source File
                              </Typography>
                              {dialogMode === 'edit' && selectedTestset?.source_file_name ? (
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#17a2b8' }}>
                                    Current: {selectedTestset.source_file_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Choose a new file to replace, or keep current
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                  No file selected
                                </Typography>
                              )}
                              <Button
                                variant="outlined"
                                component="label"
                                startIcon={<UploadIcon />}
                                fullWidth
                                sx={{
                                  borderRadius: 2,
                                  borderColor: 'primary.main',
                                  color: 'primary.main',
                                  textTransform: 'none',
                                  fontWeight: 500,
                                  '&:hover': {
                                    borderColor: 'primary.dark',
                                    backgroundColor: 'primary.50'
                                  }
                                }}
                              >
                                {dialogMode === 'edit' ? 'Replace File' : 'Choose File'}
                                <input
                                  type="file"
                                  hidden
                                  accept=".txt"
                                  onChange={(e) => handleFileChange(e, 'source')}
                                />
                              </Button>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Card sx={{ 
                        borderRadius: 2, 
                        border: formik.values.targetFile ? '2px solid #667eea' : '2px dashed #dee2e6',
                        backgroundColor: formik.values.targetFile ? 'rgba(102, 126, 234, 0.05)' : '#fff',
                        transition: 'all 0.3s ease'
                      }}>
                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                          {formik.values.targetFile ? (
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                                <Avatar sx={{ 
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  mr: 1
                                }}>
                                  <CheckIcon sx={{ fontSize: 12 }} />
                                </Avatar>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea' }}>
                                  Target File Selected
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                {formik.values.targetFile.name} ({(formik.values.targetFile.size / 1024).toFixed(1)} KB)
                              </Typography>
                              <Chip 
                                label={formik.values.targetFile.name}
                                onDelete={() => formik.setFieldValue('targetFile', null)}
                                deleteIcon={<CloseIcon />}
                                size="small"
                                sx={{ 
                                  mt: 1,
                                  backgroundColor: '#667eea',
                                  color: 'white',
                                  '& .MuiChip-deleteIcon': { color: 'white' }
                                }}
                              />
                            </Box>
                          ) : (
                            <Box>
                              <Avatar sx={{ 
                                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                margin: '0 auto',
                                mb: 2
                              }}>
                                <CloudUploadIcon />
                              </Avatar>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                Target File
                              </Typography>
                              {dialogMode === 'edit' && selectedTestset?.target_file_name ? (
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#17a2b8' }}>
                                    Current: {selectedTestset.target_file_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Choose a new file to replace, or keep current
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                  No file selected
                                </Typography>
                              )}
                              <Button
                                variant="outlined"
                                component="label"
                                startIcon={<UploadIcon />}
                                fullWidth
                                sx={{
                                  borderRadius: 2,
                                  borderColor: 'primary.main',
                                  color: 'primary.main',
                                  textTransform: 'none',
                                  fontWeight: 500,
                                  '&:hover': {
                                    borderColor: 'primary.dark',
                                    backgroundColor: 'primary.50'
                                  }
                                }}
                              >
                                {dialogMode === 'edit' ? 'Replace File' : 'Choose File'}
                                <input
                                  type="file"
                                  hidden
                                  accept=".txt"
                                  onChange={(e) => handleFileChange(e, 'target')}
                                />
                              </Button>
                            </Box>
                          )}
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
              onClick={handleCloseDialog}
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
              type="submit"
              variant="contained"
              disabled={formik.isSubmitting || !formik.isValid}
              startIcon={formik.isSubmitting ? <CircularProgress size={16} /> : (dialogMode === 'create' ? <AddIcon /> : <EditIcon />)}
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
              {formik.isSubmitting ? 
                (dialogMode === 'create' ? 'Creating...' : 'Updating...') : 
                (dialogMode === 'create' ? 'Create Test Set' : 'Update Test Set')
              }
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={openConfirmDialog}
        onCancel={() => setOpenConfirmDialog(false)}
        onConfirm={handleDeleteTestset}
        title="Delete Test Set"
        message={`Are you sure you want to delete the test set "${testsetToDelete?.testset_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        confirmColor="error"
      />

      {/* File Content Editor */}
      {testsetForEditing && (
        <FileContentEditor
          open={openFileEditor}
          onClose={handleCloseFileEditor}
          testsetId={testsetForEditing.testset_id}
          testsetName={testsetForEditing.testset_name}
          onSave={() => {
            // Optionally refresh data after save
            fetchTestsets(selectedLangPair ? Number(selectedLangPair) : undefined);
          }}
        />
      )}
    </Box>
  );
};

export default TestsetsPage; 