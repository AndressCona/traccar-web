// Source: Google Maps Platform Code Assist
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
  Typography,
  Button,
  CircularProgress,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SpeedIcon from '@mui/icons-material/Speed';
import RouteIcon from '@mui/icons-material/Route';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import RoomIcon from '@mui/icons-material/Room';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import GoogleStreetViewIcon from './GoogleStreetViewIcon';
import { useTranslation } from './LocalizationProvider';
import { useAttributePreference } from '../util/preferences';
import { DEFAULT_GOOGLE_KEY } from '../util/googleConfig';
import { formatStatus, getStatusColor } from '../util/formatter';
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
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[10],
    display: 'flex',
    flexDirection: 'column',
  },
  paperMobile: {
    borderRadius: 0,
    height: '100%',
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1.25, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
  },
  titleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.2),
    minWidth: 0,
  },
  iconBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    padding: '0 !important',
    position: 'relative',
    height: '65vh',
    minHeight: 420,
    maxHeight: 650,
    width: '100%',
    backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5',
    overflow: 'hidden',
  },
  contentMobile: {
    padding: '0 !important',
    position: 'relative',
    flex: 1,
    height: '100%',
    minHeight: 0,
    maxHeight: 'none',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5',
    overflow: 'hidden',
  },
  iframeWrapper: {
    position: 'relative',
    width: '100%',
    flex: 1,
    minHeight: 0,
    height: '100%',
    overflow: 'hidden',
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
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(18, 18, 18, 0.94)' : 'rgba(255, 255, 255, 0.96)',
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
  bottomPanel: {
    flexShrink: 0,
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.12)',
    padding: theme.spacing(1, 1.5, 1.5),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    zIndex: 4,
    transition: 'all 0.25s ease',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.palette.divider,
    margin: '0 auto 6px auto',
    cursor: 'pointer',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: theme.spacing(0.75),
    textAlign: 'center',
  },
  metricCell: {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderRadius: theme.spacing(1.2),
    padding: theme.spacing(0.75, 0.5),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    fontSize: '0.68rem',
    color: theme.palette.text.secondary,
    lineHeight: 1.1,
    marginBottom: 2,
  },
  metricVal: {
    fontWeight: 700,
    fontSize: '0.82rem',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  metricUnit: {
    fontSize: '0.65rem',
    fontWeight: 500,
    marginLeft: 2,
    color: theme.palette.text.secondary,
  },
  floatingInfoPill: {
    position: 'absolute',
    bottom: theme.spacing(2.5),
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 6,
    borderRadius: 20,
    padding: theme.spacing(0.75, 2),
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.88)' : 'rgba(255, 255, 255, 0.94)',
    color: theme.palette.text.primary,
    backdropFilter: 'blur(8px)',
    boxShadow: theme.shadows[4],
    border: `1px solid ${theme.palette.divider}`,
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.82rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(45, 45, 45, 0.98)' : '#fff',
    },
  },
}));

