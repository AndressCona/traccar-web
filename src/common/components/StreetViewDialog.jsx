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
import RouteIcon from '@mui/icons-material/Route';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RoomIcon from '@mui/icons-material/Room';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
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

const useStyles = makeStyles()((theme) => ({
  paper: {
    borderRadius: theme.spacing(2.5),
    overflow: 'hidden',
    backgroundColor: '#121212',
    color: '#ffffff',
    boxShadow: theme.shadows[12],
    display: 'flex',
    flexDirection: 'column',
    height: '80vh',
    maxHeight: 760,
  },
  paperMobile: {
    borderRadius: 0,
    height: '100%',
    maxHeight: '100%',
    backgroundColor: '#121212',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1.2, 2),
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: '#141414',
    flexShrink: 0,
  },
  titleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.25),
    minWidth: 0,
  },
  carIconBox: {
    width: 38,
    height: 38,
    borderRadius: theme.spacing(1.25),
    backgroundColor: 'rgba(26, 115, 232, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  carImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: 16,
    fontWeight: 600,
    fontSize: '0.78rem',
    lineHeight: 1,
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
    backgroundColor: '#0a0a0a',
    overflow: 'hidden',
  },
  iframeWrapper: {
    position: 'relative',
    width: '100%',
    flex: 1,
    minHeight: 0,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#000',
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
    backgroundColor: 'rgba(18, 18, 18, 0.94)',
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
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 5,
    borderRadius: 20,
    padding: '6px 18px',
    backgroundColor: 'rgba(20, 20, 20, 0.82)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    color: '#ffffff',
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.82rem',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
    '&:hover': {
      backgroundColor: 'rgba(35, 35, 35, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.35)',
    },
  },
  metricsContainer: {
    flexShrink: 0,
    backgroundColor: '#141414',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    padding: theme.spacing(1.2, 1.5, 1.2),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    zIndex: 4,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing(0.75),
    width: '100%',
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: theme.spacing(1.25),
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: theme.spacing(1, 1.4),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 0,
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.72rem',
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 500,
    marginBottom: 4,
  },
  metricValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
    minWidth: 0,
  },
  metricValue: {
    fontWeight: 700,
    fontSize: '1.25rem',
    lineHeight: 1.15,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  metricUnit: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  collapseButton: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: 'rgba(255, 255, 255, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.15s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      color: '#ffffff',
    },
  },
  floatingUpButton: {
    position: 'absolute',
    bottom: theme.spacing(2),
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 6,
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    padding: 0,
    '&:hover': {
      backgroundColor: 'rgba(40, 40, 40, 0.95)',
    },
  },
}));

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

  const [showDetails, setShowDetails] = useState(true);
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
      setShowDetails(true);
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
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          className: isMobile ? classes.paperMobile : classes.paper,
        },
      }}
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
              <DirectionsCarIcon sx={{ fontSize: 24, color: '#29b6f6' }} />
            )}
          </div>
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.98rem', lineHeight: 1.2, color: '#ffffff' }} noWrap>
              {displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.75rem', lineHeight: 1 }} noWrap>
              {subtitleText}
            </Typography>
          </Box>
        </div>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <div
            className={classes.statusBadge}
            style={{
              backgroundColor: isOnline ? 'rgba(76, 175, 80, 0.12)' : 'rgba(244, 67, 54, 0.12)',
              color: isOnline ? '#4caf50' : '#f44336',
              border: `1px solid ${isOnline ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
            }}
          >
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)', p: 0.5 }}>
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
                  <CircularProgress size={40} sx={{ color: '#1a73e8' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Loading Street View...
                  </Typography>
                </div>
              )}

              {/* Floating "View on Google Maps" button */}
              <Button
                component="a"
                href={directStreetViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<RoomIcon sx={{ fontSize: 16, color: '#fff' }} />}
                className={classes.viewOnMapButton}
              >
                View on Google Maps
              </Button>

              {/* Floating button when vehicle info is collapsed */}
              {!showDetails && (
                <button
                  type="button"
                  className={classes.floatingUpButton}
                  onClick={() => setShowDetails(true)}
                  title="Show Vehicle Details"
                >
                  <KeyboardArrowUpIcon sx={{ fontSize: 20 }} />
                </button>
              )}
            </div>

            {/* Bottom 2x2 Metrics Section */}
            {showDetails && (
              <div className={classes.metricsContainer}>
                <div className={classes.metricsGrid}>
                  {/* Speed */}
                  <div className={classes.metricCard}>
                    <div className={classes.metricHeader}>
                      <SpeedIcon sx={{ fontSize: 15 }} />
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
                      <RouteIcon sx={{ fontSize: 15 }} />
                      <span>Odometer</span>
                    </div>
                    <div className={classes.metricValueRow}>
                      <span className={classes.metricValue}>{distanceValue != null ? distanceValue : '--'}</span>
                      <span className={classes.metricUnit}>{distanceUnitLabel}</span>
                    </div>
                  </div>

                  {/* Power */}
                  <div className={classes.metricCard}>
                    <div className={classes.metricHeader}>
                      <BatteryFullIcon sx={{ fontSize: 15, color: isLowPower ? '#f44336' : 'inherit' }} />
                      <span>Power</span>
                    </div>
                    <div className={classes.metricValueRow}>
                      <span className={classes.metricValue} style={{ color: isLowPower ? '#f44336' : '#ffffff' }}>
                        {displayPowerNum}
                      </span>
                      {displayPowerUnit && <span className={classes.metricUnit}>{displayPowerUnit}</span>}
                    </div>
                  </div>

                  {/* Last report */}
                  <div className={classes.metricCard}>
                    <div className={classes.metricHeader}>
                      <AccessTimeIcon sx={{ fontSize: 15 }} />
                      <span>Last report</span>
                    </div>
                    <div className={classes.metricValueRow}>
                      <span className={classes.metricValue}>{timeAgoObj.num}</span>
                      <span className={classes.metricUnit}>{timeAgoObj.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Circular collapse button (↓) */}
                <button
                  type="button"
                  className={classes.collapseButton}
                  onClick={() => setShowDetails(false)}
                  title="Hide Vehicle Details"
                >
                  <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={classes.overlay}>
            <div className={classes.cardBox}>
              <div className={classes.emptyIconBox}>
                <GoogleStreetViewIcon size={56} />
              </div>

              <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff' }}>
                Street View
              </Typography>

              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5 }}>
                Open this location directly in Google Maps.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', mt: 1 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<OpenInNewIcon />}
                  href={directStreetViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    fontWeight: 600,
                    py: 1.2,
                    backgroundColor: '#1a73e8',
                    '&:hover': {
                      backgroundColor: '#1557b0',
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
