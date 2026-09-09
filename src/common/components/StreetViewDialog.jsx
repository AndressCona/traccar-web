// Source: Google Maps Platform Code Assist
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Button,
  CircularProgress,
  Box,
  Link,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SpeedIcon from '@mui/icons-material/Speed';
import RouteIcon from '@mui/icons-material/Route';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HistoryIcon from '@mui/icons-material/History';
import PolylineIcon from '@mui/icons-material/Polyline';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
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
  dialogPaper: {
    borderRadius: 20,
    backgroundColor: theme.palette.mode === 'dark' ? '#131418' : '#ffffff',
    color: theme.palette.text.primary,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.55)',
    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
    overflow: 'hidden',
    padding: 0,
    margin: theme.spacing(1.5),
    maxWidth: '430px !important',
    width: '100%',
  },
  dialogPaperFullScreen: {
    borderRadius: 0,
    margin: 0,
    maxWidth: '100% !important',
    width: '100%',
    height: '100%',
    maxHeight: '100%',
  },
  content: {
    padding: `${theme.spacing(2)} !important`,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
    backgroundColor: 'transparent',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    minWidth: 0,
  },
  carAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.palette.mode === 'dark' ? '#0a2e5c' : '#e0f2fe',
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
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  statusBadge: {
    padding: '3px 10px',
    borderRadius: 16,
    fontWeight: 600,
    fontSize: '0.78rem',
    lineHeight: 1.2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streetViewContainer: {
    position: 'relative',
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#090a0c',
    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
    transition: 'height 0.25s ease',
  },
  iframe: {
    position: 'relative',
    width: '100%',
    height: '100%',
    border: 0,
    display: 'block',
    zIndex: 1,
  },
  overlayNav: {
    position: 'absolute',
    top: 10,
    left: 10,
    display: 'flex',
    gap: 6,
    zIndex: 4,
  },
  overlayTools: {
    position: 'absolute',
    top: 10,
    right: 10,
    display: 'flex',
    gap: 6,
    zIndex: 4,
  },
  overlayButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 22, 28, 0.8)',
    backdropFilter: 'blur(8px)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    '&:hover': {
      backgroundColor: 'rgba(32, 35, 42, 0.95)',
    },
  },
  addressRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: theme.spacing(1),
    padding: theme.spacing(0.25, 0.5),
  },
  addressLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
    minWidth: 0,
    flex: 1,
  },
  divider: {
    width: '100%',
    height: '1px',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    margin: `${theme.spacing(0.25)} 0`,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing(1.2),
    width: '100%',
  },
  metricCard: {
    backgroundColor: theme.palette.mode === 'dark' ? '#181a20' : '#f8f9fa',
    borderRadius: 12,
    padding: theme.spacing(1.25, 1.5),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.06)'}`,
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  metricValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 5,
  },
  metricValue: {
    fontSize: '1.4rem',
    fontWeight: 700,
    lineHeight: 1.15,
    color: theme.palette.text.primary,
  },
  metricUnit: {
    fontSize: '0.84rem',
    fontWeight: 500,
    color: theme.palette.mode === 'dark' ? '#cbd5e1' : '#6b7280',
  },
  actionButtonsRow: {
    display: 'flex',
    gap: theme.spacing(1.2),
    width: '100%',
    marginTop: theme.spacing(0.25),
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingTop: theme.spacing(1.1),
    paddingBottom: theme.spacing(1.1),
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.88rem',
    borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    color: theme.palette.text.primary,
    '&:hover': {
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.08)',
    },
  },
}));

const formatTimeAgo = (date, isEs) => {
  if (!date) return '--';
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 0) return isEs ? 'hace un momento' : 'just now';
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) return isEs ? `hace ${totalDays} d` : `${totalDays}d ago`;
  if (totalHours > 0) return isEs ? `hace ${totalHours} h` : `${totalHours}h ago`;
  if (totalMinutes > 0) return isEs ? `hace ${totalMinutes} min` : `${totalMinutes} min ago`;
  return isEs ? `hace ${totalSeconds} seg` : `${totalSeconds}s ago`;
};

