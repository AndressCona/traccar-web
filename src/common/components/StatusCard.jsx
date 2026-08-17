import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  IconButton,
  Menu,
  MenuItem,
  CardMedia,
  Link,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PendingIcon from '@mui/icons-material/Pending';
import SpeedIcon from '@mui/icons-material/Speed';
import RoomIcon from '@mui/icons-material/Room';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import ExploreIcon from '@mui/icons-material/Explore';
import HeightIcon from '@mui/icons-material/Height';
import CircleIcon from '@mui/icons-material/Circle';
import ErrorIcon from '@mui/icons-material/Error';
import PowerOffIcon from '@mui/icons-material/PowerOff';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import AddressValue from './AddressValue';
import BaseCommandView from '../../settings/components/BaseCommandView';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';
import { formatAlarm, formatStatus, getStatusColor } from '../util/formatter';
import {
  distanceFromMeters,
  distanceUnitString,
  speedFromKnots,
  speedUnitString,
} from '../util/converter';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';

const ROW_ICONS = {
  speed: SpeedIcon,
  fixTime: AccessTimeIcon,
  deviceTime: AccessTimeIcon,
  serverTime: AccessTimeIcon,
  totalDistance: RouteIcon,
  distance: RouteIcon,
  batteryLevel: BatteryFullIcon,
  power: BatteryFullIcon,
  course: ExploreIcon,
  altitude: HeightIcon,
};

const LABEL_OVERRIDES = {
  totalDistance: 'Odometer',
  fixTime: 'Last Report',
  deviceTime: 'Last Report',
  serverTime: 'Last Report',
};

// Fixed layout so every account sees the same card, regardless of the
// per-user "positionItems" preference stored in Traccar.
const CARD_FIELDS = ['speed', 'totalDistance', 'address', 'power', 'fixTime'];

