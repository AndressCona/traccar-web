import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import {
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import Battery60Icon from '@mui/icons-material/Battery60';
import BatteryCharging60Icon from '@mui/icons-material/BatteryCharging60';
import Battery20Icon from '@mui/icons-material/Battery20';
import BatteryCharging20Icon from '@mui/icons-material/BatteryCharging20';
import ErrorIcon from '@mui/icons-material/Error';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { devicesActions } from '../store';
import {
  formatAlarm,
  formatBoolean,
  formatPercentage,
  formatStatus,
  getStatusColor,
} from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAdministrator } from '../common/util/permissions';
import EngineIcon from '../resources/images/data/engine.svg?react';
import { useAttributePreference } from '../common/util/preferences';
import GeofencesValue from '../common/components/GeofencesValue';
import DriverValue from '../common/components/DriverValue';
import MotionBar from './components/MotionBar';

dayjs.extend(relativeTime);

const useStyles = makeStyles()((theme) => ({
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 0 4px rgba(0,0,0,0.1)',
  },
  card: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    backgroundColor: theme.palette.background.paper,
    borderRadius: '12px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    padding: theme.spacing(1, 1.5),
    height: '100%',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease, background-color 0.2s ease',
    border: '1px solid transparent',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    },
  },
  selectedCard: {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    border: `1px solid ${theme.palette.primary.main}`,
  },
  timeText: {
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  success: {
    color: theme.palette.success.main,
  },
  warning: {
    color: theme.palette.warning.main,
  },
  error: {
    color: theme.palette.error.main,
  },
  neutral: {
    color: theme.palette.neutral.main,
  },
}));

const DeviceRow = ({ devices, index, style }) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const t = useTranslation();

  const admin = useAdministrator();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const item = devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);

  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const deviceSecondary = useAttributePreference('deviceSecondary', '');

  const resolveFieldValue = (field) => {
    if (field === 'geofenceIds') {
      const geofenceIds = position?.geofenceIds;
      return geofenceIds?.length ? <GeofencesValue geofenceIds={geofenceIds} /> : null;
    }
    if (field === 'driverUniqueId') {
      const driverUniqueId = position?.attributes?.driverUniqueId;
      return driverUniqueId ? <DriverValue driverUniqueId={driverUniqueId} /> : null;
    }
    if (field === 'motion') {
      return <MotionBar deviceId={item.id} />;
    }
    return item[field];
  };

  const primaryValue = resolveFieldValue(devicePrimary);
  const secondaryValue = resolveFieldValue(deviceSecondary);

  let displayTitle = primaryValue;
  let noCutoff = false;
  if (typeof displayTitle === 'string' && displayTitle.startsWith('*')) {
    noCutoff = true;
    displayTitle = displayTitle.substring(1).trim();
  }

  const statusColorKey = getStatusColor(item.status);
  const dotColor =
    statusColorKey === 'success'
      ? theme.palette.success.main
      : statusColorKey === 'error'
        ? theme.palette.error.main
        : theme.palette.neutral.main;

  let statusText;
  if (item.status === 'online' || !item.lastUpdate) {
    statusText = formatStatus(item.status, t);
  } else {
    statusText = dayjs(item.lastUpdate).fromNow();
  }

  return (
    <div style={{ ...style, boxSizing: 'border-box', padding: '3px 8px' }}>
      <div
        className={`${classes.card} ${selectedDeviceId === item.id ? classes.selectedCard : ''}`}
        onClick={() => dispatch(devicesActions.selectId(item.id))}
        style={{
          opacity: !admin && item.disabled ? 0.5 : 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          gap: '12px'
        }}
      >
        <div className={classes.dot} style={{ backgroundColor: dotColor }} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>

          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, paddingRight: '8px', minWidth: 0, overflow: 'hidden' }}>
              <Typography variant="subtitle2" fontWeight={600} color="textPrimary" noWrap style={{ lineHeight: 1.2 }}>
                {displayTitle}
              </Typography>
              {noCutoff && (
                <Tooltip title="No Cutoff">
                  <PowerOffIcon style={{ fontSize: '1rem', color: theme.palette.text.disabled, marginLeft: '6px' }} />
                </Tooltip>
              )}
            </div>
            <Typography className={`${classes.timeText} ${classes[statusColorKey]}`} noWrap style={{ lineHeight: 1.2, flexShrink: 0 }}>
              {statusText}
            </Typography>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Typography variant="body2" color="textSecondary" noWrap style={{ lineHeight: 1.2, flex: 1, paddingRight: '8px' }}>
              {secondaryValue || '\u00A0'}
            </Typography>

            {position && (
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                {position.attributes.hasOwnProperty('alarm') && (
                  <Tooltip title={`${t('eventAlarm')}: ${formatAlarm(position.attributes.alarm, t)}`}>
                    <IconButton size="small" style={{ padding: 2 }}>
                      <ErrorIcon fontSize="small" className={classes.error} />
                    </IconButton>
                  </Tooltip>
                )}
                {position.attributes.hasOwnProperty('ignition') && (
                  <Tooltip title={`${t('positionIgnition')}: ${formatBoolean(position.attributes.ignition, t)}`}>
                    <IconButton size="small" style={{ padding: 2 }}>
                      {position.attributes.ignition ? (
                        <EngineIcon width={18} height={18} className={classes.success} />
                      ) : (
                        <EngineIcon width={18} height={18} className={classes.neutral} />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
                {position.attributes.hasOwnProperty('batteryLevel') && (
                  <Tooltip title={`${t('positionBatteryLevel')}: ${formatPercentage(position.attributes.batteryLevel)}`}>
                    <IconButton size="small" style={{ padding: 2 }}>
                      {(position.attributes.batteryLevel > 70 &&
                        (position.attributes.charge ? (
                          <BatteryChargingFullIcon fontSize="small" className={classes.success} />
                        ) : (
                          <BatteryFullIcon fontSize="small" className={classes.success} />
                        ))) ||
                        (position.attributes.batteryLevel > 30 &&
                          (position.attributes.charge ? (
                            <BatteryCharging60Icon fontSize="small" className={classes.warning} />
                          ) : (
                            <Battery60Icon fontSize="small" className={classes.warning} />
                          ))) ||
                        (position.attributes.charge ? (
                          <BatteryCharging20Icon fontSize="small" className={classes.error} />
                        ) : (
                          <Battery20Icon fontSize="small" className={classes.error} />
                        ))}
                    </IconButton>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceRow;
