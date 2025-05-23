import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Typography,
  Card,
  CardContent,
  Box,
  Paper,
  Divider,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel
} from '@mui/material';
import { 
  Download, 
  Compare, 
  Visibility, 
  Delete, 
  MoreVert,
  DeleteSweep,
  DateRange,
  AdminPanelSettings,
  ViewArray,
  ViewColumn,
  CompareArrows,
  Close
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
const highlightWordDiff = (text1: string, text2: string) => {
  if (text1 === text2) return { left: text1, right: text2 };
  
  const words1 = text1.split(' ');
  const words2 = text2.split(' ');
  const maxLength = Math.max(words1.length, words2.length);
  
  let leftResult = '';
  let rightResult = '';
  
  for (let i = 0; i < maxLength; i++) {
    const word1 = words1[i] || '';
    const word2 = words2[i] || '';
    
    if (word1 !== word2) {
      // Different words - highlight them
      if (word1) {
        leftResult += `<span style="background-color: #ffcdd2; padding: 1px 2px; border-radius: 2px; margin: 0 1px;">${word1}</span>`;
      }
      if (word2) {
        rightResult += `<span style="background-color: #c8e6c9; padding: 1px 2px; border-radius: 2px; margin: 0 1px;">${word2}</span>`;
      }
    } else {
      // Same words
      leftResult += word1;
      rightResult += word2;
    }
    
    // Add space if not the last word
    if (i < maxLength - 1) {
      leftResult += ' ';
      rightResult += ' ';
    }
  }
  
  return { left: leftResult, right: rightResult };
};

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
  }, [visible, jobId, testsetId, comparisonMode]);

  return (
    <Dialog
      open={visible}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      sx={{ '& .MuiDialog-paper': { height: '90vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" component="div">
              Evaluation Results Comparison
            </Typography>
            {jobDetails && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Job #{jobId} - {jobDetails.model_version_name} on {jobDetails.testset_name}
              </Typography>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Diff Mode Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={showDiffMode}
                  onChange={(e) => setShowDiffMode(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CompareArrows sx={{ mr: 0.5 }} />
                  Diff Mode
                </Box>
              }
            />
            
            {isBothModels && (
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
              >
                <ToggleButton value="3-column" aria-label="3 column view">
                  <ViewArray sx={{ mr: 1 }} />
                  All 3 Columns
                </ToggleButton>
                <ToggleButton value="2-column" aria-label="2 column view">
                  <ViewColumn sx={{ mr: 1 }} />
                  Models Only
                </ToggleButton>
                <ToggleButton value="base-vs-ref" aria-label="base vs reference">
                  <CompareArrows sx={{ mr: 1 }} />
                  Base vs Ref
                </ToggleButton>
                <ToggleButton value="finetuned-vs-ref" aria-label="finetuned vs reference">
                  <CompareArrows sx={{ mr: 1 }} />
                  Finetuned vs Ref
                </ToggleButton>
              </ToggleButtonGroup>
            )}
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={40} />
            <Typography sx={{ mt: 2 }}>Loading file content...</Typography>
          </Box>
        ) : error ? (
          <Alert 
            severity="error" 
            action={
              <Button size="small" onClick={loadContent}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : (
          <Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {isBothModels ? (
                comparisonMode === '3-column' ? (
                  <>
                    <Grid item xs={4}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="h6" color="secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Visibility sx={{ mr: 1 }} /> Base Model ({baseOutputLines.length} lines)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Visibility sx={{ mr: 1 }} /> Finetuned Model ({outputLines.length} lines)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="h6" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Visibility sx={{ mr: 1 }} /> Reference Target ({referenceLines.length} lines)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                ) : comparisonMode === '2-column' ? (
                  <>
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="h6" color="secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Visibility sx={{ mr: 1 }} /> Base Model ({baseOutputLines.length} lines)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Visibility sx={{ mr: 1 }} /> Finetuned Model ({outputLines.length} lines)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                ) : comparisonMode === 'base-vs-ref' ? (
                  <>
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="h6" color="secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Visibility sx={{ mr: 1 }} /> Base Model ({baseOutputLines.length} lines)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="h6" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Visibility sx={{ mr: 1 }} /> Reference Target ({referenceLines.length} lines)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Visibility sx={{ mr: 1 }} /> Finetuned Model ({outputLines.length} lines)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="h6" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Visibility sx={{ mr: 1 }} /> Reference Target ({referenceLines.length} lines)
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )
              ) : (
                <>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                          <Visibility sx={{ mr: 1 }} /> Model Output ({outputLines.length} lines)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="h6" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                          <Visibility sx={{ mr: 1 }} /> Reference Target ({referenceLines.length} lines)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>
            
            <Paper variant="outlined" sx={{ maxHeight: '60vh', overflow: 'auto' }}>
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
            
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Grid container spacing={2}>
                {isBothModels ? (
                  <>
                    <Grid item xs={3}>
                      <Typography variant="body2">
                        <strong>Base Lines: </strong>{baseOutputLines.length}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="body2">
                        <strong>Finetuned Lines: </strong>{outputLines.length}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="body2">
                        <strong>Reference Lines: </strong>{referenceLines.length}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="body2">
                        <strong>Match Status: </strong>
                        <Typography 
                          component="span" 
                          color={outputLines.length === referenceLines.length && baseOutputLines.length === referenceLines.length ? 'success.main' : 'warning.main'}
                        >
                          {outputLines.length === referenceLines.length && baseOutputLines.length === referenceLines.length ? 'All Equal' : 'Different'}
                        </Typography>
                      </Typography>
                    </Grid>
                    {jobDetails?.result && (
                      <>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Base Model - BLEU: </strong>{jobDetails.result.base_model_bleu_score?.toFixed(2) || 'N/A'}
                            <strong> | COMET: </strong>{jobDetails.result.base_model_comet_score?.toFixed(4) || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>Finetuned Model - BLEU: </strong>{jobDetails.result.bleu_score?.toFixed(2) || 'N/A'}
                            <strong> | COMET: </strong>{jobDetails.result.comet_score?.toFixed(4) || 'N/A'}
                          </Typography>
                        </Grid>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="body2">
                        <strong>Output Lines: </strong>{outputLines.length}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2">
                        <strong>Reference Lines: </strong>{referenceLines.length}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2">
                        <strong>Match Status: </strong>
                        <Typography 
                          component="span" 
                          color={outputLines.length === referenceLines.length ? 'success.main' : 'warning.main'}
                        >
                          {outputLines.length === referenceLines.length ? 'Equal length' : 'Different length'}
                        </Typography>
                      </Typography>
                    </Grid>
                    {jobDetails?.result && (
                      <>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>BLEU Score: </strong>{jobDetails.result.bleu_score?.toFixed(2) || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            <strong>COMET Score: </strong>{jobDetails.result.comet_score?.toFixed(4) || 'N/A'}
                          </Typography>
                        </Grid>
                      </>
                    )}
                  </>
                )}
              </Grid>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        {isBothModels ? (
          <>
            <Tooltip title="Download base model output">
              <Button startIcon={<Download />} onClick={() => handleDownload('base')} variant="outlined" color="secondary">
                Download Base
              </Button>
            </Tooltip>
            <Tooltip title="Download finetuned model output">
              <Button startIcon={<Download />} onClick={() => handleDownload('finetuned')} variant="outlined">
                Download Finetuned
              </Button>
            </Tooltip>
          </>
        ) : (
          <Tooltip title="Download output file">
            <Button startIcon={<Download />} onClick={() => handleDownload()} variant="outlined">
              Download Output File
            </Button>
          </Tooltip>
        )}
        <Button onClick={onClose} startIcon={<Close />}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EvaluationComparison; 