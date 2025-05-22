import React, { useState } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Button,
  Typography,
  Divider,
  Grid,
  Chip
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DescriptionIcon from '@mui/icons-material/Description';
import ScienceIcon from '@mui/icons-material/Science';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
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
        <Box sx={{ p: 3 }}>
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

  return (
    <Box sx={{ width: '100%' }}>
      {/* Finetuned Model Files Section */}
      <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Finetuned Model Files (GRPO+ORPO)
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {hasModelFiles ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Model File</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip label={modelVersion.model_file_name} sx={{ mr: 1 }} />
                <Button 
                  startIcon={<CloudDownloadIcon />} 
                  size="small" 
                  onClick={() => handleDownloadModelFile('model')}
                >
                  Download
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">HParams File</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip label={modelVersion.hparams_file_name} sx={{ mr: 1 }} />
                <Button 
                  startIcon={<CloudDownloadIcon />} 
                  size="small" 
                  onClick={() => handleDownloadModelFile('hparams')}
                >
                  Download
                </Button>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Typography color="text.secondary">
            No finetuned model files have been uploaded for this version.
          </Typography>
        )}
      </Box>

      {/* Base Model Files Section */}
      <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Base Model Files
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {hasBaseModelFiles ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Base Model File</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip label={modelVersion.base_model_file_name} sx={{ mr: 1 }} />
                <Button 
                  startIcon={<CloudDownloadIcon />} 
                  size="small" 
                  onClick={() => handleDownloadModelFile('base_model')}
                >
                  Download
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Base HParams File</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip label={modelVersion.base_hparams_file_name} sx={{ mr: 1 }} />
                <Button 
                  startIcon={<CloudDownloadIcon />} 
                  size="small" 
                  onClick={() => handleDownloadModelFile('base_hparams')}
                >
                  Download
                </Button>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Typography color="text.secondary">
            No base model files have been uploaded for this version.
          </Typography>
        )}
      </Box>
        
      {/* Evaluation Button */}
      <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Model Evaluation
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon />}
          onClick={handleEvaluationStart}
          disabled={!hasModelFiles && !hasBaseModelFiles}
        >
          Start Evaluation
        </Button>
      </Box>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="model version tabs">
          <Tab icon={<AssessmentIcon />} label="Training Results" id="model-tab-0" />
          <Tab icon={<DescriptionIcon />} label="Release Notes" id="model-tab-1" />
          <Tab icon={<ScienceIcon />} label="Evaluation History" id="model-tab-2" />
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