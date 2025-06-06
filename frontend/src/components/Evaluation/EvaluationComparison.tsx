import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Typography,
  Card,
  CardContent,
  Box,
  Paper,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  Avatar,
  Stack,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { 
  Download, 
   
  ViewArray,
  ViewColumn,
  CompareArrows,
  Close,
  ArrowBack,
  Analytics as AnalyticsIcon,
  DifferenceOutlined as DifferenceIcon,
  AssessmentOutlined as AssessmentIcon,
  GpsFixed as TargetIcon,
  PlaylistPlay as PlaylistIcon,
} from '@mui/icons-material';
import evaluationService from '../../services/evaluationService';
import testsetService from '../../services/testsetService';

interface EvaluationComparisonProps {
  visible: boolean;
  onClose: () => void;
  jobId: number;
  testsetId: number;
  jobDetails?: any;
}

// Simple diff function to compare two strings and highlight differences
const computeLineDiff = (text1: string, text2: string) => {
  console.log('=== computeLineDiff Debug ===');
  console.log('text1 length:', text1.length);
  console.log('text2 length:', text2.length);
  console.log('text1 first 100 chars:', text1.substring(0, 100));
  console.log('text2 first 100 chars:', text2.substring(0, 100));
  
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const maxLines = Math.max(lines1.length, lines2.length);
  
  console.log('lines1 length:', lines1.length);
  console.log('lines2 length:', lines2.length);
  console.log('maxLines:', maxLines);
  
  const result = [];
  for (let i = 0; i < maxLines; i++) {
    const line1 = lines1[i] || '';
    const line2 = lines2[i] || '';
    
    result.push({
      lineNumber: i + 1,
      left: line1,
      right: line2,
      isDifferent: line1 !== line2,
      leftExists: i < lines1.length,
      rightExists: i < lines2.length
    });
  }
  
  console.log('result length:', result.length);
  console.log('result sample (first 3):', result.slice(0, 3));
  
  return result;
};

// Function to highlight word-level differences within a line
// const highlightWordDiff = (text1: string, text2: string) => {
//   if (text1 === text2) return { left: text1, right: text2 };
//   
//   const words1 = text1.split(' ');
//   const words2 = text2.split(' ');
//   const maxLength = Math.max(words1.length, words2.length);
//   
//   let leftResult = '';
//   let rightResult = '';
//   
//   for (let i = 0; i < maxLength; i++) {
//     const word1 = words1[i] || '';
//     const word2 = words2[i] || '';
//     
//     if (word1 !== word2) {
//       // Different words - highlight them
//       if (word1) {
//         leftResult += `<span style="background-color: #ffcdd2; padding: 1px 2px; border-radius: 2px; margin: 0 1px;">${word1}</span>`;
//       }
//       if (word2) {
//         rightResult += `<span style="background-color: #c8e6c9; padding: 1px 2px; border-radius: 2px; margin: 0 1px;">${word2}</span>`;
//       }
//     } else {
//       // Same words
//       leftResult += word1;
//       rightResult += word2;
//     }
//     
//     // Add space if not the last word
//     if (i < maxLength - 1) {
//       leftResult += ' ';
//       rightResult += ' ';
//     }
//   }
//   
//   return { left: leftResult, right: rightResult };
// };

// Function to highlight character-level differences within a line
const highlightCharDiff = (text1: string, text2: string) => {
  if (text1 === text2) return { left: text1, right: text2 };
  
  // Simple character-by-character comparison
  const chars1 = text1.split('');
  const chars2 = text2.split('');
  const maxLength = Math.max(chars1.length, chars2.length);
  
  let leftResult = '';
  let rightResult = '';
  
  for (let i = 0; i < maxLength; i++) {
    const char1 = chars1[i] || '';
    const char2 = chars2[i] || '';
    
    if (char1 !== char2) {
      leftResult += `<span style="background-color: #ffebee; color: #c62828;">${char1 || ''}</span>`;
      rightResult += `<span style="background-color: #e8f5e8; color: #2e7d32;">${char2 || ''}</span>`;
    } else {
      leftResult += char1;
      rightResult += char2;
    }
  }
  
  return { left: leftResult, right: rightResult };
};

