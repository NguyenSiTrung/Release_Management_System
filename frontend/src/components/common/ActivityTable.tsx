import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Flag as FlagIcon,
  Translate as TranslateIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  ViewList as ViewListIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

export interface ActivityItem {
  id: string | number;
  title: string;
  subtitle: string;
  status: 'success' | 'error' | 'pending' | 'running' | 'completed';
  type: 'model' | 'evaluation' | 'training' | 'release';
  date: string;
  progress?: number;
  metadata?: Record<string, any>;
}

interface ActivityTableProps {
  title: string;
  subtitle?: string;
  data: ActivityItem[];
  loading?: boolean;
  maxItems?: number;
  onItemClick?: (item: ActivityItem) => void;
  onRefresh?: () => void;
  allowExport?: boolean;
  allowFilter?: boolean;
}

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'status';
type FilterOption = 'all' | 'success' | 'error' | 'pending' | 'running' | 'completed';

const ActivityTable: React.FC<ActivityTableProps> = ({
  title,
  subtitle,
  data,
  loading = false,
  maxItems = 5,
  onItemClick,
  onRefresh,
  allowExport = true,
  allowFilter = true
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExport = () => {
    // Create CSV data
    const csvContent = [
      ['Title', 'Subtitle', 'Status', 'Type', 'Date'].join(','), // Header
      ...data.map(item => [
        `"${item.title}"`,
        `"${item.subtitle}"`,
        item.status,
        item.type,
        item.date
      ].join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_').toLowerCase()}_activities.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    handleMenuClose();
  };

  const handleSortChange = (event: SelectChangeEvent<SortOption>) => {
    setSortBy(event.target.value as SortOption);
  };

  const handleFilterChange = (event: SelectChangeEvent<FilterOption>) => {
    setFilterBy(event.target.value as FilterOption);
  };

  const handleClearFilters = () => {
    setSortBy('date-desc');
    setFilterBy('all');
    setSearchQuery('');
    handleMenuClose();
  };

  // Filter and sort data
  const processedData = React.useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(item => item.status === filterBy);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [data, searchQuery, filterBy, sortBy]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 18 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f44336', fontSize: 18 }} />;
      case 'pending':
        return <PendingIcon sx={{ color: '#ff9800', fontSize: 18 }} />;
      case 'running':
        return <ScheduleIcon sx={{ color: '#2196f3', fontSize: 18 }} />;
      default:
        return <PendingIcon sx={{ color: '#757575', fontSize: 18 }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'pending':
        return '#ff9800';
      case 'running':
        return '#2196f3';
      default:
        return '#757575';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'model':
        return <TranslateIcon sx={{ color: '#1976d2', fontSize: 20 }} />;
      case 'evaluation':
        return <FlagIcon sx={{ color: '#9c27b0', fontSize: 20 }} />;
      case 'training':
        return <ScheduleIcon sx={{ color: '#ff9800', fontSize: 20 }} />;
      case 'release':
        return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />;
      default:
        return <TranslateIcon sx={{ color: '#757575', fontSize: 20 }} />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const displayData = processedData.slice(0, maxItems);
  const hasFilters = searchQuery || filterBy !== 'all' || sortBy !== 'date-desc';

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        border: '1px solid rgba(0,0,0,0.05)',
        height: '100%'
      }}
    >
      <CardContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 3, pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: '#2c3e50',
                    fontSize: '1.1rem'
                  }}
                >
                  {title}
                </Typography>
                {hasFilters && (
                  <Chip
                    icon={<FilterListIcon />}
                    label={`${processedData.length} of ${data.length}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      color: '#667eea',
                      border: '1px solid rgba(102, 126, 234, 0.3)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      '& .MuiChip-icon': {
                        color: '#667eea'
                      }
                    }}
                  />
                )}
              </Stack>
              {subtitle && (
                <Typography
                  variant="body2"
                  sx={{
                    color: '#6c757d',
                    fontSize: '0.875rem'
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            
            <Tooltip title="Table options">
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                sx={{
                  color: '#344767',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  borderRadius: '0.5rem',
                  width: 32,
                  height: 32,
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    color: '#667eea',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(102, 126, 234, 0.3)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Search and Filters */}
          {allowFilter && (
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <TextField
                size="small"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ 
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    fontSize: '0.875rem',
                    '&:hover': {
                      borderColor: 'rgba(102, 126, 234, 0.4)'
                    },
                    '&.Mui-focused': {
                      borderColor: '#667eea',
                      boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.1)'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#67748e',
                    fontSize: '0.875rem'
                  }
                }}
              />
              
              <FormControl 
                size="small" 
                sx={{ 
                  minWidth: 120,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    fontSize: '0.875rem',
                    '&:hover': {
                      borderColor: 'rgba(102, 126, 234, 0.4)'
                    },
                    '&.Mui-focused': {
                      borderColor: '#667eea',
                      boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.1)'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#67748e',
                    fontSize: '0.875rem'
                  }
                }}
              >
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterBy}
                  label="Status"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="running">Running</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>

              <FormControl 
                size="small" 
                sx={{ 
                  minWidth: 120,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    fontSize: '0.875rem',
                    '&:hover': {
                      borderColor: 'rgba(102, 126, 234, 0.4)'
                    },
                    '&.Mui-focused': {
                      borderColor: '#667eea',
                      boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.1)'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: '#67748e',
                    fontSize: '0.875rem'
                  }
                }}
              >
                <InputLabel>Sort</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort"
                  onChange={handleSortChange}
                >
                  <MenuItem value="date-desc">Newest First</MenuItem>
                  <MenuItem value="date-asc">Oldest First</MenuItem>
                  <MenuItem value="title-asc">Title A-Z</MenuItem>
                  <MenuItem value="title-desc">Title Z-A</MenuItem>
                  <MenuItem value="status">By Status</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}
        </Box>

        {/* Table */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 200,
                color: '#6c757d'
              }}
            >
              <Typography variant="body1">Loading activities...</Typography>
            </Box>
          ) : displayData.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 200,
                color: '#6c757d',
                flexDirection: 'column',
                gap: 1
              }}
            >
              <Typography variant="body1">
                {data.length === 0 ? 'No activities found' : 'No activities match your filters'}
              </Typography>
              {hasFilters && (
                <Typography 
                  variant="body2" 
                  sx={{ cursor: 'pointer', color: '#1976d2' }}
                  onClick={handleClearFilters}
                >
                  Clear filters to see all activities
                </Typography>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: '#6c757d',
                        letterSpacing: '0.5px',
                        py: 1.5
                      }}
                    >
                      Activity
                    </TableCell>
                    <TableCell
                      sx={{
                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: '#6c757d',
                        letterSpacing: '0.5px',
                        py: 1.5
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: '#6c757d',
                        letterSpacing: '0.5px',
                        py: 1.5
                      }}
                    >
                      Date
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayData.map((item, index) => (
                    <TableRow
                      key={item.id}
                      onClick={() => onItemClick?.(item)}
                      sx={{
                        cursor: onItemClick ? 'pointer' : 'default',
                        '&:hover': onItemClick ? {
                          backgroundColor: 'rgba(0,0,0,0.02)'
                        } : {},
                        '&:last-child td': {
                          borderBottom: 0
                        }
                      }}
                    >
                      <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)', py: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              backgroundColor: 'rgba(25, 118, 210, 0.1)',
                              border: '2px solid rgba(25, 118, 210, 0.2)'
                            }}
                          >
                            {getTypeIcon(item.type)}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: '#2c3e50',
                                fontSize: '0.875rem'
                              }}
                            >
                              {item.title}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#6c757d',
                                fontSize: '0.75rem'
                              }}
                            >
                              {item.subtitle}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      
                      <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)', py: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {getStatusIcon(item.status)}
                          <Chip
                            label={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            size="small"
                            sx={{
                              backgroundColor: `${getStatusColor(item.status)}20`,
                              color: getStatusColor(item.status),
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              '& .MuiChip-label': {
                                px: 1.5
                              }
                            }}
                          />
                        </Stack>
                      </TableCell>
                      
                      <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)', py: 2 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#6c757d',
                            fontSize: '0.875rem'
                          }}
                        >
                          {formatDate(item.date)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </CardContent>

      {/* Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 15px 12px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255,255,255,0.8)',
            minWidth: 200,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            backdropFilter: 'blur(10px)',
            '& .MuiMenuItem-root': {
              borderRadius: 2,
              mx: 1,
              my: 0.5,
              color: '#344767',
              fontWeight: 500,
              fontSize: '0.875rem',
              '&:hover': {
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                color: '#667eea'
              },
              '& .MuiListItemIcon-root': {
                color: 'inherit',
                minWidth: 36
              }
            }
          }
        }}
      >
        {onRefresh && (
          <MenuItem onClick={() => { onRefresh(); handleMenuClose(); }}>
            <ListItemIcon>
              <RefreshIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Refresh Data</ListItemText>
          </MenuItem>
        )}
        
        {allowExport && (
          <MenuItem onClick={handleExport}>
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Export as CSV</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <ViewListIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View All Models</ListItemText>
        </MenuItem>
        
        {hasFilters && (
          <>
            <Divider />
            <MenuItem onClick={handleClearFilters}>
              <ListItemIcon>
                <ClearIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Clear Filters</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Card>
  );
};

export default ActivityTable; 