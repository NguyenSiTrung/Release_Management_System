import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Avatar,
  Chip,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  TextFields as TextFieldsIcon,
} from '@mui/icons-material';
import { getTestsetFileContent, updateTestsetFileContent, downloadTestsetFile } from '../../services/api';

interface FileContentEditorProps {
  open: boolean;
  onClose: () => void;
  testsetId: number;
  testsetName: string;
  onSave?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`file-content-tabpanel-${index}`}
      aria-labelledby={`file-content-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2, height: '100%' }}>{children}</Box>}
    </div>
  );
};

const FileContentEditor: React.FC<FileContentEditorProps> = ({
  open,
  onClose,
  testsetId,
  testsetName,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [sourceContent, setSourceContent] = useState('');
  const [targetContent, setTargetContent] = useState('');
  const [originalSourceContent, setOriginalSourceContent] = useState('');
  const [originalTargetContent, setOriginalTargetContent] = useState('');
  const [sourceFilename, setSourceFilename] = useState('');
  const [targetFilename, setTargetFilename] = useState('');
  const [sourceInfo, setSourceInfo] = useState<{ lines: number; size: number } | null>(null);
  const [targetInfo, setTargetInfo] = useState<{ lines: number; size: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadFileContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading file content for testset:', testsetId);
      
      // Load both source and target files
      const [sourceData, targetData] = await Promise.all([
        getTestsetFileContent(testsetId, 'source').catch((err) => {
          console.error('Error loading source file:', err);
          return null;
        }),
        getTestsetFileContent(testsetId, 'target').catch((err) => {
          console.error('Error loading target file:', err);
          return null;
        })
      ]);

      console.log('Source data:', sourceData);
      console.log('Target data:', targetData);

      if (sourceData) {
        setSourceContent(sourceData.content);
        setOriginalSourceContent(sourceData.content);
        setSourceFilename(sourceData.filename);
        setSourceInfo({ lines: sourceData.lines_count, size: sourceData.size_bytes });
      }

      if (targetData) {
        setTargetContent(targetData.content);
        setOriginalTargetContent(targetData.content);
        setTargetFilename(targetData.filename);
        setTargetInfo({ lines: targetData.lines_count, size: targetData.size_bytes });
      }

      if (!sourceData && !targetData) {
        setError('No file content could be loaded. Please check if files exist.');
      }
    } catch (err: any) {
      console.error('Error in loadFileContent:', err);
      setError('Failed to load file content: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }, [testsetId]);

  useEffect(() => {
    if (open) {
      loadFileContent();
    } else {
      // Reset state when closing
      setActiveTab(0);
      setEditMode(false);
      setError(null);
      setSuccess(null);
    }
  }, [open, testsetId, loadFileContent]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const promises = [];
      
      // Save source file if changed
      if (sourceContent !== originalSourceContent) {
        promises.push(updateTestsetFileContent(testsetId, 'source', sourceContent));
      }
      
      // Save target file if changed
      if (targetContent !== originalTargetContent) {
        promises.push(updateTestsetFileContent(testsetId, 'target', targetContent));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        setOriginalSourceContent(sourceContent);
        setOriginalTargetContent(targetContent);
        setSuccess('File content updated successfully!');
        setEditMode(false);
        
        // Update file info
        setSourceInfo({ 
          lines: sourceContent.split('\n').length, 
          size: new Blob([sourceContent]).size 
        });
        setTargetInfo({ 
          lines: targetContent.split('\n').length, 
          size: new Blob([targetContent]).size 
        });

        onSave?.();
      } else {
        setSuccess('No changes to save.');
      }
    } catch (err: any) {
      setError('Failed to save content: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (fileType: 'source' | 'target') => {
    try {
      const blob = await downloadTestsetFile(testsetId, fileType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileType === 'source' ? sourceFilename : targetFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download file: ' + (err.response?.data?.detail || err.message));
    }
  };

  const hasChanges = sourceContent !== originalSourceContent || targetContent !== originalTargetContent;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth
      sx={{ 
        '& .MuiDialog-paper': { 
          height: '90vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        },
        zIndex: 1500 // Ensure dialog is above footer
      }}
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
          <TextFieldsIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            File Content Editor
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {testsetName} - View and edit file content inline
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh content">
            <IconButton
              onClick={loadFileContent}
              disabled={loading}
              sx={{ 
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={onClose}
            sx={{ 
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ 
        p: 0, 
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1,
        overflow: 'auto',
        minHeight: 0 // Allow flex shrinking
      }}>
        {loading && <LinearProgress />}
        
        {error && (
          <Alert severity="error" sx={{ m: 3, mb: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Error loading file content:
              </Typography>
              <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                {error}
              </Typography>
            </Box>
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ m: 3, mb: 2 }}>
            {success}
          </Alert>
        )}

        {!loading && !error && !sourceContent && !targetContent && (
          <Alert severity="info" sx={{ m: 3, mb: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                No file content available
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                This testset might not have any files uploaded, or there might be an issue accessing the files.
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Troubleshooting:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 2, fontSize: '0.875rem' }}>
                <li>Check if the backend server is running (port 8000)</li>
                <li>Verify that files exist in storage/testsets/{testsetId}/</li>
                <li>Check browser console for detailed error messages</li>
                <li>Ensure you have proper permissions to access this testset</li>
              </Typography>
            </Box>
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextFieldsIcon sx={{ fontSize: 18 }} />
                  Source File
                  {sourceFilename && (
                    <Chip size="small" label={sourceFilename} sx={{ ml: 1, fontSize: '0.7rem' }} />
                  )}
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextFieldsIcon sx={{ fontSize: 18 }} />
                  Target File
                  {targetFilename && (
                    <Chip size="small" label={targetFilename} sx={{ ml: 1, fontSize: '0.7rem' }} />
                  )}
                </Box>
              } 
            />
          </Tabs>
        </Box>

        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          minHeight: 0 // Important for flex containers
        }}>
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ 
              px: 3, 
              pb: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {sourceInfo && (
                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexShrink: 0 }}>
                  <Chip 
                    icon={<InfoIcon />} 
                    label={`${sourceInfo.lines} lines`} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={formatBytes(sourceInfo.size)} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload('source')}
                      variant="outlined"
                      sx={{ borderRadius: 2 }}
                    >
                      Download
                    </Button>
                  </Box>
                </Box>
              )}
              <TextField
                fullWidth
                multiline
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
                placeholder="Source file content will appear here..."
                variant="outlined"
                disabled={!editMode || loading}
                sx={{ 
                  flex: 1,
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    height: '100%',
                    '& textarea': {
                      height: '100% !important',
                      overflow: 'auto !important'
                    }
                  } 
                }}
              />
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Box sx={{ 
              px: 3, 
              pb: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {targetInfo && (
                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexShrink: 0 }}>
                  <Chip 
                    icon={<InfoIcon />} 
                    label={`${targetInfo.lines} lines`} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={formatBytes(targetInfo.size)} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload('target')}
                      variant="outlined"
                      sx={{ borderRadius: 2 }}
                    >
                      Download
                    </Button>
                  </Box>
                </Box>
              )}
              <TextField
                fullWidth
                multiline
                value={targetContent}
                onChange={(e) => setTargetContent(e.target.value)}
                placeholder="Target file content will appear here..."
                variant="outlined"
                disabled={!editMode || loading}
                sx={{ 
                  flex: 1,
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    height: '100%',
                    '& textarea': {
                      height: '100% !important',
                      overflow: 'auto !important'
                    }
                  } 
                }}
              />
            </Box>
          </TabPanel>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        borderTop: '1px solid #e9ecef',
        p: 3,
        gap: 2,
        background: '#f8f9fa',
        flexShrink: 0 // Prevent shrinking
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
          {hasChanges && (
            <Chip 
              icon={<EditIcon />}
              label="Unsaved changes" 
              color="warning" 
              size="small" 
            />
          )}
        </Box>
        
        {!editMode ? (
          <Button
            startIcon={<EditIcon />}
            onClick={() => setEditMode(true)}
            variant="contained"
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            Edit Mode
          </Button>
        ) : (
          <>
            <Button
              startIcon={<ViewIcon />}
              onClick={() => {
                setEditMode(false);
                // Reset content to original if there are unsaved changes
                setSourceContent(originalSourceContent);
                setTargetContent(originalTargetContent);
              }}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              View Mode
            </Button>
            <Button
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || !hasChanges}
              variant="contained"
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #218838 0%, #1aa085 100%)',
                }
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        )}
        
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileContentEditor; 