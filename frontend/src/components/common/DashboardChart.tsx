import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  Timeline as AreaChartIcon,
  PieChart as PieChartIcon,
  Download as DownloadIcon,
  GridOn as GridIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';

interface DashboardChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  type?: 'bar' | 'line' | 'area' | 'pie';
  dataKey: string;
  xAxisKey: string;
  color?: string;
  gradientColors?: [string, string];
  height?: number;
  loading?: boolean;
  showPercentage?: boolean;
  percentageChange?: string;
  percentageType?: 'positive' | 'negative' | 'neutral';
  onRefresh?: () => void;
  allowTypeChange?: boolean;
  allowExport?: boolean;
}

// Colors for pie chart
const PIE_COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

const DashboardChart: React.FC<DashboardChartProps> = ({
  title,
  subtitle,
  data,
  type = 'bar',
  dataKey,
  xAxisKey,
  color = '#1976d2',
  gradientColors = ['#1976d2', '#42a5f5'],
  height = 350,
  loading = false,
  showPercentage = false,
  percentageChange,
  percentageType = 'neutral',
  onRefresh,
  allowTypeChange = true,
  allowExport = true
}) => {
  const [currentType, setCurrentType] = useState<'bar' | 'line' | 'area' | 'pie'>(type);
  const [showGrid, setShowGrid] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTypeChange = (newType: 'bar' | 'line' | 'area' | 'pie') => {
    setCurrentType(newType);
    handleMenuClose();
  };

  const handleExport = () => {
    // Create CSV data
    const csvContent = [
      [xAxisKey, dataKey].join(','), // Header
      ...data.map(item => [item[xAxisKey], item[dataKey]].join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_').toLowerCase()}_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    handleMenuClose();
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    handleMenuClose();
  };

  const getPercentageColor = () => {
    switch (percentageType) {
      case 'positive':
        return '#4caf50';
      case 'negative':
        return '#f44336';
      default:
        return '#757575';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card
          sx={{
            p: 2,
            minWidth: 120,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 2,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {label}
          </Typography>
          <Typography variant="h6" color="primary">
            {payload[0].value}
          </Typography>
        </Card>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card
          sx={{
            p: 2,
            minWidth: 120,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 2,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {payload[0].payload[xAxisKey]}
          </Typography>
          <Typography variant="h6" color="primary">
            {payload[0].value} ({((payload[0].value / data.reduce((sum, item) => sum + item[dataKey], 0)) * 100).toFixed(1)}%)
          </Typography>
        </Card>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: {
        top: 20,
        right: 30,
        left: 20,
        bottom: 5,
      },
    };

    switch (currentType) {
      case 'pie':
        return (
          <PieChart width={400} height={height}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={xAxisKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomPieTooltip />} />
          </PieChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColors[0]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={gradientColors[1]} stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />}
            <XAxis 
              dataKey={xAxisKey} 
              tick={{ fontSize: 12, fill: '#666' }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#666' }}
              axisLine={{ stroke: '#e0e0e0' }}
              allowDecimals={false}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: color }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColors[0]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={gradientColors[1]} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />}
            <XAxis 
              dataKey={xAxisKey} 
              tick={{ fontSize: 12, fill: '#666' }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#666' }}
              axisLine={{ stroke: '#e0e0e0' }}
              allowDecimals={false}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fillOpacity={1}
              fill="url(#areaGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        );

      default: // bar
        return (
          <BarChart {...commonProps}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradientColors[0]}/>
                <stop offset="100%" stopColor={gradientColors[1]}/>
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />}
            <XAxis 
              dataKey={xAxisKey} 
              tick={{ fontSize: 12, fill: '#666' }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#666' }}
              axisLine={{ stroke: '#e0e0e0' }}
              allowDecimals={false}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Bar 
              dataKey={dataKey} 
              fill="url(#barGradient)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: isFullscreen ? '0 8px 32px rgba(0,0,0,0.2)' : '0 4px 16px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        border: '1px solid rgba(0,0,0,0.05)',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 1300 : 'auto',
        width: isFullscreen ? '100vw' : 'auto',
        height: isFullscreen ? '100vh' : 'auto'
      }}
    >
      <CardContent sx={{ p: 0, height: isFullscreen ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 3, pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
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
                {showPercentage && percentageChange && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <TrendingUpIcon
                      sx={{
                        fontSize: 16,
                        color: getPercentageColor(),
                        transform: percentageType === 'negative' ? 'rotate(180deg)' : 'none'
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: getPercentageColor(),
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                    >
                      {percentageChange}
                    </Typography>
                  </Stack>
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
            
            <Tooltip title="Chart options">
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
        </Box>

        {/* Chart */}
        <Box sx={{ 
          height: isFullscreen ? 'calc(100% - 120px)' : height, 
          px: 2, 
          pb: 2,
          flex: isFullscreen ? 1 : 'none'
        }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#6c757d'
              }}
            >
              <Typography variant="body1">Loading chart data...</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
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
            minWidth: 220,
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
              '&.Mui-selected': {
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                color: '#667eea',
                fontWeight: 600
              },
              '& .MuiListItemIcon-root': {
                color: 'inherit',
                minWidth: 36
              },
              '& .MuiFormControlLabel-root': {
                margin: 0,
                '& .MuiTypography-root': {
                  fontSize: '0.875rem',
                  fontWeight: 500
                }
              }
            },
            '& .MuiDivider-root': {
              borderColor: 'rgba(102, 126, 234, 0.1)',
              mx: 1
            }
          }
        }}
      >
        {allowTypeChange && (
          <>
            <MenuItem onClick={() => handleTypeChange('bar')} selected={currentType === 'bar'}>
              <ListItemIcon>
                <BarChartIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Bar Chart</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleTypeChange('line')} selected={currentType === 'line'}>
              <ListItemIcon>
                <LineChartIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Line Chart</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleTypeChange('area')} selected={currentType === 'area'}>
              <ListItemIcon>
                <AreaChartIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Area Chart</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleTypeChange('pie')} selected={currentType === 'pie'}>
              <ListItemIcon>
                <PieChartIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Pie Chart</ListItemText>
            </MenuItem>
            <Divider />
          </>
        )}
        
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <GridIcon fontSize="small" />
          </ListItemIcon>
          <FormControlLabel
            control={
              <Switch
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                size="small"
              />
            }
            label="Show Grid"
            sx={{ margin: 0 }}
          />
        </MenuItem>
        
        <Divider />
        
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
        
        <MenuItem onClick={handleFullscreen}>
          <ListItemIcon>
            <FullscreenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default DashboardChart; 