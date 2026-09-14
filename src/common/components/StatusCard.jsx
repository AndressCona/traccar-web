import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
import { useTheme, alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RouteIcon from '@mui/icons-material/Route';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import PendingIcon from '@mui/icons-material/Pending';
import SpeedIcon from '@mui/icons-material/Speed';
import RoomIcon from '@mui/icons-material/Room';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert';
import ExploreIcon from '@mui/icons-material/Explore';
import HeightIcon from '@mui/icons-material/Height';
import CircleIcon from '@mui/icons-material/Circle';
import ShareIcon from '@mui/icons-material/Share';
import ErrorIcon from '@mui/icons-material/Error';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import GoogleStreetViewIcon from './GoogleStreetViewIcon';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import AddressValue from './AddressValue';
import AccumulatorsDialog from './AccumulatorsDialog';
import ShareDialog from './ShareDialog';
import StreetViewDialog from './StreetViewDialog';
import BaseCommandView from '../../settings/components/BaseCommandView';
import DevicePage from '../../settings/DevicePage';
import { useDeviceReadonly } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import AnimatedNumber from './AnimatedNumber';
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
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(0.75, 1.5),
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    minHeight: 44,
    gap: theme.spacing(1),
    cursor: 'move',
    userSelect: 'none',
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    minWidth: 0,
    flex: 1,
  },
  topBarTitle: {
    fontWeight: 700,
    fontSize: '0.95rem',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: theme.palette.text.primary,
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flexShrink: 0,
  },
  topBarStatus: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color:
      theme.palette.mode === 'light'
        ? theme.palette[statusColor]?.main || (statusColor === 'success' ? '#2e7d32' : statusColor === 'error' ? '#d32f2f' : theme.palette.text.secondary)
        : theme.palette[statusColor]?.light || theme.palette[statusColor]?.main || (statusColor === 'success' ? '#4caf50' : statusColor === 'error' ? '#f44336' : theme.palette.text.secondary),
    marginRight: theme.spacing(0.25),
  },
  topBarButton: {
    padding: 4,
    color: theme.palette.text.secondary,
    '&:hover': {
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.action.hover,
    },
  },
  alarmBadge: {
    color: theme.palette.common.white,
    backgroundColor: theme.palette.error.main,
    padding: 3,
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
  },
  minimizedButton: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    overflow: 'hidden',
    boxShadow: `0 4px 18px 2px ${alpha(theme.palette.primary.main, 0.55)}, 0 2px 8px ${alpha(theme.palette.primary.main, 0.35)}, 0 2px 4px rgba(0, 0, 0, 0.2)`,
    pointerEvents: 'auto',
    cursor: 'pointer',
    border: `3px solid ${theme.palette.background.paper}`,
  },
  minimizedImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
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
  hasEventsIcon: {
    flex: 'none',
    fontSize: '1.1rem',
    color: theme.palette.error.main,
    cursor: 'pointer',
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
    textAlign: 'center',
  },
  metricKey: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    color: theme.palette.text.secondary,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 700,
    marginTop: 4,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: 500,
    color: theme.palette.text.secondary,
    marginLeft: 4,
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
    fontSize: 18,
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  odometerEdit: {
    display: 'inline-flex',
    fontSize: 18,
    lineHeight: 1,
  },
  addressRow: {
    padding: theme.spacing(1.25, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
      bottom: `calc(${theme.dimensions.bottomBarHeight}px + 12px)`,
      transform: 'translateX(-50%)',
    },
  },
  rootMinimized: {
    [theme.breakpoints.up('md')]: {
      right: 16,
      bottom: theme.spacing(5),
    },
    [theme.breakpoints.down('md')]: {
      left: 'auto !important',
      right: `${theme.spacing(2)} !important`,
      bottom: `calc(${theme.dimensions.bottomBarHeight}px + 40px) !important`,
      transform: 'none !important',
    },
  },

}));