// Component to render diff comparison
const DiffLineRenderer: React.FC<{
  diffData: any[];
  leftTitle: string;
  rightTitle: string;
  leftColor?: string;
  rightColor?: string;
}> = ({ diffData, leftTitle, rightTitle, leftColor = 'secondary', rightColor = 'primary' }) => {
  
  // Debug logging
  console.log('=== DiffLineRenderer Debug ===');
  console.log('leftTitle:', leftTitle);
  console.log('rightTitle:', rightTitle);
  console.log('diffData length:', diffData.length);
  console.log('diffData sample:', diffData.slice(0, 3));
  
  return (
    <Grid container>
      <Grid item xs={6} sx={{ borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight="bold" color={leftColor}>
            {leftTitle}
          </Typography>
        </Box>
        <Box>
          {diffData.map((diff, index) => {
            const charDiff = highlightCharDiff(diff.left, diff.right);
            return (
              <Box
                key={`left-${index}`}
                sx={{
                  p: 1,
                  minHeight: 24,
                  borderBottom: '1px solid #f5f5f5',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  bgcolor: diff.isDifferent ? '#ffebee' : (index % 2 === 0 ? '#ffffff' : '#fafafa'),
                  display: 'flex',
                  borderLeft: diff.isDifferent ? '3px solid #f44336' : 'none'
                }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                >
                  {diff.leftExists ? diff.lineNumber : ''}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ fontFamily: 'monospace', flex: 1, whiteSpace: 'pre-wrap' }}
                >
                  {/* Use regular text instead of dangerouslySetInnerHTML for now to debug */}
                  {diff.left || '\u00A0'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Grid>
      
      <Grid item xs={6}>
        <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight="bold" color={rightColor}>
            {rightTitle}
          </Typography>
        </Box>
        <Box>
          {diffData.map((diff, index) => {
            const charDiff = highlightCharDiff(diff.left, diff.right);
            return (
              <Box
                key={`right-${index}`}
                sx={{
                  p: 1,
                  minHeight: 24,
                  borderBottom: '1px solid #f5f5f5',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  bgcolor: diff.isDifferent ? '#e8f5e8' : (index % 2 === 0 ? '#ffffff' : '#fafafa'),
                  display: 'flex',
                  borderLeft: diff.isDifferent ? '3px solid #4caf50' : 'none'
                }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                >
                  {diff.rightExists ? diff.lineNumber : ''}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ fontFamily: 'monospace', flex: 1, whiteSpace: 'pre-wrap' }}
                >
                  {/* Use regular text instead of dangerouslySetInnerHTML for now to debug */}
                  {diff.right || '\u00A0'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Grid>
    </Grid>
  );
};

// Component to render 3-column diff comparison
const ThreeColumnDiffRenderer: React.FC<{
  baseContent: string;
  finetunedContent: string;
  referenceContent: string;
  baseVsRefDiff: any[];
  finetunedVsRefDiff: any[];
}> = ({ baseContent, finetunedContent, referenceContent, baseVsRefDiff, finetunedVsRefDiff }) => {
  
  const baseLines = baseContent.split('\n');
  const finetunedLines = finetunedContent.split('\n');
  const referenceLines = referenceContent.split('\n');
  const maxLines = Math.max(baseLines.length, finetunedLines.length, referenceLines.length);
  
  return (
    <Grid container>
      {/* Base Model Column */}
      <Grid item xs={4} sx={{ borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight="bold" color="secondary">
            Base Model (Diff vs Reference)
          </Typography>
        </Box>
        <Box>
          {Array.from({ length: maxLines }, (_, index) => {
            const baseLine = baseLines[index] || '';
            const referenceLine = referenceLines[index] || '';
            const isDifferent = baseLine !== referenceLine;
            
            return (
              <Box
                key={`base-${index}`}
                sx={{
                  p: 1,
                  minHeight: 24,
                  borderBottom: '1px solid #f5f5f5',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  bgcolor: isDifferent ? '#ffebee' : (index % 2 === 0 ? '#ffffff' : '#fafafa'),
                  display: 'flex',
                  borderLeft: isDifferent ? '3px solid #f44336' : 'none'
                }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                >
                  {index + 1}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ fontFamily: 'monospace', flex: 1, whiteSpace: 'pre-wrap' }}
                >
                  {baseLine || '\u00A0'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Grid>
      
      {/* Finetuned Model Column */}
      <Grid item xs={4} sx={{ borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight="bold" color="primary">
            Finetuned Model (Diff vs Reference)
          </Typography>
        </Box>
        <Box>
          {Array.from({ length: maxLines }, (_, index) => {
            const finetunedLine = finetunedLines[index] || '';
            const referenceLine = referenceLines[index] || '';
            const isDifferent = finetunedLine !== referenceLine;
            
            return (
              <Box
                key={`finetuned-${index}`}
                sx={{
                  p: 1,
                  minHeight: 24,
                  borderBottom: '1px solid #f5f5f5',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  bgcolor: isDifferent ? '#e3f2fd' : (index % 2 === 0 ? '#ffffff' : '#fafafa'),
                  display: 'flex',
                  borderLeft: isDifferent ? '3px solid #2196f3' : 'none'
                }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                >
                  {index + 1}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ fontFamily: 'monospace', flex: 1, whiteSpace: 'pre-wrap' }}
                >
                  {finetunedLine || '\u00A0'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Grid>
      
      {/* Reference Column */}
      <Grid item xs={4}>
        <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight="bold" color="success.main">
            Reference Target
          </Typography>
        </Box>
        <Box>
          {Array.from({ length: maxLines }, (_, index) => {
            const referenceLine = referenceLines[index] || '';
            
            return (
              <Box
                key={`reference-${index}`}
                sx={{
                  p: 1,
                  minHeight: 24,
                  borderBottom: '1px solid #f5f5f5',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                  display: 'flex'
                }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                >
                  {index + 1}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ fontFamily: 'monospace', flex: 1, whiteSpace: 'pre-wrap' }}
                >
                  {referenceLine || '\u00A0'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Grid>
    </Grid>
  );
};

const EvaluationComparison: React.FC<EvaluationComparisonProps> = ({
  visible,
  onClose,
  jobId,
  testsetId,
  jobDetails
}) => {
  const [loading, setLoading] = useState(false);
  const [outputContent, setOutputContent] = useState<string>('');
  const [baseOutputContent, setBaseOutputContent] = useState<string>('');
  const [referenceContent, setReferenceContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [comparisonMode, setComparisonMode] = useState<'3-column' | '2-column' | 'base-vs-ref' | 'finetuned-vs-ref'>('3-column');
  const [showDiffMode, setShowDiffMode] = useState<boolean>(false);

  // Check if this is a 'both' evaluation
  const isBothModels = jobDetails?.evaluation_model_type === 'both';

  // Split content into lines for side-by-side comparison
  const outputLines = outputContent.split('\n');
  const baseOutputLines = baseOutputContent.split('\n');
  const referenceLines = referenceContent.split('\n');

  // Compute diff data for different comparison modes
  const baseVsFinetuned = computeLineDiff(baseOutputContent, outputContent);
  const finetunedVsReference = computeLineDiff(outputContent, referenceContent);
  const baseVsReference = computeLineDiff(baseOutputContent, referenceContent);

  const loadContent = async () => {
    setLoading(true);
    setError('');
    
    console.log('=== loadContent Debug ===');
    console.log('isBothModels:', isBothModels);
    console.log('comparisonMode:', comparisonMode);
    
    try {
      if (isBothModels) {
        // Check if we need reference content
        const needsReference = comparisonMode === '3-column' || comparisonMode === 'base-vs-ref' || comparisonMode === 'finetuned-vs-ref';
        
        if (needsReference) {
          // Load all content including reference
          console.log('Loading data with reference...');
          const [baseOutputData, finetunedOutputData, referenceData] = await Promise.all([
            evaluationService.getOutputContent(jobId, 'base'),
            evaluationService.getOutputContent(jobId, 'finetuned'),
            testsetService.getReferenceFileContent(testsetId)
          ]);
          
          console.log('baseOutputData length:', baseOutputData.length);
          console.log('finetunedOutputData length:', finetunedOutputData.length);
          console.log('referenceData length:', referenceData.length);
          
          setBaseOutputContent(baseOutputData);
          setOutputContent(finetunedOutputData);
          setReferenceContent(referenceData);
        } else {
          // Load only base and finetuned model content (for 2-column mode)
          console.log('Loading 2-column data...');
          const [baseOutputData, finetunedOutputData] = await Promise.all([
            evaluationService.getOutputContent(jobId, 'base'),
            evaluationService.getOutputContent(jobId, 'finetuned')
          ]);
          
          console.log('baseOutputData length:', baseOutputData.length);
          console.log('finetunedOutputData length:', finetunedOutputData.length);
          
          setBaseOutputContent(baseOutputData);
          setOutputContent(finetunedOutputData);
          setReferenceContent(''); // Clear reference content for models-only comparison
        }
      } else {
        // Load only finetuned model and reference content
        console.log('Loading single model data...');
        const [outputData, referenceData] = await Promise.all([
          evaluationService.getOutputContent(jobId, 'finetuned'),
          testsetService.getReferenceFileContent(testsetId)
        ]);
        
        console.log('outputData length:', outputData.length);
        console.log('referenceData length:', referenceData.length);
        
        setOutputContent(outputData);
        setReferenceContent(referenceData);
      }
    } catch (err: any) {
      console.error('Error loading content:', err);
      setError(err.response?.data?.detail || 'Failed to load file content');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (modelType: string = 'finetuned') => {
    try {
      const blob = await evaluationService.downloadOutputFile(jobId, modelType);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `evaluation_output_${modelType}_${jobId}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading file:', err);
      setError(err.response?.data?.detail || 'Failed to download file');
    }
  };

  useEffect(() => {
    if (visible) {
      // Debug logging
      console.log('=== DEBUG: EvaluationComparison ===');
      console.log('jobDetails:', jobDetails);
      console.log('isBothModels:', isBothModels);
      if (jobDetails?.result) {
        console.log('jobDetails.result:', jobDetails.result);
      }
      
      loadContent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, jobId, testsetId, comparisonMode]);

  return (
    <Dialog
      open={visible}
      onClose={onClose}
      fullScreen
      TransitionProps={{
        timeout: 300
      }}
    >
      <AppBar 
        position="relative" 
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: 3
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onClose}
            aria-label="back"
            sx={{ 
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <ArrowBack />
          </IconButton>
          
          <Avatar sx={{ 
            backgroundColor: 'rgba(255,255,255,0.2)',
            width: 32,
            height: 32
          }}>
            <CompareArrows sx={{ fontSize: 18 }} />
          </Avatar>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              Evaluation Results Comparison
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.8rem' }}>
              {jobDetails ? (
                <>Job #{jobId} • {jobDetails.model_version_name} • {jobDetails.testset_name}</>
              ) : (
                <>Job #{jobId} • Side-by-side translation analysis</>
              )}
            </Typography>
          </Box>
          
          {/* Diff Mode Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={showDiffMode}
                onChange={(e) => setShowDiffMode(e.target.checked)}
                sx={{ 
                  '& .MuiSwitch-switchBase.Mui-checked': { color: 'white' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { 
                    backgroundColor: 'rgba(255,255,255,0.3)' 
                  }
                }}
              />
            }
            label={
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                color: 'white'
              }}>
                <DifferenceIcon sx={{ mr: 0.5, fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Diff Mode
                </Typography>
              </Box>
            }
            sx={{ m: 0 }}
          />
          
          {/* Download Actions */}
          {isBothModels ? (
            <>
              <Tooltip title="Download base model output">
                <IconButton
                  color="inherit"
                  onClick={() => handleDownload('base')}
                  sx={{ 
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  <Download />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download finetuned model output">
                <IconButton
                  color="inherit"
                  onClick={() => handleDownload('finetuned')}
                  sx={{ 
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  <Download />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Download output file">
              <IconButton
                color="inherit"
                onClick={() => handleDownload()}
                sx={{ 
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <Download />
              </IconButton>
            </Tooltip>
          )}
          
          <IconButton
            color="inherit"
            onClick={onClose}
            aria-label="close"
            sx={{ 
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <Close />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          {/* Comparison Mode Selector */}
          {isBothModels && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                View Mode:
              </Typography>
              <ToggleButtonGroup
                value={comparisonMode}
                exclusive
                onChange={(event, newMode) => {
                  if (newMode !== null) {
                    setComparisonMode(newMode);
                  }
                }}
                aria-label="comparison mode"
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      }
                    }
                  }
                }}
              >
                <ToggleButton value="3-column" aria-label="3 column view">
                  <ViewArray sx={{ mr: 0.5, fontSize: 18 }} />
                  All 3 Columns
                </ToggleButton>
                <ToggleButton value="2-column" aria-label="2 column view">
                  <ViewColumn sx={{ mr: 0.5, fontSize: 18 }} />
                  Models Only
                </ToggleButton>
                <ToggleButton value="base-vs-ref" aria-label="base vs reference">
                  <AssessmentIcon sx={{ mr: 0.5, fontSize: 18 }} />
                  Base vs Ref
                </ToggleButton>
                <ToggleButton value="finetuned-vs-ref" aria-label="finetuned vs reference">
                  <TargetIcon sx={{ mr: 0.5, fontSize: 18 }} />
                  Finetuned vs Ref
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
        </Box>
        
        <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        
        {loading ? (
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
                Loading File Content
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fetching translation outputs and references...
              </Typography>
            </CardContent>
          </Card>
        ) : error ? (
          <Alert 
            severity="error" 
            sx={{ borderRadius: 2, mb: 3 }}
            action={
              <Button size="small" onClick={loadContent} sx={{ borderRadius: 2 }}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : (
          <Box>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {isBothModels ? (
                comparisonMode === '3-column' ? (
                  <>
                    <Grid item xs={4}>
                      <Card sx={{ borderRadius: 3, boxShadow: 2, borderLeft: '4px solid #9e9e9e' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ backgroundColor: 'grey.500', width: 32, height: 32 }}>
                              <AssessmentIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.700' }}>
                                Base Model
                              </Typography>
                              <Chip 
                                label={`${baseOutputLines.length} lines`}
                                size="small"
                                color="default"
                                sx={{ fontWeight: 500, borderRadius: 2 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card sx={{ borderRadius: 3, boxShadow: 2, borderLeft: '4px solid #667eea' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ 
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              width: 32, 
                              height: 32 
                            }}>
                              <TargetIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                Finetuned Model
                              </Typography>
                              <Chip 
                                label={`${outputLines.length} lines`}
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 500, borderRadius: 2 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card sx={{ borderRadius: 3, boxShadow: 2, borderLeft: '4px solid #4caf50' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ backgroundColor: 'success.main', width: 32, height: 32 }}>
                              <PlaylistIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.main' }}>
                                Reference Target
                              </Typography>
                              <Chip 
                                label={`${referenceLines.length} lines`}
                                size="small"
                                color="success"
                                sx={{ fontWeight: 500, borderRadius: 2 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                ) : comparisonMode === '2-column' ? (
                  <>
                    <Grid item xs={6}>
                      <Card sx={{ borderRadius: 3, boxShadow: 2, borderLeft: '4px solid #9e9e9e' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ backgroundColor: 'grey.500', width: 32, height: 32 }}>
                              <AssessmentIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.700' }}>
                                Base Model
                              </Typography>
                              <Chip 
                                label={`${baseOutputLines.length} lines`}
                                size="small"
                                color="default"
                                sx={{ fontWeight: 500, borderRadius: 2 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card sx={{ borderRadius: 3, boxShadow: 2, borderLeft: '4px solid #667eea' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ 
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              width: 32, 
                              height: 32 
                            }}>
                              <TargetIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                Finetuned Model
                              </Typography>
                              <Chip 
                                label={`${outputLines.length} lines`}
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 500, borderRadius: 2 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                ) : comparisonMode === 'base-vs-ref' ? (
                  <>
                    <Grid item xs={6}>
                      <Card sx={{ borderRadius: 3, boxShadow: 2, borderLeft: '4px solid #9e9e9e' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ backgroundColor: 'grey.500', width: 32, height: 32 }}>
                              <AssessmentIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'grey.700' }}>
                                Base Model
                              </Typography>
                              <Chip 
                                label={`${baseOutputLines.length} lines`}
                                size="small"
                                color="default"
                                sx={{ fontWeight: 500, borderRadius: 2 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card sx={{ borderRadius: 3, boxShadow: 2, borderLeft: '4px solid #4caf50' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ backgroundColor: 'success.main', width: 32, height: 32 }}>
                              <PlaylistIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.main' }}>
                                Reference Target
                              </Typography>
                              <Chip 
                                label={`${referenceLines.length} lines`}
                                size="small"
                                color="success"
                                sx={{ fontWeight: 500, borderRadius: 2 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={6}>
                      <Card sx={{ borderRadius: 3, boxShadow: 2, borderLeft: '4px solid #667eea' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ 
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              width: 32, 
                              height: 32 
                            }}>
                              <TargetIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                Finetuned Model
                              </Typography>
                              <Chip 
                                label={`${outputLines.length} lines`}
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 500, borderRadius: 2 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card sx={{ borderRadius: 3, boxShadow: 2, borderLeft: '4px solid #4caf50' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ backgroundColor: 'success.main', width: 32, height: 32 }}>
                              <PlaylistIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.main' }}>
                                Reference Target
                              </Typography>
                              <Chip 
                                label={`${referenceLines.length} lines`}
                                size="small"
                                color="success"
                                sx={{ fontWeight: 500, borderRadius: 2 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )
              ) : (
                <>
                  <Grid item xs={6}>
                    <Card sx={{ borderRadius: 3, boxShadow: 2, borderLeft: '4px solid #667eea' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            width: 32, 
                            height: 32 
                          }}>
                            <TargetIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              Model Output
                            </Typography>
                            <Chip 
                              label={`${outputLines.length} lines`}
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 500, borderRadius: 2 }}
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card sx={{ borderRadius: 3, boxShadow: 2, borderLeft: '4px solid #4caf50' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ backgroundColor: 'success.main', width: 32, height: 32 }}>
                            <PlaylistIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.main' }}>
                              Reference Target
                            </Typography>
                            <Chip 
                              label={`${referenceLines.length} lines`}
                              size="small"
                              color="success"
                              sx={{ fontWeight: 500, borderRadius: 2 }}
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>
            
            <Paper sx={{ 
              borderRadius: 3, 
              boxShadow: 2, 
              flex: 1,
              overflow: 'auto',
              border: '1px solid #e0e0e0'
            }}>
              {showDiffMode ? (
                // Diff Mode - Show side-by-side comparison with highlighting
                <Box>
                  {isBothModels ? (
                    comparisonMode === '3-column' ? (
                      // In 3-column mode, show Base vs Finetuned diff (original behavior)
                      <ThreeColumnDiffRenderer 
                        baseContent={baseOutputContent}
                        finetunedContent={outputContent}
                        referenceContent={referenceContent}
                        baseVsRefDiff={baseVsReference}
                        finetunedVsRefDiff={finetunedVsReference}
                      />
                    ) : comparisonMode === '2-column' ? (
                      // In 2-column mode, show Base vs Finetuned diff 
                      <DiffLineRenderer 
                        diffData={baseVsFinetuned}
                        leftTitle="Base Model Output (Diff Mode)"
                        rightTitle="Finetuned Model Output (Diff Mode)"
                        leftColor="secondary"
                        rightColor="primary"
                      />
                    ) : comparisonMode === 'base-vs-ref' ? (
                      // Base vs Reference comparison
                      <DiffLineRenderer 
                        diffData={baseVsReference}
                        leftTitle="Base Model Output (vs Reference)"
                        rightTitle="Reference Target"
                        leftColor="secondary"
                        rightColor="success.main"
                      />
                    ) : (
                      // Finetuned vs Reference comparison
                      <DiffLineRenderer 
                        diffData={finetunedVsReference}
                        leftTitle="Finetuned Model Output (vs Reference)"
                        rightTitle="Reference Target"
                        leftColor="primary"
                        rightColor="success.main"
                      />
                    )
                  ) : (
                    // Single model vs reference
                    <DiffLineRenderer 
                      diffData={finetunedVsReference}
                      leftTitle="Model Output (vs Reference)"
                      rightTitle="Reference Target"
                      leftColor="primary"
                      rightColor="success.main"
                    />
                  )}
                </Box>
              ) : (
                // Normal Mode - Show regular side-by-side view
                <Grid container>
                  {isBothModels ? (
                    comparisonMode === '3-column' ? (
                      <>
                        {/* 3-column: Base | Finetuned | Reference */}
                        <Grid item xs={4} sx={{ borderRight: 1, borderColor: 'divider' }}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              Base Model Output
                            </Typography>
                          </Box>
                          <Box>
                            {baseOutputLines.map((line, index) => (
                              <Box
                                key={`base-${index}`}
                                sx={{
                                  p: 1,
                                  minHeight: 24,
                                  borderBottom: '1px solid #f5f5f5',
                                  fontFamily: 'monospace',
                                  fontSize: '13px',
                                  lineHeight: 1.4,
                                  bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                  display: 'flex'
                                }}
                              >
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                                >
                                  {index + 1}
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {line || '\u00A0'}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Grid>
                        
                        <Grid item xs={4} sx={{ borderRight: 1, borderColor: 'divider' }}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              Finetuned Model Output
                            </Typography>
                          </Box>
                          <Box>
                            {outputLines.map((line, index) => (
                              <Box
                                key={`finetuned-${index}`}
                                sx={{
                                  p: 1,
                                  minHeight: 24,
                                  borderBottom: '1px solid #f5f5f5',
                                  fontFamily: 'monospace',
                                  fontSize: '13px',
                                  lineHeight: 1.4,
                                  bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                  display: 'flex'
                                }}
                              >
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                                >
                                  {index + 1}
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {line || '\u00A0'}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Grid>
                        
                        <Grid item xs={4}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              Reference Target
                            </Typography>
                          </Box>
                          <Box>
                            {referenceLines.map((line, index) => (
                              <Box
                                key={`reference-${index}`}
                                sx={{
                                  p: 1,
                                  minHeight: 24,
                                  borderBottom: '1px solid #f5f5f5',
                                  fontFamily: 'monospace',
                                  fontSize: '13px',
                                  lineHeight: 1.4,
                                  bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                  display: 'flex'
                                }}
                              >
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                                >
                                  {index + 1}
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {line || '\u00A0'}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Grid>
                      </>
                    ) : comparisonMode === '2-column' ? (
                      <>
                        {/* 2-column: Base | Finetuned */}
                        <Grid item xs={6} sx={{ borderRight: 1, borderColor: 'divider' }}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              Base Model Output
                            </Typography>
                          </Box>
                          <Box>
                            {baseOutputLines.map((line, index) => (
                              <Box
                                key={`base-${index}`}
                                sx={{
                                  p: 1,
                                  minHeight: 24,
                                  borderBottom: '1px solid #f5f5f5',
                                  fontFamily: 'monospace',
                                  fontSize: '13px',
                                  lineHeight: 1.4,
                                  bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                  display: 'flex'
                                }}
                              >
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                                >
                                  {index + 1}
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {line || '\u00A0'}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              Finetuned Model Output
                            </Typography>
                          </Box>
                          <Box>
                            {outputLines.map((line, index) => (
                              <Box
                                key={`finetuned-${index}`}
                                sx={{
                                  p: 1,
                                  minHeight: 24,
                                  borderBottom: '1px solid #f5f5f5',
                                  fontFamily: 'monospace',
                                  fontSize: '13px',
                                  lineHeight: 1.4,
                                  bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                  display: 'flex'
                                }}
                              >
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                                >
                                  {index + 1}
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {line || '\u00A0'}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Grid>
                      </>
                    ) : comparisonMode === 'base-vs-ref' ? (
                      <>
                        {/* Base vs Reference */}
                        <Grid item xs={6} sx={{ borderRight: 1, borderColor: 'divider' }}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              Base Model Output
                            </Typography>
                          </Box>
                          <Box>
                            {baseOutputLines.map((line, index) => (
                              <Box
                                key={`base-${index}`}
                                sx={{
                                  p: 1,
                                  minHeight: 24,
                                  borderBottom: '1px solid #f5f5f5',
                                  fontFamily: 'monospace',
                                  fontSize: '13px',
                                  lineHeight: 1.4,
                                  bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                  display: 'flex'
                                }}
                              >
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                                >
                                  {index + 1}
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {line || '\u00A0'}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              Reference Target
                            </Typography>
                          </Box>
                          <Box>
                            {referenceLines.map((line, index) => (
                              <Box
                                key={`reference-${index}`}
                                sx={{
                                  p: 1,
                                  minHeight: 24,
                                  borderBottom: '1px solid #f5f5f5',
                                  fontFamily: 'monospace',
                                  fontSize: '13px',
                                  lineHeight: 1.4,
                                  bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                  display: 'flex'
                                }}
                              >
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                                >
                                  {index + 1}
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {line || '\u00A0'}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Grid>
                      </>
                    ) : (
                      <>
                        {/* Finetuned vs Reference */}
                        <Grid item xs={6} sx={{ borderRight: 1, borderColor: 'divider' }}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              Finetuned Model Output
                            </Typography>
                          </Box>
                          <Box>
                            {outputLines.map((line, index) => (
                              <Box
                                key={`finetuned-${index}`}
                                sx={{
                                  p: 1,
                                  minHeight: 24,
                                  borderBottom: '1px solid #f5f5f5',
                                  fontFamily: 'monospace',
                                  fontSize: '13px',
                                  lineHeight: 1.4,
                                  bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                  display: 'flex'
                                }}
                              >
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                                >
                                  {index + 1}
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {line || '\u00A0'}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              Reference Target
                            </Typography>
                          </Box>
                          <Box>
                            {referenceLines.map((line, index) => (
                              <Box
                                key={`reference-${index}`}
                                sx={{
                                  p: 1,
                                  minHeight: 24,
                                  borderBottom: '1px solid #f5f5f5',
                                  fontFamily: 'monospace',
                                  fontSize: '13px',
                                  lineHeight: 1.4,
                                  bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                  display: 'flex'
                                }}
                              >
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                                >
                                  {index + 1}
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {line || '\u00A0'}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Grid>
                      </>
                    )
                  ) : (
                    <>
                      {/* Single model: Output | Reference */}
                      <Grid item xs={6} sx={{ borderRight: 1, borderColor: 'divider' }}>
                        <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Model Output
                          </Typography>
                        </Box>
                        <Box>
                          {outputLines.map((line, index) => (
                            <Box
                              key={`output-${index}`}
                              sx={{
                                p: 1,
                                minHeight: 24,
                                borderBottom: '1px solid #f5f5f5',
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                lineHeight: 1.4,
                                bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                display: 'flex'
                              }}
                            >
                              <Typography 
                                variant="caption" 
                                sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                              >
                                {index + 1}
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {line || '\u00A0'}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Reference Target
                          </Typography>
                        </Box>
                        <Box>
                          {referenceLines.map((line, index) => (
                            <Box
                              key={`reference-${index}`}
                              sx={{
                                p: 1,
                                minHeight: 24,
                                borderBottom: '1px solid #f5f5f5',
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                lineHeight: 1.4,
                                bgcolor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                display: 'flex'
                              }}
                            >
                              <Typography 
                                variant="caption" 
                                sx={{ color: 'text.secondary', mr: 1, minWidth: 30 }}
                              >
                                {index + 1}
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {line || '\u00A0'}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Grid>
                    </>
                  )}
                </Grid>
              )}
            </Paper>
            
            {/* Statistics Card */}
            <Card sx={{ borderRadius: 3, boxShadow: 2, mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ 
                    backgroundColor: 'info.main',
                    width: 48,
                    height: 48
                  }}>
                    <AnalyticsIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Analysis Summary
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Statistical overview and performance metrics
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={3}>
                  {isBothModels ? (
                    <>
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                          <Typography variant="caption" color="text.secondary">Base Lines</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.700' }}>
                            {baseOutputLines.length}
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                          <Typography variant="caption" color="text.secondary">Finetuned Lines</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {outputLines.length}
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                          <Typography variant="caption" color="text.secondary">Reference Lines</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                            {referenceLines.length}
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                          <Typography variant="caption" color="text.secondary">Status</Typography>
                          <Chip 
                            label={outputLines.length === referenceLines.length && baseOutputLines.length === referenceLines.length ? 'All Equal' : 'Different'}
                            color={outputLines.length === referenceLines.length && baseOutputLines.length === referenceLines.length ? 'success' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 600, borderRadius: 2, mt: 0.5 }}
                          />
                        </Card>
                      </Grid>
                      
                      {jobDetails?.result && (
                        <>
                          <Grid item xs={12} md={6}>
                            <Card sx={{ 
                              borderRadius: 3, 
                              background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
                              p: 2 
                            }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'grey.700' }}>
                                Base Model Performance
                              </Typography>
                              <Stack direction="row" spacing={2}>
                                <Chip 
                                  label={`BLEU: ${jobDetails.result.base_model_bleu_score?.toFixed(2) || 'N/A'}`}
                                  color="default"
                                  sx={{ fontWeight: 600, borderRadius: 2 }}
                                />
                                <Chip 
                                  label={`COMET: ${jobDetails.result.base_model_comet_score?.toFixed(4) || 'N/A'}`}
                                  color="default"
                                  sx={{ fontWeight: 600, borderRadius: 2 }}
                                />
                              </Stack>
                            </Card>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Card sx={{ 
                              borderRadius: 3, 
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              p: 2 
                            }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'inherit' }}>
                                Finetuned Model Performance
                              </Typography>
                              <Stack direction="row" spacing={2}>
                                <Chip 
                                  label={`BLEU: ${jobDetails.result.bleu_score?.toFixed(2) || 'N/A'}`}
                                  sx={{ 
                                    backgroundColor: 'rgba(255,255,255,0.2)', 
                                    color: 'white',
                                    fontWeight: 600,
                                    borderRadius: 2 
                                  }}
                                />
                                <Chip 
                                  label={`COMET: ${jobDetails.result.comet_score?.toFixed(4) || 'N/A'}`}
                                  sx={{ 
                                    backgroundColor: 'rgba(255,255,255,0.2)', 
                                    color: 'white',
                                    fontWeight: 600,
                                    borderRadius: 2 
                                  }}
                                />
                              </Stack>
                            </Card>
                          </Grid>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                          <Typography variant="caption" color="text.secondary">Output Lines</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {outputLines.length}
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                          <Typography variant="caption" color="text.secondary">Reference Lines</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                            {referenceLines.length}
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                          <Typography variant="caption" color="text.secondary">Status</Typography>
                          <Chip 
                            label={outputLines.length === referenceLines.length ? 'Equal length' : 'Different length'}
                            color={outputLines.length === referenceLines.length ? 'success' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 600, borderRadius: 2, mt: 0.5 }}
                          />
                        </Card>
                      </Grid>
                      
                      {jobDetails?.result && (
                        <Grid item xs={12}>
                          <Card sx={{ 
                            borderRadius: 3, 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            p: 2 
                          }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'inherit' }}>
                              Model Performance
                            </Typography>
                            <Stack direction="row" spacing={2} justifyContent="center">
                              <Chip 
                                label={`BLEU: ${jobDetails.result.bleu_score?.toFixed(2) || 'N/A'}`}
                                sx={{ 
                                  backgroundColor: 'rgba(255,255,255,0.2)', 
                                  color: 'white',
                                  fontWeight: 600,
                                  borderRadius: 2 
                                }}
                              />
                              <Chip 
                                label={`COMET: ${jobDetails.result.comet_score?.toFixed(4) || 'N/A'}`}
                                sx={{ 
                                  backgroundColor: 'rgba(255,255,255,0.2)', 
                                  color: 'white',
                                  fontWeight: 600,
                                  borderRadius: 2 
                                }}
                              />
                            </Stack>
                          </Card>
                        </Grid>
                      )}
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default EvaluationComparison; 