const useStyles = makeStyles()((theme, { statusColor }) => ({
  card: {
    pointerEvents: 'auto',
    width: theme.dimensions.popupMaxWidth,
    borderRadius: theme.spacing(2),
    overflow: 'hidden',
  },
  banner: {
    position: 'relative',
    height: theme.dimensions.popupImageHeight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
  },
  bannerIcon: {
    width: 52,
    height: 52,
    opacity: theme.palette.mode === 'dark' ? 0.7 : 0.5,
  },
  bannerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing(0.75),
    padding: theme.spacing(1),
  },
  close: {
    color: theme.palette.common.white,
    backgroundColor: 'rgba(0,0,0,.35)',
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,.55)',
    },
  },
  alarmBadge: {
    color: theme.palette.common.white,
    backgroundColor: theme.palette.error.main,
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
  },
  pill: {
    position: 'absolute',
    left: theme.spacing(1),
    top: theme.spacing(1),
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 20,
    color: theme.palette.common.white,
    backgroundColor: 'rgba(0,0,0,.55)',
  },
  pillDot: {
    fontSize: '8px !important',
    color: theme.palette[statusColor]?.main || theme.palette.neutral.main,
  },
  head: {
    padding: theme.spacing(1, 2),
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(0.5),
    minWidth: 0,
  },
  name: {
    minWidth: 0,
    fontWeight: 700,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  modelSuffix: {
    fontWeight: 400,
    color: theme.palette.text.secondary,
  },
  noCutoffIcon: {
    flex: 'none',
    fontSize: '1.1rem',
    color: theme.palette.warning.main,
  },
  commandPaper: {
    borderRadius: theme.spacing(3),
  },
  commandTitle: {
    fontWeight: 700,
    padding: theme.spacing(2.5, 3, 1),
  },
  commandContent: {
    '&&': {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2.5),
      padding: theme.spacing(3),
    },
  },
  commandActions: {
    padding: theme.spacing(1.5, 3, 2.5),
    gap: theme.spacing(1),
  },
  commandButton: {
    borderRadius: theme.spacing(1.5),
    textTransform: 'none',
    fontWeight: 600,
  },
  content: {
    padding: 0,
    maxHeight: theme.dimensions.cardContentMaxHeight,
    overflow: 'auto',
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 1,
    backgroundColor: theme.palette.divider,
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  metric: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(1.25, 2),
  },
  metricKey: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    color: theme.palette.text.secondary,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 700,
    marginTop: 4,
  },
  rows: {
    padding: theme.spacing(1.5, 2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.25),
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1.25),
  },
  rowIcon: {
    color: theme.palette.text.secondary,
    marginTop: 2,
  },
  rowKey: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    color: theme.palette.text.secondary,
  },
  rowValue: {
    fontWeight: 600,
    fontSize: 12.5,
  },
  compactValue: {
    fontSize: 13,
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  odometerEdit: {
    display: 'inline-flex',
    fontSize: 13,
    lineHeight: 1,
  },
  addressRow: {
    padding: theme.spacing(1.25, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  addressValue: {
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  actions: {
    padding: 0,
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  actionButton: {
    flex: 1,
    borderRadius: 0,
    borderRight: `1px solid ${theme.palette.divider}`,
    '&:last-of-type': {
      borderRight: 'none',
    },
  },
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    [theme.breakpoints.up('md')]: {
      // 10px matches maplibre-gl's default control margin, so the card
      // lines up with the floating zoom/layers/location button column.
      right: 10,
      // Matches the sidebar's own margin, so the card's bottom edge lines
      // up with the sidebar's bottom edge.
      bottom: theme.spacing(1.5),
    },
    [theme.breakpoints.down('md')]: {
      left: '50%',
      bottom: `calc(${theme.spacing(3)} + ${theme.dimensions.bottomBarHeight}px)`,
      transform: 'translateX(-50%)',
    },
  },
}));

const StatusCard = ({ deviceId, position, onClose, disableActions }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const statusColor = device ? getStatusColor(device.status) : 'neutral';
  const { classes } = useStyles({ statusColor });

  const noCutoff = device?.name.startsWith('*');
  const displayName = noCutoff ? device.name.slice(1).trim() : device?.name;

  const deviceImage = device?.attributes?.deviceImage;
  const hasAlarm = position?.attributes?.hasOwnProperty('alarm');

  const positionAttributes = usePositionAttributes(t);
  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');

  const addressRef = useRef(null);

  useEffect(() => {
    const element = addressRef.current;
    if (!element) {
      return undefined;
    }
    const maxSize = 12.5;
    const minSize = 9;
    const fit = () => {
      let size = maxSize;
      element.style.fontSize = `${size}px`;
      while (element.scrollWidth > element.clientWidth && size > minSize) {
        size -= 0.5;
        element.style.fontSize = `${size}px`;
      }
    };
    fit();
    const observer = new MutationObserver(fit);
    observer.observe(element, { childList: true, characterData: true, subtree: true });
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [position?.deviceId]);

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');

  const [anchorEl, setAnchorEl] = useState(null);

  const [removing, setRemoving] = useState(false);

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSavedId, setCommandSavedId] = useState(0);
  const [commandItem, setCommandItem] = useState({});

  const openCommand = () => {
    setCommandSavedId(0);
    setCommandItem({});
    setCommandOpen(true);
  };

  const handleSendCommand = useCatch(async () => {
    let command;
    if (commandSavedId) {
      const response = await fetchOrThrow(`/api/commands/${commandSavedId}`);
      command = await response.json();
    } else {
      command = commandItem;
    }
    command.deviceId = deviceId;
    await fetchOrThrow('/api/commands/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    setCommandOpen(false);
  });

  const commandValid = commandSavedId || (commandItem && commandItem.type);

  const handleGeofence = useCatchCallback(async () => {
    const newItem = {
      name: t('sharedGeofence'),
      area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
    };
    const response = await fetchOrThrow('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    const item = await response.json();
    await fetchOrThrow('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
    });
    navigate(`/settings/geofence/${item.id}`);
  }, [navigate, position, t]);

  const itemKeys = position
    ? CARD_FIELDS.filter(
        (key) => position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key),
      )
    : [];
  const hasAddress = itemKeys.includes('address');
  const otherKeys = itemKeys.filter((key) => key !== 'address');
  const metricKeys = otherKeys.slice(0, 2);
  const rowKeys = otherKeys.slice(2);

  const labelFor = (key) => LABEL_OVERRIDES[key] || positionAttributes[key]?.name || key;

  const renderValue = (key) => {
    if (key === 'speed') {
      return `${Math.round(speedFromKnots(position.speed, speedUnit))} ${speedUnitString(speedUnit, t)}`;
    }
    if (key === 'totalDistance') {
      const meters = position.hasOwnProperty('totalDistance')
        ? position.totalDistance
        : position.attributes.totalDistance;
      return (
        <>
          {Math.round(distanceFromMeters(meters, distanceUnit))}{' '}
          {distanceUnitString(distanceUnit, t)}
          {!deviceReadonly && (
            <Link
              component={RouterLink}
              underline="none"
              to={`/settings/accumulators/${position.deviceId}`}
              className={classes.odometerEdit}
            >
              &#9881;
            </Link>
          )}
        </>
      );
    }
    return (
      <PositionValue
        position={position}
        property={position.hasOwnProperty(key) ? key : null}
        attribute={position.hasOwnProperty(key) ? null : key}
      />
    );
  };

  return (
    <>
      <div className={classes.root}>
        {device && (
          <Rnd
            default={{ x: 0, y: 0, width: 'auto', height: 'auto' }}
            enableResizing={false}
            dragHandleClassName="draggable-header"
            style={{ position: 'relative' }}
          >
            <Card elevation={8} className={classes.card}>
              <CardMedia
                className={`draggable-header ${classes.banner}`}
                image={deviceImage && `/api/media/${device.uniqueId}/${deviceImage}`}
              >
                {!deviceImage && (
                  <img
                    className={classes.bannerIcon}
                    src={mapIcons[mapIconKey(device.category)]}
                    alt=""
                  />
                )}
                <span className={classes.pill}>
                  <CircleIcon className={classes.pillDot} />
                  {formatStatus(device.status, t)}
                </span>
                <div className={classes.bannerHeader}>
                  {hasAlarm && (
                    <Tooltip
                      title={`${t('eventAlarm')}: ${formatAlarm(position.attributes.alarm, t)}`}
                    >
                      <IconButton size="small" className={classes.alarmBadge}>
                        <ErrorIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <IconButton
                    size="small"
                    className={classes.close}
                    onClick={onClose}
                    onTouchStart={onClose}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>
              </CardMedia>

              <div className={classes.head}>
                <div className={classes.nameRow}>
                  <Typography variant="subtitle1" className={classes.name}>
                    {displayName}
                    {device.model && <span className={classes.modelSuffix}> · {device.model}</span>}
                  </Typography>
                  {noCutoff && (
                    <Tooltip title="No cutoff available">
                      <PowerOffIcon className={classes.noCutoffIcon} />
                    </Tooltip>
                  )}
                </div>
              </div>

              {position && (
                <CardContent className={classes.content}>
                  {metricKeys.length > 0 && (
                    <div className={classes.metrics}>
                      {metricKeys.map((key) => {
                        const Icon = ROW_ICONS[key] || CircleIcon;
                        return (
                          <div key={key} className={classes.metric}>
                            <div className={classes.metricKey}>
                              <Icon sx={{ fontSize: 13 }} />
                              {labelFor(key)}
                            </div>
                            <div
                              className={
                                key === 'totalDistance'
                                  ? `${classes.metricValue} ${classes.compactValue}`
                                  : classes.metricValue
                              }
                            >
                              {renderValue(key)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {hasAddress && (
                    <div className={classes.addressRow}>
                      <div className={classes.metricKey}>
                        <RoomIcon sx={{ fontSize: 13 }} />
                        {t('positionAddress')}
                      </div>
                      <div ref={addressRef} className={classes.addressValue}>
                        <AddressValue
                          latitude={position.latitude}
                          longitude={position.longitude}
                          originalAddress={position.address}
                        />
                      </div>
                    </div>
                  )}
                  {rowKeys.length > 0 && (
                    <div className={classes.rows}>
                      {rowKeys.map((key) => {
                        const Icon = ROW_ICONS[key] || CircleIcon;
                        return (
                          <div key={key} className={classes.row}>
                            <Icon fontSize="small" className={classes.rowIcon} />
                            <div>
                              <div className={classes.rowKey}>{labelFor(key)}</div>
                              <div
                                className={
                                  key === 'totalDistance'
                                    ? `${classes.rowValue} ${classes.compactValue}`
                                    : classes.rowValue
                                }
                              >
                                {renderValue(key)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
              <CardActions className={classes.actions} disableSpacing>
                <Tooltip title={t('sharedExtra')}>
                  <IconButton
                    className={classes.actionButton}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    disabled={!position}
                  >
                    <PendingIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('reportReplay')}>
                  <IconButton
                    className={classes.actionButton}
                    onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
                    disabled={disableActions || !position}
                  >
                    <RouteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('commandTitle')}>
                  <IconButton
                    className={classes.actionButton}
                    onClick={openCommand}
                    disabled={disableActions}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedEdit')}>
                  <IconButton
                    className={classes.actionButton}
                    onClick={() => navigate(`/settings/device/${deviceId}`)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedRemove')}>
                  <IconButton
                    className={classes.actionButton}
                    color="error"
                    onClick={() => setRemoving(true)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Rnd>
        )}
      </div>
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => navigate(`/stream?deviceId=${deviceId}`)}
            disabled={position.protocol !== 'jt808'}
          >
            {t('linkLiveVideo')}
          </MenuItem>
          {!readonly && <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>}
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}
          >
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://maps.apple.com/?ll=${position.latitude},${position.longitude}`}
          >
            {t('linkAppleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}
          >
            {t('linkStreetView')}
          </MenuItem>
          {navigationAppTitle && navigationAppLink && (
            <MenuItem
              component="a"
              target="_blank"
              href={navigationAppLink
                .replace('{latitude}', position.latitude)
                .replace('{longitude}', position.longitude)}
            >
              {navigationAppTitle}
            </MenuItem>
          )}
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              <Typography color="secondary">{t('sharedShare')}</Typography>
            </MenuItem>
          )}
        </Menu>
      )}
      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
      <Dialog
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { className: classes.commandPaper } }}
      >
        <DialogTitle className={classes.commandTitle}>{t('commandTitle')}</DialogTitle>
        <DialogContent className={classes.commandContent}>
          <BaseCommandView
            deviceId={deviceId}
            item={commandItem}
            setItem={setCommandItem}
            includeSaved
            savedId={commandSavedId}
            setSavedId={setCommandSavedId}
            hideNoQueue
          />
        </DialogContent>
        <DialogActions className={classes.commandActions}>
          <Button onClick={() => setCommandOpen(false)} className={classes.commandButton}>
            {t('sharedCancel')}
          </Button>
          <Button
            onClick={handleSendCommand}
            disabled={!commandValid}
            variant="contained"
            disableElevation
            className={classes.commandButton}
          >
            {t('commandSend')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StatusCard;
