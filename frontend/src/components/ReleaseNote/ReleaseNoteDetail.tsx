import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card,
  Avatar,
  Divider
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon,
  Article as ArticleIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
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
    <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              width: 56,
              height: 56,
              mr: 2
            }}
          >
            <ArticleIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Release Notes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Documentation and changelog for this model version
            </Typography>
          </Box>
          {!releaseNote && onAddClick && (
            <Button 
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddClick}
              sx={{
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, #218838 0%, #1e7e34 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: 3
                }
              }}
            >
              Add Release Note
            </Button>
          )}
          {releaseNote && onEditClick && (
            <Button 
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={onEditClick}
              sx={{
                borderColor: '#28a745',
                color: '#28a745',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  borderColor: '#218838',
                  backgroundColor: 'rgba(40, 167, 69, 0.04)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              Edit
            </Button>
          )}
        </Box>
        
        {!releaseNote ? (
          <Box 
            sx={{ 
              textAlign: 'center', 
              py: 4,
              border: '2px dashed',
              borderColor: 'grey.300',
              borderRadius: 2,
              backgroundColor: 'grey.50'
            }}
          >
            <ArticleIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography color="text.secondary" variant="body1" sx={{ mb: 1 }}>
              No release notes available for this model version.
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Add release notes to document changes and improvements.
            </Typography>
          </Box>
        ) : (
          <Box>
            {releaseNote.title && (
              <Box sx={{ mb: 3 }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 600, 
                    color: 'text.primary',
                    mb: 1
                  }}
                >
                  {releaseNote.title}
                </Typography>
                <Divider sx={{ backgroundColor: '#28a745', height: 2, width: 60 }} />
              </Box>
            )}
            
            {releaseNote.content && (
              <Box 
                sx={{ 
                  backgroundColor: '#f8f9fa',
                  borderRadius: 2,
                  p: 3,
                  mb: 3,
                  border: '1px solid #e9ecef'
                }}
              >
                <Typography 
                  variant="body1" 
                  sx={{ 
                    whiteSpace: 'pre-line',
                    lineHeight: 1.7,
                    color: 'text.primary'
                  }}
                >
                  {releaseNote.content}
                </Typography>
              </Box>
            )}
            
            <Card sx={{ backgroundColor: '#f8f9fa', borderRadius: 2 }}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  Metadata
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 24, height: 24, backgroundColor: 'info.main' }}>
                      <ScheduleIcon sx={{ fontSize: 14 }} />
                    </Avatar>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Last updated:</strong> {new Date(releaseNote.updated_at).toLocaleString()}
                    </Typography>
                  </Box>
                  {releaseNote.author && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 24, height: 24, backgroundColor: 'success.main' }}>
                        <PersonIcon sx={{ fontSize: 14 }} />
                      </Avatar>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Author:</strong> {releaseNote.author.username}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Card>
          </Box>
        )}
      </Box>
    </Card>
  );
};

export default ReleaseNoteDetail; 