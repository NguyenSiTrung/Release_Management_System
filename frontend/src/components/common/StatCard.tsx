import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Stack,
  LinearProgress
} from '@mui/material';
import { SvgIconComponent } from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: SvgIconComponent;
  iconColor?: string;
  gradientColors?: [string, string];
  loading?: boolean;
  onClick?: () => void;
  noIconShadow?: boolean; // Add prop to remove icon shadow
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = '#1976d2',
  gradientColors = ['#1976d2', '#42a5f5'],
  loading = false,
  onClick,
  noIconShadow = false
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return '#4caf50';
      case 'negative':
        return '#f44336';
      default:
        return '#757575';
    }
  };

  const getChangePrefix = () => {
    switch (changeType) {
      case 'positive':
        return '+';
      case 'negative':
        return '';
      default:
        return '';
    }
  };

  // Determine the main color from the gradient for accents
  const mainColor = gradientColors[0];

  return (
    <Card
      sx={{
        position: 'relative',
        background: '#ffffff',
        borderRadius: 3,
        overflow: 'visible',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
        } : {},
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        minHeight: 140,
        border: `1px solid ${mainColor}20`
      }}
      onClick={onClick}
    >
      {loading && (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.05)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: mainColor
            }
          }}
        />
      )}
      
      <CardContent sx={{ p: 3, position: 'relative' }}>
        {/* Icon positioned at top-right */}
        <Avatar
          sx={{
            position: 'absolute',
            top: -10,
            right: 20,
            width: 64,
            height: 64,
            background: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})`,
            boxShadow: noIconShadow ? 'none' : '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <Icon sx={{ fontSize: 32, color: 'white' }} />
        </Avatar>

        <Stack spacing={1} sx={{ mt: 1 }}>
          {/* Title */}
          <Typography
            variant="h6"
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: mainColor,
              mb: 0.5
            }}
          >
            {title}
          </Typography>

          {/* Main Value */}
          <Typography
            variant="h3"
            sx={{
              fontSize: '2rem',
              fontWeight: 700,
              lineHeight: 1.2,
              mb: 0.5,
              color: '#2c3e50'
            }}
          >
            {loading ? '...' : value}
          </Typography>

          {/* Subtitle and Change */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.875rem',
                color: '#637381',
                fontWeight: 400
              }}
            >
              {subtitle}
            </Typography>
            
            {change && (
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: getChangeColor(),
                  padding: '2px 8px',
                  borderRadius: 1
                }}
              >
                {getChangePrefix()}{change}
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default StatCard; 