const StatusCard = ({ deviceId, position, onClose, disableActions, onEventsClick, devicesOpen }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const deviceReadonly = useDeviceReadonly();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [minimized, setMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const autoMinimizedByListRef = useRef(false);

  useEffect(() => {
    autoMinimizedByListRef.current = false;
    setMinimized(false);
  }, [deviceId]);

  useEffect(() => {
    if (isMobile) {
      if (devicesOpen) {
        if (!minimized) {
          autoMinimizedByListRef.current = true;
          setMinimized(true);
        }
      } else if (autoMinimizedByListRef.current) {
        autoMinimizedByListRef.current = false;
        setMinimized(false);
      }
    }
  }, [devicesOpen, isMobile]);

  const handleDrag = () => {
    if (!isDragging) setIsDragging(true);
  };

  const handleDragStop = () => {
    setIsDragging(false);
  };

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const isSignalLost =
    device &&
    (device.status === 'offline' || device.status === 'unknown') &&
    position &&
    position.attributes.ignition;
  const statusColor = isSignalLost ? 'warning' : device ? getStatusColor(device.status) : 'neutral';
  const { classes } = useStyles({ statusColor });

  const noCutoff = device?.name.startsWith('*');
  const displayName = noCutoff ? device.name.slice(1).trim() : device?.name;

  const events = useSelector((state) => state.events.items);
  const deviceEvents = events.filter((e) => e.deviceId === deviceId);
  const hasEvents = deviceEvents.length > 0;

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

  const [stateDurationMs, setStateDurationMs] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchStateDuration = async () => {
      if (!deviceId) return;

      const fetchWithFrom = async (days) => {
        const to = new Date().toISOString();
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const query = new URLSearchParams();
        query.append('deviceId', deviceId);
        query.append('from', from);
        query.append('to', to);
        query.append('type', 'deviceStopped');
        query.append('type', 'deviceMoving');

        const response = await fetchOrThrow(`/api/reports/events?${query.toString()}`);
        return await response.json();
      };

      try {
        let data;
        try {
          data = await fetchWithFrom(90);
        } catch (e) {
          data = await fetchWithFrom(31);
        }

        if (!active) return;

        const sorted = data.sort(
          (a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime(),
        );
        const lastEvent = sorted[0];

        if (lastEvent) {
          setStateDurationMs(Date.now() - new Date(lastEvent.eventTime).getTime());
        } else {
          setStateDurationMs(null);
        }
      } catch (e) {
        // ignore
      }
    };

    fetchStateDuration();
    const interval = setInterval(() => {
      setStateDurationMs((prev) => (prev != null ? prev + 1000 : null));
    }, 1000); // tick every second

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [deviceId]);

  const formatStateDuration = (ms) => {
    if (ms == null) return '';
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const totalDays = Math.floor(totalHours / 24);
    const days = totalDays % 30; // approx
    const totalMonths = Math.floor(totalDays / 30);
    const months = totalMonths % 12;
    const years = Math.floor(totalMonths / 12);

    let parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}M`);
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return `for ${parts.slice(0, 3).join(' ')}`;
  };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const ms = Date.now() - new Date(date).getTime();
    if (ms < 0) return 'now'; // handle slight future times
    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const totalMonths = Math.floor(totalDays / 30);
    const years = Math.floor(totalMonths / 12);

    const render = (val, unit) => (
      <>
        {val}
        <span className={classes.metricUnit}>{unit} ago</span>
      </>
    );

    if (years > 0) return render(years, 'y');
    if (totalMonths > 0) return render(totalMonths, 'month');
    if (totalDays > 0) return render(totalDays, 'days');
    if (totalHours > 0) return render(totalHours, 'h');
    if (totalMinutes > 0) return render(totalMinutes, 'min');
    return render(totalSeconds, 'seg');
  };

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

  const [accumulatorsOpen, setAccumulatorsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [streetViewOpen, setStreetViewOpen] = useState(false);

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
    if (command.type) {
      localStorage.setItem(`lastCommand_${deviceId}`, command.type);
    }
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
        (key) =>
          key === 'power' ||
          position.hasOwnProperty(key) ||
          position.attributes.hasOwnProperty(key),
      )
    : [];
  const hasAddress = itemKeys.includes('address');
  const otherKeys = itemKeys.filter((key) => key !== 'address');
  const topMetricKeys = otherKeys.filter((key) => ['speed', 'totalDistance'].includes(key));
  const bottomMetricKeys = otherKeys.filter((key) => ['power', 'fixTime'].includes(key));
  const rowKeys = otherKeys.filter(
    (key) => !['speed', 'totalDistance', 'power', 'fixTime'].includes(key),
  );

  const labelFor = (key) => LABEL_OVERRIDES[key] || positionAttributes[key]?.name || key;

  const renderValue = (key) => {
    if (key === 'speed') {
      const speedValue = Math.round(speedFromKnots(position.speed, speedUnit));
      return (
        <>
          <AnimatedNumber value={speedValue} />
          <span className={classes.metricUnit}>{speedUnitString(speedUnit, t)}</span>
        </>
      );
    }
    if (key === 'totalDistance') {
      const meters = position.hasOwnProperty('totalDistance')
        ? position.totalDistance
        : position.attributes.totalDistance;
      const distance = Math.round(distanceFromMeters(meters, distanceUnit));
      return (
        <>
          {distance.toLocaleString('es-ES')}
          <span className={classes.metricUnit}>{distanceUnitString(distanceUnit, t)}</span>
          {!deviceReadonly && (
            <Link
              component="button"
              underline="none"
              onClick={() => setAccumulatorsOpen(true)}
              className={classes.odometerEdit}
            >
              &#9881;
            </Link>
          )}
        </>
      );
    }
    if (key === 'power') {
      const value = position.hasOwnProperty(key) ? position[key] : position.attributes[key];
      if (value == null) {
        return (
          <>
            <span style={{ color: '#f44336' }}>--</span>
            <span className={classes.metricUnit}>V</span>
          </>
        );
      }
      return (
        <>
          <span style={{ color: value < 12 ? '#f44336' : 'inherit' }}>{value.toFixed(2)}</span>
          <span className={classes.metricUnit}>V</span>
        </>
      );
    }
    if (key === 'fixTime' || key === 'deviceTime' || key === 'serverTime') {
      const value = position.hasOwnProperty(key) ? position[key] : position.attributes[key];
      return value ? formatTimeAgo(value) : '';
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
      <div className={`${classes.root} ${minimized ? classes.rootMinimized : ''}`}>
        {device && (
          <Rnd
            key={minimized ? 'rnd-min' : 'rnd-full'}
            default={{ x: 0, y: 0, width: 'auto', height: 'auto' }}
            enableResizing={false}
            dragHandleClassName="draggable-header"
            style={{ position: 'relative' }}
            onDrag={handleDrag}
            onDragStop={handleDragStop}
          >
            {minimized ? (
              <div 
                className={`draggable-header ${classes.minimizedButton}`}
                onClick={(e) => {
                  e.stopPropagation();
                  autoMinimizedByListRef.current = false;
                  setMinimized(false);
                }}
                onTouchEnd={(e) => {
                  if (!isDragging) {
                    e.stopPropagation();
                    autoMinimizedByListRef.current = false;
                    setMinimized(false);
                  }
                }}
              >
                {deviceImage ? (
                  <img src={`/api/media/${device.uniqueId}/${deviceImage}`} alt="" className={classes.minimizedImage} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.palette.primary.main }}>
                    <img style={{ width: 32, height: 32 }} src={mapIcons[mapIconKey(device.category)]} alt="" />
                  </div>
                )}
              </div>
            ) : (
            <Card elevation={8} className={classes.card}>
              <div className={`draggable-header ${classes.topBar}`}>
                <div className={classes.topBarLeft}>
                  <CircleIcon
                    sx={{
                      fontSize: 10,
                      flexShrink: 0,
                      color:
                        theme.palette.mode === 'light'
                          ? theme.palette[statusColor]?.main || (statusColor === 'success' ? '#2e7d32' : statusColor === 'error' ? '#d32f2f' : '#4caf50')
                          : theme.palette[statusColor]?.light || theme.palette[statusColor]?.main || (statusColor === 'success' ? '#4caf50' : statusColor === 'error' ? '#f44336' : '#4caf50'),
                    }}
                  />
                  <Typography className={classes.topBarTitle}>
                    {displayName}
                  </Typography>
                  {hasEvents && (
                    <Tooltip
                      title={`${deviceEvents.length} Pending Notification${deviceEvents.length > 1 ? 's' : ''}`}
                    >
                      <IconButton
                        size="small"
                        sx={{ padding: 0.25 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (onEventsClick) onEventsClick();
                        }}
                      >
                        <NotificationsActiveIcon sx={{ fontSize: '1.05rem', color: theme.palette.error.main }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {noCutoff && (
                    <Tooltip title="No cutoff available">
                      <PowerOffIcon sx={{ fontSize: '1.05rem', color: theme.palette.warning.main }} />
                    </Tooltip>
                  )}
                </div>
                <div className={classes.topBarRight}>
                  <Typography className={classes.topBarStatus}>
                    {formatStatus(device.status, t)}
                  </Typography>
                  {hasAlarm && (
                    <Tooltip
                      title={`${t('eventAlarm')}: ${formatAlarm(position.attributes.alarm, t)}`}
                    >
                      <IconButton size="small" className={classes.alarmBadge}>
                        <ErrorIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title={t('sharedMinimize') || 'Minimize'}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMinimized(true);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        setMinimized(true);
                      }}
                      className={classes.topBarButton}
                    >
                      <KeyboardArrowDownIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('sharedClose') || 'Close'}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      className={classes.topBarButton}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>

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
              </CardMedia>

              <div className={classes.head}>
                <div className={classes.nameRow}>
                  <Typography variant="subtitle1" className={classes.name}>
                    {device.model ? device.model : displayName}
                  </Typography>
                </div>
                {position && position.attributes && (
                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '0.85rem',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {device.status === 'offline' || device.status === 'unknown' ? (
                        <>
                          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                            {position.attributes.ignition ? (
                              <span style={{ color: theme.palette.warning.main }}>Signal Lost</span>
                            ) : (
                              <span style={{ color: theme.palette.error.main }}>Offline</span>
                            )}
                          </span>
                          {device.lastUpdate && (
                            <span
                              style={{ marginLeft: '4px', color: theme.palette.text.secondary }}
                            >
                              {formatTimeAgo(device.lastUpdate)}
                            </span>
                          )}
                        </>
                      ) : (
                        stateDurationMs != null && (
                          <>
                            <span
                              style={{
                                color: position.attributes.ignition
                                  ? theme.palette.success.main
                                  : theme.palette.text.disabled,
                                fontWeight: 600,
                              }}
                            >
                              {position.attributes.ignition ? 'Driving' : 'Parked'}
                            </span>
                            <span
                              style={{ marginLeft: '4px', color: theme.palette.text.secondary }}
                            >
                              {formatStateDuration(stateDurationMs)}
                            </span>
                          </>
                        )
                      )}
                    </div>

                    {(position.attributes.hasOwnProperty('sat') ||
                      position.attributes.hasOwnProperty('rssi')) && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {position.attributes.hasOwnProperty('sat') && (
                          <Tooltip title="Satellites">
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                              {device.status === 'offline' || device.status === 'unknown'
                                ? 0
                                : position.attributes.sat}
                              <SatelliteAltIcon style={{ width: 16, height: 16, marginLeft: 2 }} />
                            </span>
                          </Tooltip>
                        )}
                        {position.attributes.hasOwnProperty('rssi') && (
                          <Tooltip title="Signal (RSSI)">
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                              {device.status === 'offline' || device.status === 'unknown'
                                ? 0
                                : position.attributes.rssi}
                              <SignalCellularAltIcon
                                style={{ width: 16, height: 16, marginLeft: 2 }}
                              />
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {position && (
                <CardContent className={classes.content}>
                  {topMetricKeys.length > 0 && (
                    <div className={classes.metrics}>
                      {topMetricKeys.map((key) => {
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
                      {topMetricKeys.length % 2 !== 0 && <div className={classes.metric} />}
                    </div>
                  )}
                  {hasAddress && (
                    <div className={classes.addressRow}>
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div className={classes.metricKey} style={{ justifyContent: 'flex-start' }}>
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
                      <Tooltip title="Street View">
                        <IconButton
                          size="small"
                          onClick={() => setStreetViewOpen(true)}
                          disabled={!position}
                          style={{ marginLeft: 8, flexShrink: 0, padding: 4 }}
                        >
                          <GoogleStreetViewIcon size={22} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('sharedExtra')}>
                        <IconButton
                          size="small"
                          onClick={(e) => setAnchorEl(e.currentTarget)}
                          disabled={!position}
                          style={{ marginLeft: 2, flexShrink: 0 }}
                        >
                          <PendingIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )}
                  {bottomMetricKeys.length > 0 && (
                    <div className={classes.metrics}>
                      {bottomMetricKeys.map((key) => {
                        let Icon = ROW_ICONS[key] || CircleIcon;
                        let iconColor = 'inherit';
                        if (key === 'power') {
                          const val = position.hasOwnProperty(key)
                            ? position[key]
                            : position.attributes[key];
                          if (val == null || val < 12) {
                            Icon = BatteryAlertIcon;
                            iconColor = '#f44336';
                          }
                        }
                        return (
                          <div key={key} className={classes.metric}>
                            <div className={classes.metricKey}>
                              <Icon sx={{ fontSize: 13, color: iconColor }} />
                              {labelFor(key)}
                            </div>
                            <div className={classes.metricValue}>{renderValue(key)}</div>
                          </div>
                        );
                      })}
                      {bottomMetricKeys.length % 2 !== 0 && <div className={classes.metric} />}
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
                    onClick={() => setEditOpen(true)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {!shareDisabled && !user.temporary && (
                  <Tooltip title={t('sharedShare')}>
                    <IconButton
                      className={classes.actionButton}
                      onClick={() => setShareOpen(true)}
                      disabled={disableActions}
                    >
                      <ShareIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
            )}
          </Rnd>
        )}
      </div>
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
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
      <AccumulatorsDialog
        open={accumulatorsOpen}
        onClose={() => setAccumulatorsOpen(false)}
        deviceId={deviceId}
      />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} deviceId={deviceId} />
      <StreetViewDialog
        open={streetViewOpen}
        onClose={() => setStreetViewOpen(false)}
        position={position}
        device={device}
        deviceId={deviceId}
        deviceName={device?.name}
      />
      {editOpen && <DevicePage isDialog id={deviceId} item={device} onClose={() => setEditOpen(false)} />}
    </>
  );
};

export default StatusCard;
