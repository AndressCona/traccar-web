import { useState, useEffect } from 'react';
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
  Chip,
  Box,
  Grid,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SpeedIcon from '@mui/icons-material/Speed';
import PinIcon from '@mui/icons-material/Pin';
import NumbersIcon from '@mui/icons-material/Numbers';
import BatteryStdIcon from '@mui/icons-material/BatteryStd';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import InfoIcon from '@mui/icons-material/Info';
import ShareIcon from '@mui/icons-material/Share';
import SettingsIcon from '@mui/icons-material/Settings';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PowerOffIcon from '@mui/icons-material/PowerOff';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';
import { map } from '../../map/core/MapView';
import { toMapCoordinates } from '../../map/core/mapUtil';

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  card: {
    pointerEvents: 'auto',
    width: 330,
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    background: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f4f5f8',
  },
  headerControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(1.5),
    zIndex: 1,
  },
  media: {
    height: theme.dimensions.popupImageHeight,
    position: 'relative',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  titleSection: {
    padding: theme.spacing(1, 2, 0.5, 2),
    textAlign: 'center',
  },
  content: {
    padding: 0,
    '&:last-child': {
      paddingBottom: 0,
    }
  },
  actionsWrapper: {
    padding: theme.spacing(0.5, 2, 1.5, 2),
  },
  actionsPill: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : theme.palette.background.paper,
    borderRadius: '24px',
    padding: theme.spacing(0.5),
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    [theme.breakpoints.up('md')]: {
      left: 'auto',
      right: 10,
      bottom: theme.spacing(0.5),
      transform: 'none',
    },
    [theme.breakpoints.down('md')]: {
      left: '50%',
      bottom: `calc(${theme.spacing(0.5)} + ${theme.dimensions.bottomBarHeight}px)`,
      transform: 'translateX(-50%)',
    },
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1.5),
  },
  gridItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 1.5),
    background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : theme.palette.background.paper,
    borderRadius: '12px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
    overflow: 'hidden',
  },
  gridItemFull: {
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 1.5),
    background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : theme.palette.background.paper,
    borderRadius: '12px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    flexShrink: 0,
    '& svg': {
      fontSize: '18px',
    }
  },
  itemLabel: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
    lineHeight: 1.2,
    marginBottom: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemValue: {
    fontSize: '1.1rem',
    fontWeight: 'normal',
    color: theme.palette.text.primary,
    lineHeight: 1.1,
  },
  itemUnit: {
    fontSize: '0.7rem',
    color: theme.palette.text.secondary,
    marginLeft: '2px',
    alignSelf: 'flex-end',
    lineHeight: 1.2,
  }
}));

const getIconConfigForKey = (key) => {
  switch (key) {
    case 'fixTime':
      return { icon: <AccessTimeIcon />, bg: '#ede7f6', color: '#5e35b1' }; // Purple
    case 'address':
      return { icon: <LocationOnIcon />, bg: '#e3f2fd', color: '#1e88e5' }; // Blue
    case 'speed':
      return { icon: <SpeedIcon />, bg: '#e3f2fd', color: '#1e88e5' }; // Blue
    case 'totalDistance':
      return { icon: <LinearScaleIcon />, bg: '#fff3e0', color: '#fb8c00' }; // Orange
    case 'power':
      return { icon: <BatteryStdIcon />, bg: '#e8f5e9', color: '#43a047' }; // Green
    default:
      return { icon: <InfoIcon />, bg: '#f5f5f5', color: '#757575' }; // Grey
  }
};

