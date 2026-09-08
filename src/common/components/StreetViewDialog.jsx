// Source: Google Maps Platform Code Assist
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
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
  TextField,
  useTheme,
  useMediaQuery,
  Collapse,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import StreetviewIcon from '@mui/icons-material/Streetview';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import InfoIcon from '@mui/icons-material/Info';
import { useTranslation } from './LocalizationProvider';
import { useAttributePreference } from '../util/preferences';
import { DEFAULT_GOOGLE_KEY } from '../util/googleConfig';

const useStyles = makeStyles()((theme) => ({
  paper: {
    borderRadius: theme.spacing(2.5),
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[10],
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1.5, 2.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
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
    width: 36,
    height: 36,
    borderRadius: theme.spacing(1),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
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
  iframe: {
    width: '100%',
    height: '100%',
    border: 0,
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
    width: 60,
    height: 60,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.palette.primary.main + '18',
    color: theme.palette.primary.main,
  },
}));

const StreetViewDialog = ({ open, onClose, position, deviceName }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const admin = useSelector((state) => Boolean(state.session.user?.administrator));

  // Preference from Traccar attributes, local storage or default configured key
  const traccarGoogleKey = useAttributePreference('googleKey');
  const [localKey, setLocalKey] = useState(() => localStorage.getItem('googleKey') || '');
  const [inputKey, setInputKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const activeKey = traccarGoogleKey || localKey || DEFAULT_GOOGLE_KEY;

  const directStreetViewUrl = position
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course || 0}`
    : '#';

  const embedUrl = position && activeKey
    ? `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(activeKey)}&location=${position.latitude}%2C${position.longitude}&heading=${position.course || 0}&pitch=0&fov=90`
    : null;

  useEffect(() => {
    if (open) {
      setIframeLoading(true);
      setShowKeyInput(false);
    }
  }, [open, position?.latitude, position?.longitude]);

  const handleSaveKey = () => {
    const trimmed = inputKey.trim();
    if (trimmed) {
      localStorage.setItem('googleKey', trimmed);
      setLocalKey(trimmed);
      setShowKeyInput(false);
      setIframeLoading(true);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          className: classes.paper,
        },
      }}
    >
      <DialogTitle className={classes.titleBar} component="div">
        <div className={classes.titleLeft}>
          <div className={classes.iconBadge}>
            <StreetviewIcon fontSize="small" />
          </div>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {t('linkStreetView')}
            </Typography>
            {deviceName && (
              <Typography variant="caption" color="textSecondary" noWrap sx={{ display: 'block' }}>
                {deviceName} {position ? `· ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}` : ''}
              </Typography>
            )}
          </Box>
        </div>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {admin && (
            <Tooltip title="Configurar clave de Google">
              <IconButton size="small" onClick={() => setShowKeyInput((prev) => !prev)}>
                <VpnKeyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Abrir en Google Maps (gratis en nueva pestaña)">
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
          <Tooltip title={t('sharedClose')}>
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent className={classes.content}>
        {/* If an active key exists, render the official Google Maps Embed iframe (100% Free & Unlimited) */}
        {embedUrl ? (
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
              <div className={classes.overlay}>
                <CircularProgress size={40} />
                <Typography variant="body2" color="textSecondary">
                  Cargando Street View...
                </Typography>
              </div>
            )}
          </>
        ) : (
          /* When no API key is configured, show friendly view with direct free link and key config option */
          <div className={classes.overlay}>
            <div className={classes.cardBox}>
              <div className={classes.emptyIconBox}>
                <StreetviewIcon sx={{ fontSize: 32 }} />
              </div>

              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Street View en Google Maps
              </Typography>

              <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.5 }}>
                Google no permite incrustar directamente su web completa en un iframe debido a sus políticas de seguridad (<code>X-Frame-Options</code>).
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
                  }}
                >
                  Abrir Street View en Google Maps (Gratis)
                </Button>

                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowKeyInput((v) => !v)}
                  startIcon={<VpnKeyIcon />}
                  sx={{ textTransform: 'none', color: 'text.secondary', fontSize: '0.85rem' }}
                >
                  {showKeyInput
                    ? 'Ocultar configuración de clave'
                    : '¿Deseas verlo incrustado aquí dentro? (Embed API gratuito)'}
                </Button>
              </Box>

              <Collapse in={showKeyInput} sx={{ width: '100%' }}>
                <Box
                  sx={{
                    mt: 1,
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f9f9f9',
                    textAlign: 'left',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <InfoIcon fontSize="small" color="primary" />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Google Maps Embed API es 100% gratuita y sin límites
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5 }}>
                    Para mostrar el visor embebido dentro de este modal, Google solo exige que incluyas una clave API en la URL (su uso en Embed es completamente gratis: $0 USD).
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Pega tu clave de Google Maps API"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSaveKey}
                      disabled={!inputKey.trim()}
                      sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                    >
                      Guardar
                    </Button>
                  </Box>
                </Box>
              </Collapse>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StreetViewDialog;
