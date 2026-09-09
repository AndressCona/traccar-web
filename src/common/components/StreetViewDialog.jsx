// Source: Google Maps Platform Code Assist
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Button,
  CircularProgress,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import GoogleStreetViewIcon from './GoogleStreetViewIcon';
import { useTranslation } from './LocalizationProvider';
import { useAttributePreference } from '../util/preferences';
import { DEFAULT_GOOGLE_KEY } from '../util/googleConfig';
import {
  distanceFromMeters,
  distanceUnitString,
  speedFromKnots,
  speedUnitString,
} from '../util/converter';

// Road lane icon matching platform views (/|\)
const RoadLaneIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    <path d="M4 19L8 5" />
    <path d="M20 19L16 5" />
    <line x1="12" y1="5" x2="12" y2="7" />
    <line x1="12" y1="11" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12" y2="19" />
  </svg>
);

// Horizontal battery icon matching platform views ([=])
const HorizontalBatteryIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    <path d="M16 7H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-1h2c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1h-2V9c0-1.1-.9-2-2-2zm0 8H4V9h12v6zm-7-5H6v4h3v-4zm4 0h-3v4h3v-4z" />
  </svg>
);

const useStyles = makeStyles()((theme) => {
  const isDark = theme.palette.mode === 'dark';

  return {
    dialog: {
      '& .MuiDialog-paper': {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: isDark
          ? '0 24px 48px rgba(0, 0, 0, 0.75)'
          : '0 16px 36px rgba(0, 0, 0, 0.16)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '390px !important',
        height: '84vh',
        maxHeight: 740,
        border: `1px solid ${theme.palette.divider}`,
      },
    },
    dialogMobile: {
      '& .MuiDialog-paper': {
        borderRadius: 0,
        width: '100%',
        maxWidth: '100% !important',
        height: '100%',
        maxHeight: '100%',
        margin: 0,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        display: 'flex',
        flexDirection: 'column',
      },
    },
    titleBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing(1.4, 2),
      borderBottom: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.paper,
      flexShrink: 0,
    },
    titleLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1.25),
      minWidth: 0,
    },
    carIconBox: {
      width: 42,
      height: 42,
      borderRadius: '50%',
      backgroundColor: theme.palette.primary.main,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
      border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
      boxShadow: `0 2px 8px ${isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.1)'}`,
    },
    carImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      borderRadius: '50%',
      display: 'block',
    },
    statusBadge: {
      padding: '3px 10px',
      borderRadius: 12,
      fontWeight: 600,
      fontSize: '0.78rem',
      lineHeight: 1.2,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      padding: '0 !important',
      position: 'relative',
      flex: 1,
      height: '100%',
      minHeight: 0,
      maxHeight: 'none',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000000',
      overflow: 'hidden',
    },
    iframeWrapper: {
      position: 'relative',
      width: '100%',
      flex: 1,
      minHeight: 0,
      height: '100%',
      overflow: 'hidden',
      backgroundColor: '#000000',
    },
    iframe: {
      width: '100%',
      height: '100%',
      border: 0,
      display: 'block',
    },
    overlay: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing(2),
      padding: theme.spacing(3),
      textAlign: 'center',
      backgroundColor: isDark ? 'rgba(18, 18, 18, 0.94)' : 'rgba(255, 255, 255, 0.94)',
      color: theme.palette.text.primary,
      zIndex: 2,
      overflowY: 'auto',
    },
    cardBox: {
      maxWidth: 480,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: theme.spacing(2),
    },
    emptyIconBox: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing(1),
    },
    viewOnMapButton: {
      position: 'absolute',
      bottom: 18,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 5,
      borderRadius: 24,
      padding: '7px 20px',
      backgroundColor: 'rgba(24, 26, 30, 0.92)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      color: '#ffffff',
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.82rem',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.55)',
      whiteSpace: 'nowrap',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: theme.palette.primary.main,
        borderColor: theme.palette.primary.main,
        color: '#ffffff',
      },
    },
    metricsContainer: {
      flexShrink: 0,
      backgroundColor: isDark ? '#141518' : theme.palette.background.paper,
      borderTop: `1px solid ${theme.palette.divider}`,
      padding: theme.spacing(1.4, 1.4, 1.6),
      display: 'flex',
      flexDirection: 'column',
      zIndex: 4,
    },
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: theme.spacing(1),
      width: '100%',
    },
    metricCard: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : theme.palette.grey[100],
      borderRadius: 12,
      border: `1px solid ${theme.palette.divider}`,
      padding: theme.spacing(1.1, 1.2),
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      minWidth: 0,
    },
    metricHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      fontSize: '0.78rem',
      color: theme.palette.text.secondary,
      fontWeight: 500,
      marginBottom: 4,
    },
    metricValueRow: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: 5,
      minWidth: 0,
      width: '100%',
    },
    metricValue: {
      fontWeight: 700,
      fontSize: '1.45rem',
      lineHeight: 1.15,
      color: theme.palette.text.primary,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    metricUnit: {
      fontSize: '0.8rem',
      fontWeight: 500,
      color: theme.palette.text.secondary,
    },
  };
});