const formatReportDuration = (date, isEs) => {
  if (!date) return { value: '--', unit: '' };
  const ms = Math.max(0, Date.now() - new Date(date).getTime());
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) return { value: totalDays, unit: isEs ? 'd' : 'd' };
  if (totalHours > 0) return { value: totalHours, unit: isEs ? 'h' : 'h' };
  if (totalMinutes > 0) return { value: totalMinutes, unit: isEs ? 'min' : 'min' };
  return { value: totalSeconds, unit: isEs ? 'seg' : 's' };
};

const formatAddressParts = (address, position) => {
  if (!address) {
    return {
      main: position ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}` : '--',
      sub: '',
    };
  }
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      main: parts[0],
      sub: parts.slice(1).join(', '),
    };
  }
  return { main: address, sub: '' };
};

const StreetViewDialog = ({ open, onClose, position, device, deviceId, deviceName }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [headingOffset, setHeadingOffset] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const traccarGoogleKey = useAttributePreference('googleKey');
  const activeKey = traccarGoogleKey || DEFAULT_GOOGLE_KEY;

  const currentHeading = ((position?.course || 0) + headingOffset + 360) % 360;

  const directStreetViewUrl = position
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${currentHeading}`
    : '#';

  const embedUrl = position && activeKey
    ? `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(activeKey)}&location=${position.latitude}%2C${position.longitude}&heading=${currentHeading}&pitch=0&fov=90`
    : null;

  useEffect(() => {
    if (open) {
      setIframeLoading(true);
      setHeadingOffset(0);
      setIsFullScreen(false);
    }
  }, [open, position?.latitude, position?.longitude]);

  // Language detection (Spanish vs English based on translation output)
  const isEs = (t('sharedYes') || '').toLowerCase() === 'sí' || (t('sharedYes') || '').toLowerCase() === 'si';

  // Device calculations
  const rawName = device?.name || deviceName || 'Vehicle';
  const displayName = rawName.startsWith('*') ? rawName.slice(1).trim() : rawName;
  const isOnline = device?.status === 'online';
  const isMoving = position && (position.speed > 0.5 || position.attributes?.motion === true);

  const motionText = isMoving
    ? (isEs ? 'En movimiento' : (t('deviceStatusMoving') || 'Moving'))
    : (isEs ? 'Detenido' : (t('deviceStatusStopped') || 'Stopped'));

  const fixTimeRaw = position?.attributes?.fixTime ?? position?.fixTime ?? position?.deviceTime;
  const timeAgo = formatTimeAgo(fixTimeRaw, isEs);
  const reportDuration = formatReportDuration(fixTimeRaw, isEs);

  const statusLabel = isOnline
    ? (isEs ? 'En línea' : (t('deviceStatusOnline') || 'Online'))
    : (isEs ? 'Desconectado' : (t('deviceStatusOffline') || 'Offline'));

  // Metrics
  const speedUnit = useAttributePreference('speedUnit');
  const speedValue = position?.speed != null ? Math.round(speedFromKnots(position.speed, speedUnit)) : 0;
  const speedUnitLabel = speedUnitString(speedUnit, t);

  const distanceUnit = useAttributePreference('distanceUnit');
  const totalMeters = position?.attributes?.totalDistance ?? position?.totalDistance;
  const distanceValue = totalMeters != null
    ? Math.round(distanceFromMeters(totalMeters, distanceUnit)).toLocaleString(isEs ? 'es-ES' : 'en-US')
    : '--';
  const distanceUnitLabel = distanceUnitString(distanceUnit, t);

  const powerRaw = position?.attributes?.power ?? position?.power;
  const batteryRaw = position?.attributes?.batteryLevel ?? position?.batteryLevel;
  const displayPower = powerRaw != null
    ? powerRaw.toFixed(2).replace('.', isEs ? ',' : '.')
    : (batteryRaw != null ? batteryRaw : '--');
  const powerUnit = powerRaw != null ? 'v' : (batteryRaw != null ? '%' : '');

  const addressParts = formatAddressParts(position?.address, position);
  const deviceImage = device?.attributes?.deviceImage;
  const activeDeviceId = deviceId || device?.id;

  // Height of Street View
  const streetViewHeight = isFullScreen ? (isMobile ? '70vh' : '520px') : (isMobile ? 220 : 250);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          className: isFullScreen && isMobile ? classes.dialogPaperFullScreen : classes.dialogPaper,
        },
      }}
    >
      <DialogContent className={classes.content}>
        {/* 1. Header Bar */}
        <div className={classes.header}>
          <div className={classes.headerLeft}>
            <div className={classes.carAvatar}>
              {deviceImage ? (
                <img
                  src={`/api/media/${device?.uniqueId}/${deviceImage}`}
                  alt={displayName}
                  className={classes.carImage}
                />
              ) : (
                <DirectionsCarIcon sx={{ fontSize: 24, color: '#38bdf8' }} />
              )}
            </div>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }} noWrap>
                {displayName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block', mt: 0.25 }} noWrap>
                {motionText} · {timeAgo}
              </Typography>
            </Box>
          </div>

          <div className={classes.headerRight}>
            <div
              className={classes.statusBadge}
              style={{
                backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.12)' : 'rgba(156, 163, 175, 0.12)',
                color: isOnline ? '#22c55e' : '#9ca3af',
              }}
            >
              {statusLabel}
            </div>
            <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', p: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
        </div>

        {/* 2. Street View Frame with Controls */}
        <div className={classes.streetViewContainer} style={{ height: streetViewHeight }}>
          {/* Top-left rotation controls */}
          <div className={classes.overlayNav}>
            <button
              type="button"
              className={classes.overlayButton}
              onClick={() => setHeadingOffset((prev) => (prev - 45 + 360) % 360)}
              title="Rotate Left"
            >
              <ChevronLeftIcon fontSize="small" />
            </button>
            <button
              type="button"
              className={classes.overlayButton}
              onClick={() => setHeadingOffset((prev) => (prev + 45) % 360)}
              title="Rotate Right"
            >
              <ChevronRightIcon fontSize="small" />
            </button>
          </div>

          {/* Top-right map and fullscreen controls */}
          <div className={classes.overlayTools}>
            <button
              type="button"
              className={classes.overlayButton}
              onClick={() => window.open(directStreetViewUrl, '_blank', 'noopener,noreferrer')}
              title={isEs ? 'Abrir en Google Maps' : 'Open in Google Maps'}
            >
              <MapOutlinedIcon sx={{ fontSize: 18 }} />
            </button>
            <button
              type="button"
              className={classes.overlayButton}
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? (isEs ? 'Reducir' : 'Minimize') : (isEs ? 'Pantalla completa' : 'Full Screen')}
            >
              {isFullScreen ? <FullscreenExitIcon sx={{ fontSize: 18 }} /> : <FullscreenIcon sx={{ fontSize: 18 }} />}
            </button>
          </div>

          {/* Placeholder / Underlying container */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              color: '#6b7280',
              zIndex: 0,
            }}
          >
            <ImageOutlinedIcon sx={{ fontSize: 38, color: '#6b7280' }} />
            <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.85rem' }}>
              {isEs ? 'Vista de calle' : 'Street View'}
            </Typography>
          </Box>

          {embedUrl && (
            <>
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
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                    backgroundColor: 'rgba(9, 10, 12, 0.85)',
                    zIndex: 2,
                  }}
                >
                  <CircularProgress size={32} sx={{ color: '#38bdf8' }} />
                  <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500 }}>
                    {isEs ? 'Cargando Vista de calle...' : 'Loading Street View...'}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </div>

        {/* When not in full-screen street view, show details below */}
        {!isFullScreen && (
          <>
            {/* 3. Address Row */}
            <div className={classes.addressRow}>
              <div className={classes.addressLeft}>
                <LocationOnOutlinedIcon sx={{ color: '#cbd5e1', fontSize: 22, mt: 0.2, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.25 }} noWrap>
                    {addressParts.main}
                  </Typography>
                  {addressParts.sub && (
                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', fontSize: '0.78rem' }} noWrap>
                      {addressParts.sub}
                    </Typography>
                  )}
                </Box>
              </div>

              <Link
                href={directStreetViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: '#38bdf8',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  flexShrink: 0,
                  ml: 1,
                }}
              >
                <span>{isEs ? 'Abrir mapa' : 'Open map'}</span>
                <OpenInNewIcon sx={{ fontSize: 14 }} />
              </Link>
            </div>

            {/* Subtle Divider */}
            <div className={classes.divider} />

            {/* 4. 2x2 Metrics Grid */}
            <div className={classes.metricsGrid}>
              {/* Card 1: Speed */}
              <div className={classes.metricCard}>
                <div className={classes.metricHeader}>
                  <SpeedIcon sx={{ fontSize: 16 }} />
                  <span>{isEs ? 'Velocidad' : (t('positionSpeed') || 'Speed')}</span>
                </div>
                <div className={classes.metricValueRow}>
                  <span className={classes.metricValue}>{speedValue}</span>
                  <span className={classes.metricUnit}>{speedUnitLabel}</span>
                </div>
              </div>

              {/* Card 2: Odometer */}
              <div className={classes.metricCard}>
                <div className={classes.metricHeader}>
                  <RouteIcon sx={{ fontSize: 16 }} />
                  <span>{isEs ? 'Odómetro' : (t('positionOdometer') || 'Odometer')}</span>
                </div>
                <div className={classes.metricValueRow}>
                  <span className={classes.metricValue}>{distanceValue}</span>
                  <span className={classes.metricUnit}>{distanceUnitLabel}</span>
                </div>
              </div>

              {/* Card 3: Battery/Power */}
              <div className={classes.metricCard}>
                <div className={classes.metricHeader}>
                  <BatteryFullIcon sx={{ fontSize: 16 }} />
                  <span>{isEs ? 'Batería' : (t('positionPower') || 'Power')}</span>
                </div>
                <div className={classes.metricValueRow}>
                  <span className={classes.metricValue}>{displayPower}</span>
                  {powerUnit && <span className={classes.metricUnit}>{powerUnit}</span>}
                </div>
              </div>

              {/* Card 4: Last Report */}
              <div className={classes.metricCard}>
                <div className={classes.metricHeader}>
                  <AccessTimeIcon sx={{ fontSize: 16 }} />
                  <span>{isEs ? 'Último reporte' : (t('deviceLastUpdate') || 'Last report')}</span>
                </div>
                <div className={classes.metricValueRow}>
                  <span className={classes.metricValue}>{reportDuration.value}</span>
                  {reportDuration.unit && <span className={classes.metricUnit}>{reportDuration.unit}</span>}
                </div>
              </div>
            </div>

            {/* 5. Bottom Action Buttons: Historial & Recorrido */}
            <div className={classes.actionButtonsRow}>
              <Button
                variant="outlined"
                startIcon={<HistoryIcon sx={{ fontSize: 18 }} />}
                onClick={() => {
                  onClose();
                  if (activeDeviceId) navigate(`/replay?deviceId=${activeDeviceId}`);
                }}
                disabled={!activeDeviceId}
                className={classes.actionButton}
              >
                {isEs ? 'Historial' : (t('reportReplay') || 'History')}
              </Button>

              <Button
                variant="outlined"
                startIcon={<PolylineIcon sx={{ fontSize: 18 }} />}
                onClick={() => {
                  onClose();
                  if (activeDeviceId) navigate(`/reports/route?deviceId=${activeDeviceId}`);
                }}
                disabled={!activeDeviceId}
                className={classes.actionButton}
              >
                {isEs ? 'Recorrido' : (t('reportRoute') || 'Route')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StreetViewDialog;