const formatTimeAgo = (date) => {
  if (!date) return '--';
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 0) return 'now';
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) return `${totalDays}d ago`;
  if (totalHours > 0) return `${totalHours}h ago`;
  if (totalMinutes > 0) return `${totalMinutes}m ago`;
  return `${totalSeconds}s ago`;
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

  // Vehicle data calculations
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
  const displayPower = powerRaw != null ? `${powerRaw.toFixed(2)} V` : (batteryRaw != null ? `${batteryRaw}%` : '--');

  const fixTimeRaw = position?.attributes?.fixTime ?? position?.fixTime ?? position?.deviceTime;
  const reportTimeAgo = formatTimeAgo(fixTimeRaw);

  const rawName = device?.name || deviceName || 'Vehicle';
  const displayName = rawName.startsWith('*') ? rawName.slice(1).trim() : rawName;
  const statusColor = device?.status ? getStatusColor(device.status) : 'neutral';
  const statusDotColor = statusColor === 'success' ? '#4caf50' : statusColor === 'error' ? '#f44336' : statusColor === 'warning' ? '#ff9800' : '#9e9e9e';
  const statusText = device?.status ? formatStatus(device.status, t) : 'Online';

  const addressText = position?.address || (position ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}` : '');
  const deviceImage = device?.attributes?.deviceImage;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          className: isMobile ? classes.paperMobile : classes.paper,
        },
      }}
    >
      <DialogTitle className={classes.titleBar} component="div">
        <div className={classes.titleLeft}>
          <div className={classes.iconBadge}>
            <GoogleStreetViewIcon size={30} />
          </div>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Street View
            </Typography>
            <Typography variant="caption" color="textSecondary" noWrap sx={{ display: 'block' }}>
              {displayName} {position ? `· ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}` : ''}
            </Typography>
          </Box>
        </div>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isMobile && (
            <Tooltip title={showDetails ? 'Full Screen' : 'Show Vehicle Info'}>
              <IconButton size="small" onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? <FullscreenIcon fontSize="small" /> : <DirectionsCarIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Open in Google Maps">
            <IconButton
              component="a"
              href={directStreetViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent className={isMobile ? classes.contentMobile : classes.content}>
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
                  <CircularProgress size={40} sx={{ color: '#f57c00' }} />
                  <Typography variant="body2" color="textSecondary">
                    Loading Street View...
                  </Typography>
                </div>
              )}

              {/* Floating button on mobile when vehicle info is collapsed */}
              {isMobile && !showDetails && (
                <button
                  type="button"
                  className={classes.floatingInfoPill}
                  onClick={() => setShowDetails(true)}
                >
                  <DirectionsCarIcon sx={{ fontSize: 18, color: '#1a73e8' }} />
                  <span>Vehicle Info</span>
                  <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
                </button>
              )}
            </div>

            {/* Collapsible vehicle bottom panel on mobile */}
            {isMobile && showDetails && (
              <div className={classes.bottomPanel}>
                <div
                  className={classes.dragHandle}
                  onClick={() => setShowDetails(false)}
                  title="Hide Vehicle Info"
                />
                
                {/* Header row: image/icon, name, status, collapse button */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    {deviceImage ? (
                      <Box
                        component="img"
                        src={`/api/media/${device?.uniqueId}/${deviceImage}`}
                        alt={displayName}
                        sx={{ width: 34, height: 34, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1.5,
                          bgcolor: 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <DirectionsCarIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                      </Box>
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                        {displayName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            bgcolor: statusDotColor,
                          }}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          {statusText}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Tooltip title="Full Screen">
                    <IconButton size="small" onClick={() => setShowDetails(false)}>
                      <KeyboardArrowDownIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* 4-Metric Grid */}
                <div className={classes.metricsGrid}>
                  <div className={classes.metricCell}>
                    <span className={classes.metricLabel}>
                      <SpeedIcon sx={{ fontSize: 13, color: '#1a73e8' }} /> Speed
                    </span>
                    <span className={classes.metricVal}>
                      {speedValue != null ? speedValue : '--'}
                      <span className={classes.metricUnit}>{speedUnitLabel}</span>
                    </span>
                  </div>

                  <div className={classes.metricCell}>
                    <span className={classes.metricLabel}>
                      <RouteIcon sx={{ fontSize: 13, color: '#4caf50' }} /> Odometer
                    </span>
                    <span className={classes.metricVal}>
                      {distanceValue != null ? distanceValue : '--'}
                      <span className={classes.metricUnit}>{distanceUnitLabel}</span>
                    </span>
                  </div>

                  <div className={classes.metricCell}>
                    <span className={classes.metricLabel}>
                      <BatteryFullIcon sx={{ fontSize: 13, color: isLowPower ? '#f44336' : '#ff9800' }} /> Power
                    </span>
                    <span className={classes.metricVal} style={{ color: isLowPower ? '#f44336' : 'inherit' }}>
                      {displayPower}
                    </span>
                  </div>

                  <div className={classes.metricCell}>
                    <span className={classes.metricLabel}>
                      <AccessTimeIcon sx={{ fontSize: 13 }} /> Report
                    </span>
                    <span className={classes.metricVal}>
                      {reportTimeAgo}
                    </span>
                  </div>
                </div>

                {/* Address row */}
                {addressText && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                    <RoomIcon sx={{ fontSize: 15, color: '#e53935', flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }} noWrap>
                      {addressText}
                    </Typography>
                  </Box>
                )}

                {/* Action button */}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<OpenInNewIcon fontSize="small" />}
                  href={directStreetViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  fullWidth
                  sx={{
                    textTransform: 'none',
                    borderRadius: 1.5,
                    fontWeight: 600,
                    py: 0.6,
                    fontSize: '0.8rem',
                    borderColor: theme.palette.divider,
                    color: theme.palette.text.primary,
                    '&:hover': {
                      borderColor: '#1a73e8',
                      color: '#1a73e8',
                    },
                  }}
                >
                  Open in Google Maps
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className={classes.overlay}>
            <div className={classes.cardBox}>
              <div className={classes.emptyIconBox}>
                <GoogleStreetViewIcon size={56} />
              </div>

              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Street View
              </Typography>

              <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.5 }}>
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
