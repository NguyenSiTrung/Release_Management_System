import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { ReleaseNote } from '../../types';

interface ReleaseNoteDetailProps {
  versionId: number;
  releaseNote: ReleaseNote | null;
  onRefresh: () => void;
  onAddClick?: () => void;
  onEditClick?: () => void;
}

const ReleaseNoteDetail: React.FC<ReleaseNoteDetailProps> = ({ 
  versionId, 
  releaseNote,
  onRefresh,
  onAddClick,
  onEditClick
}) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Release Notes</Typography>
        {!releaseNote && onAddClick && (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={onAddClick}
          >
            Add Release Note
          </Button>
        )}
        {releaseNote && onEditClick && (
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<EditIcon />}
            onClick={onEditClick}
          >
            Edit
          </Button>
        )}
      </Box>
      
      {!releaseNote ? (
        <Typography color="text.secondary">
          No release notes available for this model version.
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          {releaseNote.title && (
            <Typography variant="h5" gutterBottom>
              {releaseNote.title}
            </Typography>
          )}
          
          {releaseNote.content && (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
              {releaseNote.content}
            </Typography>
          )}
          
          <Box sx={{ mt: 2, color: 'text.secondary' }}>
            <Typography variant="caption">
              Last updated: {new Date(releaseNote.updated_at).toLocaleString()}
            </Typography>
            {releaseNote.author && (
              <Typography variant="caption" sx={{ display: 'block' }}>
                Author: {releaseNote.author.username}
              </Typography>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ReleaseNoteDetail; 