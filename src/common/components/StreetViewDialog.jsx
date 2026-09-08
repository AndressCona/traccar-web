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
import StreetviewIcon from '@mui/icons-material/Streetview';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
    backgroundColor: '#f57c00',
    color: '#fff',
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
    backgroundColor: 'rgba(245, 124, 0, 0.12)',
    color: '#f57c00',
  },
}));

const StreetViewDialog = ({ open, onClose, position, deviceName }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const traccarGoogleKey = useAttributePreference('googleKey');
  const [iframeLoading, setIframeLoading] = useState(true);

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
              Street View
            </Typography>
            {deviceName && (
              <Typography variant="caption" color="textSecondary" noWrap sx={{ display: 'block' }}>
                {deviceName} {position ? `· ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}` : ''}
              </Typography>
            )}
          </Box>
        </div>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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

      <DialogContent className={classes.content}>
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
                <CircularProgress size={40} sx={{ color: '#f57c00' }} />
                <Typography variant="body2" color="textSecondary">
                  Loading Street View...
                </Typography>
              </div>
            )}
          </>
        ) : (
          <div className={classes.overlay}>
            <div className={classes.cardBox}>
              <div className={classes.emptyIconBox}>
                <StreetviewIcon sx={{ fontSize: 32 }} />
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
                    backgroundColor: '#f57c00',
                    '&:hover': {
                      backgroundColor: '#e65100',
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
