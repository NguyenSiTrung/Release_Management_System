import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  Pagination,
  SelectChangeEvent,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudDownload as CloudDownloadIcon,
  Upload as UploadIcon,
  Dataset as DatasetIcon,
  Language as LanguageIcon,
  Description as DescriptionIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  FolderOpen as FileIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  List as ListIcon,
  Analytics as AnalyticsIcon,
  ViewList as ViewListIcon,
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
} from '../../services/api';
import { LanguagePair, Testset, TestsetCreate, TestsetUpdate } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmDialog from '../common/ConfirmDialog';

// Validation schema for testset form
const validationSchema = Yup.object({
  testset_name: Yup.string().required('Testset name is required'),
  lang_pair_id: Yup.number().required('Language pair is required'),
  description: Yup.string(),
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`testsets-tabpanel-${index}`}
      aria-labelledby={`testsets-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface TestsetsTabProps {
  initialLangPairId?: number;
}

const TestsetsTab: React.FC<TestsetsTabProps> = ({ initialLangPairId }) => {
  const { isReleaseManager } = useAuth();
  
  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [selectedLangPair, setSelectedLangPair] = useState<number | ''>(initialLangPairId || '');
  const [testsets, setTestsets] = useState<Testset[]>([]);
  const [filteredTestsets, setFilteredTestsets] = useState<Testset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTestsets, setIsLoadingTestsets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Form setup
  const formik = useFormik({
    initialValues: {
      testset_name: '',
      lang_pair_id: initialLangPairId || '',
      description: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const testsetData: TestsetCreate = {
          testset_name: values.testset_name,
          lang_pair_id: Number(values.lang_pair_id),
          description: values.description || undefined,
        };

        if (dialogMode === 'create') {
          await createTestset(testsetData, sourceFile || undefined, targetFile || undefined);
        } else if (dialogMode === 'edit' && selectedTestset) {
          const updateData: TestsetUpdate = {
            testset_name: values.testset_name,
            description: values.description || undefined,
          };
          await updateTestset(selectedTestset.testset_id, updateData);
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
      const data = await getTestsetsPaginated(langPairId, currentPage);
      setTestsets(data.items);
      setFilteredTestsets(data.items);
      setTotalPages(data.pages);
    } catch (err) {
      console.error('Error fetching testsets:', err);
      setError('Failed to load testsets. Please try again.');
    } finally {
      setIsLoadingTestsets(false);
    }
  };

  useEffect(() => {
    fetchLanguagePairs();
  }, []);

  useEffect(() => {
    fetchTestsets(selectedLangPair ? Number(selectedLangPair) : undefined);
  }, [currentPage]);

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

  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    setSelectedTestset(null);
    formik.resetForm();
    setSourceFile(null);
    setTargetFile(null);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (testset: Testset) => {
    setDialogMode('edit');
    setSelectedTestset(testset);
    formik.setValues({
      testset_name: testset.testset_name,
      lang_pair_id: testset.lang_pair_id,
      description: testset.description || '',
    });
    setSourceFile(null);
    setTargetFile(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTestset(null);
    formik.resetForm();
    setSourceFile(null);
    setTargetFile(null);
  };

  const handleOpenDeleteDialog = (testset: Testset) => {
    setTestsetToDelete(testset);
    setOpenConfirmDialog(true);
  };

  const handleDeleteTestset = async () => {
    if (!testsetToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteTestset(testsetToDelete.testset_id);
      setOpenConfirmDialog(false);
      setTestsetToDelete(null);
      await fetchTestsets(selectedLangPair ? Number(selectedLangPair) : undefined);
    } catch (err) {
      console.error('Error deleting testset:', err);
      setError('Failed to delete testset. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getLanguagePairName = (langPairId: number) => {
    const langPair = languagePairs.find(lp => lp.lang_pair_id === langPairId);
    return langPair 
      ? `${langPair.source_language_code}-${langPair.target_language_code}` 
      : 'Unknown';
  };

  if (isLoading) {
    return (
      <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Avatar sx={{ 
            width: 64, 
            height: 64, 
            mx: 'auto', 
            mb: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
          }}>
            <CircularProgress size={40} sx={{ color: 'white' }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Loading Testsets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fetching testsets data...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Statistics component
  const TestsetStats = () => {
    const totalTestsets = filteredTestsets.length;
    const testsetsWithFiles = filteredTestsets.filter(t => t.source_file_name && t.target_file_name).length;
    const selectedLangPairName = selectedLangPair 
      ? getLanguagePairName(Number(selectedLangPair))
      : 'All Language Pairs';

    return (
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ 
              background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
              width: 56,
              height: 56
            }}>
              <AnalyticsIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                Testsets Overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Statistics and summary for {selectedLangPairName}
              </Typography>
            </Box>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                <Typography variant="caption" color="text.secondary">Total Testsets</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {totalTestsets}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                <Typography variant="caption" color="text.secondary">Complete Testsets</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {testsetsWithFiles}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                <Typography variant="caption" color="text.secondary">Language Pairs</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'info.main' }}>
                  {languagePairs.length}
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Management section component
  const TestsetManagement = () => (
    <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ 
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              width: 56,
              height: 56
            }}>
              <DatasetIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                Testset Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create and manage evaluation datasets
              </Typography>
            </Box>
          </Box>
          
          {isReleaseManager && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              sx={{
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                boxShadow: 2,
                '&:hover': {
                  background: 'linear-gradient(135deg, #218838 0%, #1e7e34 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: 4
                }
              }}
            >
              Add New Testset
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header Sections */}
      <TestsetStats />
      <TestsetManagement />

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ borderRadius: 2, mb: 3 }}
          action={
            <Button 
              size="small" 
              onClick={() => fetchTestsets(selectedLangPair ? Number(selectedLangPair) : undefined)}
              sx={{ borderRadius: 2 }}
            >
              <RefreshIcon sx={{ mr: 0.5 }} />
              Retry
            </Button>
          }
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Main Tabs Card */}
      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="testsets tabs"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                '&.Mui-selected': {
                  color: 'primary.main',
                }
              },
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab 
              icon={<ViewListIcon />} 
              label="Testset List" 
              iconPosition="start"
              id="testsets-tab-0" 
            />
            <Tab 
              icon={<AnalyticsIcon />} 
              label="Analytics" 
              iconPosition="start"
              id="testsets-tab-1"
              disabled
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <TabPanel value={tabValue} index={0}>
          {/* Filters */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="language-pair-select-label">Language Pair</InputLabel>
                <Select
                  labelId="language-pair-select-label"
                  value={selectedLangPair}
                  label="Language Pair"
                  onChange={handleLangPairChange}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">
                    <em>All Language Pairs</em>
                  </MenuItem>
                  {languagePairs.map((pair) => (
                    <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LanguageIcon fontSize="small" color="primary" />
                        {pair.source_language_code}-{pair.target_language_code}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search testsets by name or description"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': { borderRadius: 2 } 
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {/* Content */}
          {isLoadingTestsets ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Avatar sx={{ 
                width: 56, 
                height: 56, 
                mx: 'auto', 
                mb: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
              }}>
                <CircularProgress size={30} sx={{ color: 'white' }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Loading Testsets
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we fetch the data...
              </Typography>
            </Box>
          ) : filteredTestsets.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Avatar sx={{ 
                width: 64, 
                height: 64, 
                mx: 'auto', 
                mb: 3,
                backgroundColor: 'grey.100'
              }}>
                <DatasetIcon sx={{ fontSize: 32, color: 'grey.400' }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                No testsets found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm ? 'Try adjusting your search criteria' : 'No testsets available for the selected language pair'}
              </Typography>
              {isReleaseManager && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateDialog}
                  sx={{ 
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  Create First Testset
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 600, borderBottom: '2px solid #e9ecef' }}>
                      Testset Details
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, borderBottom: '2px solid #e9ecef' }}>
                      Language Pair
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, borderBottom: '2px solid #e9ecef' }}>
                      Files
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, borderBottom: '2px solid #e9ecef' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTestsets.map((testset, index) => (
                    <TableRow 
                      key={testset.testset_id}
                      sx={{ 
                        '&:hover': { backgroundColor: '#f8f9fa' },
                        borderBottom: index === filteredTestsets.length - 1 ? 'none' : '1px solid #e9ecef'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ 
                            backgroundColor: 'primary.100',
                            color: 'primary.main',
                            width: 40,
                            height: 40
                          }}>
                            <DatasetIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {testset.testset_name}
                            </Typography>
                            {testset.description && (
                              <Typography variant="body2" color="text.secondary">
                                {testset.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getLanguagePairName(testset.lang_pair_id)}
                          icon={<LanguageIcon />}
                          color="primary"
                          variant="outlined"
                          sx={{ borderRadius: 2 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {testset.source_file_name ? (
                            <Chip 
                              label={`Source: ${testset.source_file_name}`}
                              size="small"
                              color="success"
                              icon={<FileIcon />}
                              onClick={() => handleDownloadFile(testset.testset_id, 'source')}
                              clickable
                              sx={{ borderRadius: 1.5 }}
                            />
                          ) : (
                            <Chip 
                              label="No source file"
                              size="small"
                              color="default"
                              sx={{ borderRadius: 1.5 }}
                            />
                          )}
                          {testset.target_file_name ? (
                            <Chip 
                              label={`Target: ${testset.target_file_name}`}
                              size="small"
                              color="info"
                              icon={<FileIcon />}
                              onClick={() => handleDownloadFile(testset.testset_id, 'target')}
                              clickable
                              sx={{ borderRadius: 1.5 }}
                            />
                          ) : (
                            <Chip 
                              label="No target file"
                              size="small"
                              color="default"
                              sx={{ borderRadius: 1.5 }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {isReleaseManager && (
                            <>
                              <Tooltip title="Edit testset">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => handleOpenEditDialog(testset)}
                                  sx={{ 
                                    borderRadius: 1,
                                    '&:hover': { backgroundColor: 'primary.50' }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete testset">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleOpenDeleteDialog(testset)}
                                  sx={{ 
                                    borderRadius: 1,
                                    '&:hover': { backgroundColor: 'error.50' }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
              <Pagination 
                count={totalPages}
                page={currentPage}
                onChange={(event, page) => setCurrentPage(page)}
                color="primary"
                shape="rounded"
                showFirstButton 
                showLastButton
              />
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Avatar sx={{ 
              width: 64, 
              height: 64, 
              mx: 'auto', 
              mb: 3,
              backgroundColor: 'grey.100'
            }}>
              <AnalyticsIcon sx={{ fontSize: 32, color: 'grey.400' }} />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
              Analytics Coming Soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Advanced testset analytics and insights will be available here
            </Typography>
          </Box>
        </TabPanel>
      </Card>

      {/* Create/Edit Dialog */}
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
            {dialogMode === 'create' ? <AddIcon /> : <EditIcon />}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {dialogMode === 'create' ? 'Create New Testset' : 'Edit Testset'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {dialogMode === 'create' 
                ? 'Add a new testset for model evaluation' 
                : 'Update testset information'
              }
            </Typography>
          </Box>
          <IconButton
            onClick={handleCloseDialog}
            sx={{ 
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <form onSubmit={formik.handleSubmit}>
          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="testset_name"
                  name="testset_name"
                  label="Testset Name"
                  value={formik.values.testset_name}
                  onChange={formik.handleChange}
                  error={formik.touched.testset_name && Boolean(formik.errors.testset_name)}
                  helperText={formik.touched.testset_name && formik.errors.testset_name}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="lang-pair-label">Language Pair</InputLabel>
                  <Select
                    labelId="lang-pair-label"
                    id="lang_pair_id"
                    name="lang_pair_id"
                    value={formik.values.lang_pair_id}
                    onChange={formik.handleChange}
                    label="Language Pair"
                    error={formik.touched.lang_pair_id && Boolean(formik.errors.lang_pair_id)}
                    disabled={dialogMode === 'edit'}
                    sx={{ borderRadius: 2 }}
                  >
                    {languagePairs.map((pair) => (
                      <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LanguageIcon fontSize="small" color="primary" />
                          {pair.source_language_code}-{pair.target_language_code}
                        </Box>
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
                  multiline
                  rows={3}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              
              {dialogMode === 'create' && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }}>
                      <Chip label="File Upload" color="primary" />
                    </Divider>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ borderRadius: 2, borderStyle: 'dashed' }}>
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        <Avatar sx={{ 
                          width: 48, 
                          height: 48, 
                          mx: 'auto', 
                          mb: 2,
                          backgroundColor: 'primary.100',
                          color: 'primary.main'
                        }}>
                          <UploadIcon />
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          Source File
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Upload source language file
                        </Typography>
                        <input
                          accept=".txt,.csv"
                          style={{ display: 'none' }}
                          id="source-file-upload"
                          type="file"
                          onChange={(e) => handleFileChange(e, 'source')}
                        />
                        <label htmlFor="source-file-upload">
                          <Button
                            variant="outlined"
                            component="span"
                            startIcon={<UploadIcon />}
                            sx={{ borderRadius: 2 }}
                          >
                            Choose File
                          </Button>
                        </label>
                        {sourceFile && (
                          <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
                            Selected: {sourceFile.name}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ borderRadius: 2, borderStyle: 'dashed' }}>
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        <Avatar sx={{ 
                          width: 48, 
                          height: 48, 
                          mx: 'auto', 
                          mb: 2,
                          backgroundColor: 'success.100',
                          color: 'success.main'
                        }}>
                          <UploadIcon />
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          Target File
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Upload target language file
                        </Typography>
                        <input
                          accept=".txt,.csv"
                          style={{ display: 'none' }}
                          id="target-file-upload"
                          type="file"
                          onChange={(e) => handleFileChange(e, 'target')}
                        />
                        <label htmlFor="target-file-upload">
                          <Button
                            variant="outlined"
                            component="span"
                            startIcon={<UploadIcon />}
                            color="success"
                            sx={{ borderRadius: 2 }}
                          >
                            Choose File
                          </Button>
                        </label>
                        {targetFile && (
                          <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
                            Selected: {targetFile.name}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, backgroundColor: '#f8f9fa' }}>
            <Button 
              onClick={handleCloseDialog}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              variant="contained"
              disabled={formik.isSubmitting}
              startIcon={formik.isSubmitting ? <CircularProgress size={16} /> : <SaveIcon />}
              sx={{ 
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {formik.isSubmitting 
                ? 'Saving...' 
                : dialogMode === 'create' 
                  ? 'Create Testset' 
                  : 'Update Testset'
              }
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={openConfirmDialog}
        title="Delete Testset"
        message={`Are you sure you want to delete "${testsetToDelete?.testset_name}"? This action cannot be undone.`}
        confirmText="Delete"
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

export default TestsetsTab; 