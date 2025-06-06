import React, { useState } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  Science as ScienceIcon,
  PlayArrow as PlayArrowIcon,

  GetApp as DownloadIcon,
  FolderOpen as FileIcon,
} from '@mui/icons-material';
import TrainingResults from '../TrainingResult/TrainingResults';
import ReleaseNoteDetail from '../ReleaseNote/ReleaseNoteDetail';
import EvaluationStart from '../Evaluation/EvaluationStart';
import EvaluationProgress from '../Evaluation/EvaluationProgress';
import EvaluationHistory from '../Evaluation/EvaluationHistory';
import { ModelVersion, ReleaseNote, TrainingResult, Testset } from '../../types';
import { downloadModelFile } from '../../services/modelVersionService';

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
      id={`model-tabpanel-${index}`}
      aria-labelledby={`model-tab-${index}`}
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

interface ModelVersionDetailsTabsProps {
  modelVersion: ModelVersion;
  onRefresh: () => void;
  releaseNote?: ReleaseNote | null;
  trainingResults?: TrainingResult[];
  testsets?: Testset[];
  onAddTrainingResult?: () => void;
  onEditReleaseNote?: () => void;
}

const ModelVersionDetailsTabs: React.FC<ModelVersionDetailsTabsProps> = ({ 
  modelVersion,
  onRefresh,
  releaseNote = null,
  trainingResults = [],
  testsets = [],
  onAddTrainingResult,
  onEditReleaseNote
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [evaluationProgressOpen, setEvaluationProgressOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEvaluationStart = () => {
    setEvaluationDialogOpen(true);
  };

  const handleEvaluationClose = () => {
    setEvaluationDialogOpen(false);
  };

  const handleEvaluationStarted = (jobId: number) => {
    setCurrentJobId(jobId);
    setEvaluationProgressOpen(true);
  };

  const handleEvaluationProgressClose = () => {
    setEvaluationProgressOpen(false);
    onRefresh(); // Refresh data when closing the progress dialog
  };

  const handleViewJob = (jobId: number) => {
    setCurrentJobId(jobId);
    setEvaluationProgressOpen(true);
  };

  const handleDownloadModelFile = async (fileType: 'model' | 'hparams' | 'base_model' | 'base_hparams') => {
    try {
      const fileBlob = await downloadModelFile(modelVersion.version_id, fileType);
      
      // Create download link
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set file name based on file type
      let fileName;
      if (fileType === 'model') {
        fileName = modelVersion.model_file_name || `model_${modelVersion.version_id}.bin`;
      } else if (fileType === 'hparams') {
        fileName = modelVersion.hparams_file_name || `hparams_${modelVersion.version_id}.json`;
      } else if (fileType === 'base_model') {
        fileName = modelVersion.base_model_file_name || `base_model_${modelVersion.version_id}.bin`;
      } else {
        fileName = modelVersion.base_hparams_file_name || `base_hparams_${modelVersion.version_id}.json`;
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
      alert(`Failed to download ${fileType} file. Please try again.`);
    }
  };

  const hasModelFiles = Boolean(modelVersion.model_file_name && modelVersion.hparams_file_name);
  const hasBaseModelFiles = Boolean(modelVersion.base_model_file_name && modelVersion.base_hparams_file_name);

  const FileCard = ({ title, fileName, fileType, icon, avatarColor }: { 
    title: string; 
    fileName: string | null | undefined; 
    fileType: 'model' | 'hparams' | 'base_model' | 'base_hparams';
    icon: React.ReactNode;
    avatarColor?: string;
  }) => (
    <Card 
      sx={{ 
        height: '100%',
        borderRadius: 3,
        border: '1px solid',
        borderColor: fileName ? 'primary.200' : 'grey.300',
        boxShadow: fileName ? 2 : 1,
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
            width: 40,
            height: 40,
            mr: 2
          }}>
            {icon}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {title}
          </Typography>
        </Box>
        
        {fileName ? (
          <Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 3,
              p: 2.5,
              backgroundColor: '#f8f9fa',
              borderRadius: 2,
              border: '1px solid #e9ecef',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Avatar sx={{ 
                width: 32, 
                height: 32, 
                mr: 2,
                backgroundColor: 'success.main'
              }}>
                <FileIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography variant="body2" sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 0.5
                }}>
                  File Name
                </Typography>
                <Typography variant="body2" sx={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  color: 'text.secondary',
                  backgroundColor: 'white',
                  padding: '4px 8px',
                  borderRadius: 1,
                  border: '1px solid #e9ecef'
                }}>
                  {fileName}
                </Typography>
              </Box>
            </Box>
            
            <Button 
              variant="contained"
              startIcon={<DownloadIcon />} 
              size="medium" 
              fullWidth
              onClick={() => handleDownloadModelFile(fileType)}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                boxShadow: 2,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: 4
                }
              }}
            >
              Download File
            </Button>
          </Box>
        ) : (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: 2,
            border: '2px dashed #dee2e6',
            position: 'relative'
          }}>
            <Avatar sx={{ 
              width: 48, 
              height: 48, 
              mx: 'auto',
              mb: 2,
              backgroundColor: 'grey.300',
              color: 'grey.500'
            }}>
              <FileIcon sx={{ fontSize: 24 }} />
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
              No file uploaded
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload a file to enable download
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Finetuned Model Files Section */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              width: 56,
              height: 56
            }}>
              <AssessmentIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                Finetuned Model Files
              </Typography>
              <Typography variant="body2" color="text.secondary">
                GRPO + ORPO optimized models for enhanced performance
              </Typography>
            </Box>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FileCard
                title="Model File"
                fileName={modelVersion.model_file_name}
                fileType="model"
                icon={<FileIcon />}
                avatarColor="linear-gradient(135deg, #28a745 0%, #20c997 100%)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FileCard
                title="HParams File"
                fileName={modelVersion.hparams_file_name}
                fileType="hparams"
                icon={<DescriptionIcon />}
                avatarColor="linear-gradient(135deg, #17a2b8 0%, #138496 100%)"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Base Model Files Section */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ 
              background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
              width: 56,
              height: 56
            }}>
              <ScienceIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                Base Model Files
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Original baseline models for comparison and reference
              </Typography>
            </Box>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FileCard
                title="Base Model File"
                fileName={modelVersion.base_model_file_name}
                fileType="base_model"
                icon={<FileIcon />}
                avatarColor="linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FileCard
                title="Base HParams File"
                fileName={modelVersion.base_hparams_file_name}
                fileType="base_hparams"
                icon={<DescriptionIcon />}
                avatarColor="linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
        
      {/* Evaluation Section */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ 
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                width: 56,
                height: 56
              }}>
                <PlayArrowIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Model Evaluation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Run comprehensive evaluation on testsets
                </Typography>
              </Box>
            </Box>
            
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleEvaluationStart}
              disabled={!hasModelFiles && !hasBaseModelFiles}
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
                },
                '&:disabled': {
                  background: '#e9ecef',
                  color: '#6c757d'
                }
              }}
            >
              Start Evaluation
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="model version tabs"
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
              icon={<AssessmentIcon />} 
              label="Training Results" 
              iconPosition="start"
              id="model-tab-0" 
            />
            <Tab 
              icon={<DescriptionIcon />} 
              label="Release Notes" 
              iconPosition="start"
              id="model-tab-1" 
            />
            <Tab 
              icon={<ScienceIcon />} 
              label="Evaluation History" 
              iconPosition="start"
              id="model-tab-2" 
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <TabPanel value={tabValue} index={0}>
          <TrainingResults 
            versionId={modelVersion.version_id} 
            trainingResults={trainingResults || []} 
            testsets={testsets}
            onRefresh={onRefresh}
            onAddClick={onAddTrainingResult}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <ReleaseNoteDetail 
            versionId={modelVersion.version_id} 
            releaseNote={releaseNote} 
            onRefresh={onRefresh}
            onAddClick={!releaseNote ? onEditReleaseNote : undefined}
            onEditClick={releaseNote ? onEditReleaseNote : undefined}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <EvaluationHistory 
            versionId={modelVersion.version_id} 
            onViewJob={handleViewJob} 
          />
        </TabPanel>
      </Card>

      {/* Evaluation Dialogs */}
      <EvaluationStart 
        open={evaluationDialogOpen} 
        onClose={handleEvaluationClose} 
        versionId={modelVersion.version_id}
        langPairId={modelVersion.lang_pair_id}
        modelVersion={modelVersion}
        onEvaluationStarted={handleEvaluationStarted}
      />
      
      {currentJobId && (
        <EvaluationProgress 
          open={evaluationProgressOpen} 
          onClose={handleEvaluationProgressClose} 
          jobId={currentJobId}
        />
      )}
    </Box>
  );
};

export default ModelVersionDetailsTabs; 