const formatRelativeTime = (time) => {
  const diffInSeconds = Math.floor((new Date() - new Date(time)) / 1000);
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

const CustomGridItem = ({ name, value, unit, itemKey, isFullWidth, rightAction, onIconClick }) => {
  const { classes } = useStyles({ desktopPadding: 0 });
  const iconCfg = getIconConfigForKey(itemKey);

  return (
    <Box className={isFullWidth ? classes.gridItemFull : classes.gridItem}>
      <Box
        className={classes.iconWrapper}
        style={{
          backgroundColor: iconCfg.bg,
          color: iconCfg.color,
          cursor: onIconClick ? 'pointer' : 'default',
        }}
        onClick={onIconClick}
      >
        {iconCfg.icon}
      </Box>
      <Box flex={1} minWidth={0}>
        {name && <Typography className={classes.itemLabel}>{name}</Typography>}
        <Box display="flex" flexDirection="column" alignItems="flex-start">
          <Box display="flex" flexDirection="row" alignItems="baseline">
            <Typography className={classes.itemValue}>{value}</Typography>
            {unit && <Typography className={classes.itemUnit}>{unit}</Typography>}
          </Box>
        </Box>
      </Box>
      {rightAction && <Box ml="auto">{rightAction}</Box>}
    </Box>
  );
};

const StatusCard = ({ deviceId, position, onClose, disableActions, desktopPadding = 0 }) => {
  const { classes } = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const deviceImage = device?.attributes?.deviceImage;

  let displayName = device?.name || '';
  let noCutoff = false;
  if (displayName.startsWith('*')) {
    noCutoff = true;
    displayName = displayName.substring(1).trim();
  }

  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference(
    'positionItems',
    'fixTime,address,speed,totalDistance',
  );
  const distanceUnit = useAttributePreference('distanceUnit', 'km');
  const speedUnit = useAttributePreference('speedUnit', 'kn');

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');

  const [anchorEl, setAnchorEl] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isFollowing, setIsFollowing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    let watchId;
    if (isFollowing) {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            setUserLocation([pos.coords.longitude, pos.coords.latitude]);
          },
          (err) => {
            console.error('Error getting GPS:', err);
            setIsFollowing(false);
            window.alert('No se pudo acceder a la ubicación del GPS.');
          },
          { enableHighAccuracy: true }
        );
      }
    } else {
      setUserLocation(null);
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isFollowing]);

  const lineSourceId = `follow-line-${deviceId}`;

  useEffect(() => {
    if (!map || !map.getStyle()) return;
    if (userLocation && position) {
      const start = toMapCoordinates(userLocation[0], userLocation[1]);
      const end = toMapCoordinates(position.longitude, position.latitude);

      const geojson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [start, end],
            },
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: start,
            },
          },
        ],
      };

      if (map.getSource(lineSourceId)) {
        map.getSource(lineSourceId).setData(geojson);
      } else {
        map.addSource(lineSourceId, { type: 'geojson', data: geojson });
        map.addLayer({
          id: `${lineSourceId}-layer`,
          type: 'line',
          source: lineSourceId,
          filter: ['==', '$type', 'LineString'],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#2196f3',
            'line-width': 4,
            'line-dasharray': [2, 2],
          },
        });
        map.addLayer({
          id: `${lineSourceId}-point`,
          type: 'circle',
          source: lineSourceId,
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 6,
            'circle-color': '#2196f3',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          },
        });
      }
    } else if (map.getSource(lineSourceId)) {
      map.getSource(lineSourceId).setData({ type: 'FeatureCollection', features: [] });
    }
  }, [userLocation, position, lineSourceId]);

  useEffect(() => {
    return () => {
      if (map && map.getStyle()) {
        if (map.getLayer(`${lineSourceId}-layer`)) map.removeLayer(`${lineSourceId}-layer`);
        if (map.getLayer(`${lineSourceId}-point`)) map.removeLayer(`${lineSourceId}-point`);
        if (map.getSource(lineSourceId)) map.removeSource(lineSourceId);
      }
    };
  }, [lineSourceId]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

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

  const isOnline = device?.status === 'online';
  const vehicleModel = device?.model || device?.attributes?.vehicleModel || device?.attributes?.model;

  const renderItem = (key) => {
    if (!position) return null;
    let name = positionAttributes[key]?.name || key;
    let value = null;
    let unit = null;
    let rightAction = null;
    let onIconClick = null;

    if (key === 'fixTime') {
      name = 'Last Update';
      value = formatRelativeTime(position.fixTime);
    } else if (key === 'totalDistance') {
      name = 'Odometer';
      let dist = position.attributes.totalDistance || 0;
      let val = dist * 0.001;
      if (distanceUnit === 'mi') val = dist * 0.000621371;

      value = new Intl.NumberFormat().format(Math.round(val));
      unit = distanceUnit === 'mi' ? 'mi' : 'km';

      if (!deviceReadonly) {
        onIconClick = () => navigate(`/settings/accumulators/${position.deviceId}`);
      }
    } else if (key === 'power') {
      name = 'Power';
      value = position.attributes.power || 0;
      unit = 'V';
    } else if (key === 'speed') {
      name = 'Speed';
      let speedValue = position.speed || 0; // knots
      let formattedSpeed = speedValue * 1.852; // kmh
      if (speedUnit === 'mih') formattedSpeed = speedValue * 1.15078;

      value = Math.round(formattedSpeed);
      unit = speedUnit === 'mih' ? 'mph' : 'km/h';
    } else if (key === 'address') {
      name = 'Address';
      value = <PositionValue position={position} property="address" />;
      rightAction = (
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: '#9e9e9e' }}>
          <ChevronRightIcon />
        </IconButton>
      );
    } else {
      value = (
        <PositionValue
          position={position}
          property={position.hasOwnProperty(key) ? key : null}
          attribute={position.hasOwnProperty(key) ? null : key}
        />
      );
    }

    return { name, value, unit, rightAction, onIconClick, itemKey: key };
  };

  const getAvailableItems = () => {
    if (!position) return [];
    let keys = positionItems.split(',').filter(
      (key) => position.hasOwnProperty(key) || position.attributes?.hasOwnProperty(key)
    );
    keys = keys.filter(k => k !== 'batteryLevel' && k !== 'battery');
    if (!keys.includes('power') && position.attributes?.hasOwnProperty('power')) {
      keys.push('power');
    }
    return keys.map(k => renderItem(k)).filter(Boolean);
  };

  const items = getAvailableItems();
  const addressItem = items.find(i => i.itemKey === 'address');
  const fixTimeItem = items.find(i => i.itemKey === 'fixTime');
  const powerItem = items.find(i => i.itemKey === 'power');
  const speedItem = items.find(i => i.itemKey === 'speed');
  const odoItem = items.find(i => i.itemKey === 'totalDistance');

  const placedKeys = ['address', 'fixTime', 'power', 'speed', 'totalDistance'];
  const otherItems = items.filter(i => !placedKeys.includes(i.itemKey));

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
            <Card elevation={0} className={classes.card}>
              {deviceImage ? (
                <CardMedia
                  className="draggable-header"
                  classes={{ root: classes.media }}
                  image={`/api/media/${device.uniqueId}/${deviceImage}`}
                >
                  <div className={classes.headerControls}>
                    <Chip
                      icon={<FiberManualRecordIcon style={{ fontSize: 12, color: isOnline ? '#388e3c' : '#d32f2f' }} />}
                      label={isOnline ? 'Online' : 'Offline'}
                      size="small"
                      sx={{
                        backgroundColor: isOnline ? '#e8f5e9' : '#ffebee',
                        color: isOnline ? '#388e3c' : '#d32f2f',
                        fontWeight: 600,
                        borderRadius: '16px',
                        padding: '0 4px',
                      }}
                    />
                    <IconButton size="small" sx={{ backgroundColor: 'white', color: 'black', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', '&:hover': { backgroundColor: '#f5f5f5' } }} onClick={onClose} onTouchStart={onClose}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </div>
                </CardMedia>
              ) : (
                <div className="draggable-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'transparent' }}>
                  <Chip
                    icon={<FiberManualRecordIcon style={{ fontSize: 12, color: isOnline ? '#388e3c' : '#d32f2f' }} />}
                    label={isOnline ? 'Online' : 'Offline'}
                    size="small"
                    sx={{
                      backgroundColor: isOnline ? '#e8f5e9' : '#ffebee',
                      color: isOnline ? '#388e3c' : '#d32f2f',
                      fontWeight: 600,
                      borderRadius: '16px',
                      padding: '0 4px',
                    }}
                  />
                  <IconButton size="small" sx={{ backgroundColor: 'white', color: 'black', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} onClick={onClose} onTouchStart={onClose}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>
              )}

              <div className={classes.titleSection} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Typography variant="h6" fontWeight={700} style={{ letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}
                  {vehicleModel && (
                    <Typography component="span" variant="body2" color="textSecondary" fontWeight={500} style={{ marginLeft: '6px' }}>
                      {vehicleModel}
                    </Typography>
                  )}
                </Typography>
                {noCutoff && (
                  <Tooltip title="No Cutoff">
                    <PowerOffIcon style={{ fontSize: '1.2rem', color: '#9e9e9e', flexShrink: 0 }} />
                  </Tooltip>
                )}
              </div>

              {position && (
                <CardContent className={classes.content}>
                  <Box className={classes.gridContainer}>
                    {speedItem && <CustomGridItem {...speedItem} />}
                    {odoItem && <CustomGridItem {...odoItem} />}

                    {fixTimeItem && <CustomGridItem {...fixTimeItem} />}
                    {powerItem && <CustomGridItem {...powerItem} />}

                    {otherItems.map((item, index) => (
                      <CustomGridItem key={item.itemKey} {...item} />
                    ))}

                    {addressItem && <CustomGridItem {...addressItem} isFullWidth />}
                  </Box>

                  <Box className={classes.actionsWrapper}>
                    <Box className={classes.actionsPill}>
                      <Tooltip title={"Trazar mi ubicación"}>
                        <IconButton
                          onClick={() => setIsFollowing(!isFollowing)}
                          disabled={disableActions || !position}
                          sx={{ color: isFollowing ? '#2196f3' : '#5f6368' }}
                        >
                          <MyLocationIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('reportReplay')}>
                        <IconButton
                          onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
                          disabled={disableActions || !position}
                          sx={{ color: '#5f6368' }}
                        >
                          <RouteIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('commandTitle')}>
                        <IconButton
                          onClick={() => navigate(`/settings/device/${deviceId}/command`)}
                          disabled={disableActions}
                          sx={{ color: '#5f6368' }}
                        >
                          <SendIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('sharedEdit')}>
                        <IconButton
                          onClick={() => navigate(`/settings/device/${deviceId}`)}
                          disabled={disableActions || deviceReadonly}
                          sx={{ color: '#5f6368' }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {!shareDisabled && !user.temporary && (
                        <Tooltip title={t('sharedShare')}>
                          <IconButton
                            onClick={() => navigate(`/settings/device/${deviceId}/share`)}
                            disabled={disableActions}
                            sx={{ color: '#5f6368' }}
                          >
                            <ShareIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              )}
            </Card>
          </Rnd>
        )}
      </div>
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
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
        </Menu>
      )}
      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
    </>
  );
};

export default StatusCard;