const parseTimeAgo = (date) => {
  if (!date) return { num: '--', unit: '' };
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 0) return { num: '0', unit: 's' };
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) return { num: totalDays, unit: totalDays === 1 ? 'day' : 'days' };
  if (totalHours > 0) return { num: totalHours, unit: totalHours === 1 ? 'hr' : 'hrs' };
  if (totalMinutes > 0) return { num: totalMinutes, unit: 'min' };
  return { num: totalSeconds, unit: 's' };
};

const StreetViewDialog = ({ open, onClose, position, device, deviceName }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [iframeLoading, setIframeLoading] = useState(true);

  const traccarGoogleKey = useAttributePreference('googleKey');
  const activeKey = traccarGoogleKey || DEFAULT_GOOGLE_KEY;

  const directStreetViewUrl = position
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course || 0}`
    : '#';

  const embedUrl = position && activeKey
    ? `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(activeKey)}&location=${position.latitude}%2C${position.longitude}&heading=${position.course || 0}&pitch=0&fov=90`
    : null;

  useEffect(() => {
    if (open) {
      setIframeLoading(true);
    }
  }, [open, position?.latitude, position?.longitude]);

  // Calculations matching StatusCard
  const speedUnit = useAttributePreference('speedUnit');
  const speedValue = position?.speed != null ? Math.round(speedFromKnots(position.speed, speedUnit)) : null;
  const speedUnitLabel = speedUnitString(speedUnit, t);

  const distanceUnit = useAttributePreference('distanceUnit');
  const totalMeters = position?.attributes?.totalDistance ?? position?.totalDistance;
  const distanceValue = totalMeters != null ? Math.round(distanceFromMeters(totalMeters, distanceUnit)).toLocaleString() : null;
  const distanceUnitLabel = distanceUnitString(distanceUnit, t);

  const powerRaw = position?.attributes?.power ?? position?.power;
  const batteryRaw = position?.attributes?.batteryLevel ?? position?.batteryLevel;
  const isLowPower = powerRaw != null ? powerRaw < 12 : (batteryRaw != null ? batteryRaw < 20 : false);
  const displayPowerNum = powerRaw != null ? powerRaw.toFixed(2) : (batteryRaw != null ? batteryRaw : '--');
  const displayPowerUnit = powerRaw != null ? 'V' : (batteryRaw != null ? '%' : '');

  const fixTimeRaw = position?.attributes?.fixTime ?? position?.fixTime ?? position?.deviceTime;
  const timeAgoObj = parseTimeAgo(fixTimeRaw);

  const rawName = device?.name || deviceName || 'Vehicle';
  const displayName = rawName.startsWith('*') ? rawName.slice(1).trim() : rawName;

  // Status & motion state
  const isOnline = device?.status === 'online';
  let motionState = 'Parked';
  if (device?.status === 'offline' || device?.status === 'unknown') {
    motionState = position?.attributes?.ignition ? 'Signal Lost' : 'Offline';
  } else if (position?.attributes?.ignition) {
    motionState = (position?.speed != null && position.speed > 0) ? 'Driving' : 'Idling';
  } else {
    motionState = 'Parked';
  }

  const subtitleText = `${motionState} · ${timeAgoObj.num} ${timeAgoObj.unit} ago`;
  const deviceImage = device?.attributes?.deviceImage;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="xs"
      fullWidth
      className={isMobile ? classes.dialogMobile : classes.dialog}
    >
      {/* Header Bar */}
      <DialogTitle className={classes.titleBar} component="div">
        <div className={classes.titleLeft}>
          <div className={classes.carIconBox}>
            {deviceImage ? (
              <img
                src={`/api/media/${device?.uniqueId}/${deviceImage}`}
                alt={displayName}
                className={classes.carImage}
              />
            ) : (
              <DirectionsCarIcon sx={{ fontSize: 24, color: '#ffffff' }} />
            )}
          </div>
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.2 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, fontSize: '0.98rem', lineHeight: 1.2, color: theme.palette.text.primary }}
              noWrap
            >
              {displayName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem', lineHeight: 1 }}
              noWrap
            >
              {subtitleText}
            </Typography>
          </Box>
        </div>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <div
            className={classes.statusBadge}
            style={{
              backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isOnline ? '#22c55e' : '#ef4444',
              border: `1px solid ${isOnline ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            }}
          >
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: theme.palette.text.secondary,
              p: 0.5,
              '&:hover': { color: theme.palette.text.primary },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Main Content */}
      <DialogContent className={classes.content}>
        {embedUrl ? (
          <>
            <div className={classes.iframeWrapper}>
              <iframe
                title="Street View"
                className={classes.iframe}
                src={embedUrl}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => setIframeLoading(false)}
              />
              {iframeLoading && (
                <div className={classes.overlay}>
                  <CircularProgress size={40} sx={{ color: theme.palette.primary.main }} />
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                    Loading Street View...
                  </Typography>
                </div>
              )}

              {/* Floating "View on Google Maps" button with exit icon at the end */}
              <Button
                component="a"
                href={directStreetViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                className={classes.viewOnMapButton}
              >
                View on Google Maps
              </Button>
            </div>

            {/* Fixed Bottom 2x2 Metrics Section */}
            <div className={classes.metricsContainer}>
              <div className={classes.metricsGrid}>
                {/* Speed */}
                <div className={classes.metricCard}>
                  <div className={classes.metricHeader}>
                    <SpeedIcon sx={{ fontSize: 15, color: theme.palette.text.secondary }} />
                    <span>Speed</span>
                  </div>
                  <div className={classes.metricValueRow}>
                    <span className={classes.metricValue}>{speedValue != null ? speedValue : 0}</span>
                    <span className={classes.metricUnit}>{speedUnitLabel}</span>
                  </div>
                </div>

                {/* Odometer */}
                <div className={classes.metricCard}>
                  <div className={classes.metricHeader}>
                    <RoadLaneIcon size={15} color={theme.palette.text.secondary} />
                    <span>Odometer</span>
                  </div>
                  <div className={classes.metricValueRow}>
                    <span
                      className={classes.metricValue}
                      style={{ fontSize: distanceValue && distanceValue.length > 7 ? '1.25rem' : '1.45rem' }}
                    >
                      {distanceValue != null ? distanceValue : '--'}
                    </span>
                    <span className={classes.metricUnit}>{distanceUnitLabel}</span>
                  </div>
                </div>

                {/* Power */}
                <div className={classes.metricCard}>
                  <div className={classes.metricHeader}>
                    <HorizontalBatteryIcon
                      size={16}
                      color={isLowPower ? theme.palette.error.main : theme.palette.text.secondary}
                    />
                    <span>Power</span>
                  </div>
                  <div className={classes.metricValueRow}>
                    <span
                      className={classes.metricValue}
                      style={{ color: isLowPower ? theme.palette.error.main : theme.palette.text.primary }}
                    >
                      {displayPowerNum}
                    </span>
                    {displayPowerUnit && <span className={classes.metricUnit}>{displayPowerUnit}</span>}
                  </div>
                </div>

                {/* Last report */}
                <div className={classes.metricCard}>
                  <div className={classes.metricHeader}>
                    <AccessTimeIcon sx={{ fontSize: 15, color: theme.palette.text.secondary }} />
                    <span>Last report</span>
                  </div>
                  <div className={classes.metricValueRow}>
                    <span className={classes.metricValue}>{timeAgoObj.num}</span>
                    <span className={classes.metricUnit}>{timeAgoObj.unit}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={classes.overlay}>
            <div className={classes.cardBox}>
              <div className={classes.emptyIconBox}>
                <GoogleStreetViewIcon size={56} />
              </div>

              <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                Street View
              </Typography>

              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, lineHeight: 1.5 }}>
                Open this location directly in Google Maps.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', mt: 1 }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<OpenInNewIcon />}
                  href={directStreetViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    fontWeight: 600,
                    py: 1.2,
                    backgroundColor: theme.palette.primary.main,
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark || theme.palette.primary.main,
                    },
                  }}
                >
                  Open in Google Maps
                </Button>
              </Box>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StreetViewDialog;
