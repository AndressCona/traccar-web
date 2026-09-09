import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  Toolbar,
  IconButton,
  OutlinedInput,
  Popover,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import MapIcon from '@mui/icons-material/Map';
import DnsIcon from '@mui/icons-material/Dns';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useDeviceReadonly } from '../common/util/permissions';
import { getStatusColor } from '../common/util/formatter';
import DeviceRow from './DeviceRow';
import DevicePage from '../settings/DevicePage';

const useStyles = makeStyles()((theme) => ({
  toolbar: {
    display: 'flex',
    gap: theme.spacing(1),
  },
  toggleButton: {
    backgroundColor: theme.palette.action.hover,
    borderRadius: theme.spacing(1.5),
  },
  search: {
    borderRadius: theme.spacing(3),
    backgroundColor: theme.palette.action.hover,
    '& fieldset': {
      border: 'none',
    },
  },
  filterPanel: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
    width: theme.dimensions.drawerWidthTablet,
  },
  statusOption: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  statusDot: {
    flex: 'none',
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: 'currentColor',
  },
}));

const MainToolbar = ({
  filteredDevices,
  devicesOpen,
  setDevicesOpen,
  keyword,
  setKeyword,
  filter,
  setFilter,
  filterSort,
  setFilterSort,
}) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const t = useTranslation();

  const deviceReadonly = useDeviceReadonly();

  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);
  const devicesLoaded = useSelector((state) => state.devices.loaded);
  const geofences = useSelector((state) => state.geofences.items);

  const toolbarRef = useRef();
  const inputRef = useRef();
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [devicesAnchorEl, setDevicesAnchorEl] = useState(null);
  const [addDialog, setAddDialog] = useState(false);

  const deviceStatusCount = (status) =>
    Object.values(devices).filter((d) => d.status === status).length;

  return (
    <>
      <Toolbar ref={toolbarRef} className={classes.toolbar}>
        <IconButton
          edge="start"
          className={classes.toggleButton}
          onClick={() => setDevicesOpen(!devicesOpen)}
        >
          {devicesOpen ? <MapIcon /> : <DnsIcon />}
        </IconButton>
        <OutlinedInput
          ref={inputRef}
          className={classes.search}
          placeholder={t('sharedSearchDevices')}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => setDevicesAnchorEl(toolbarRef.current)}
          onBlur={() => setDevicesAnchorEl(null)}
          size="small"
          fullWidth
        />
        <Popover
          open={!!devicesAnchorEl && !devicesOpen}
          anchorEl={devicesAnchorEl}
          onClose={() => setDevicesAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: Number(theme.spacing(2).slice(0, -2)),
          }}
          marginThreshold={0}
          slotProps={{
            paper: {
              style: {
                width: `calc(${toolbarRef.current?.clientWidth}px - ${theme.spacing(4)})`,
                borderRadius: theme.spacing(2),
              },
            },
          }}
          elevation={4}
          disableAutoFocus
          disableEnforceFocus
        >
          {filteredDevices.slice(0, 3).map((_, index) => (
            <DeviceRow key={filteredDevices[index].id} devices={filteredDevices} index={index} />
          ))}
          {filteredDevices.length > 3 && (
            <ListItemButton alignItems="center" onClick={() => setDevicesOpen(true)}>
              <ListItemText primary={t('notificationAlways')} style={{ textAlign: 'center' }} />
            </ListItemButton>
          )}
        </Popover>
        <Popover
          open={!!filterAnchorEl}
          anchorEl={filterAnchorEl}
          onClose={() => setFilterAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          slotProps={{
            paper: {
              style: { borderRadius: theme.spacing(2) },
            },
          }}
          elevation={4}
        >
          <div className={classes.filterPanel}>
            <FormControl>
              <InputLabel>{t('deviceStatus')}</InputLabel>
              <Select
                label={t('deviceStatus')}
                value={filter.statuses}
                onChange={(e) => setFilter({ ...filter, statuses: e.target.value })}
                multiple
              >
                {['online', 'offline', 'unknown'].map((status) => (
                  <MenuItem key={status} value={status}>
                    <span className={classes.statusOption}>
                      <span
                        className={classes.statusDot}
                        style={{ color: theme.palette[getStatusColor(status)].main }}
                      />
                      {`${t(`deviceStatus${status.charAt(0).toUpperCase()}${status.slice(1)}`)} (${deviceStatusCount(status)})`}
                    </span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>{t('settingsGroups')}</InputLabel>
              <Select
                label={t('settingsGroups')}
                value={filter.groups}
                onChange={(e) => setFilter({ ...filter, groups: e.target.value })}
                multiple
              >
                {Object.values(groups)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>{t('sharedGeofences')}</InputLabel>
              <Select
                label={t('sharedGeofences')}
                value={filter.geofences}
                onChange={(e) => setFilter({ ...filter, geofences: e.target.value })}
                multiple
              >
                {Object.values(geofences)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((geofence) => (
                    <MenuItem key={geofence.id} value={geofence.id}>
                      {geofence.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>{t('sharedSortBy')}</InputLabel>
              <Select
                label={t('sharedSortBy')}
                value={filterSort}
                onChange={(e) => setFilterSort(e.target.value)}
              >
                <MenuItem value="">{'\u00a0'}</MenuItem>
                <MenuItem value="name">{t('sharedName')}</MenuItem>
                <MenuItem value="lastUpdate">{t('deviceLastUpdate')}</MenuItem>
              </Select>
            </FormControl>
          </div>
        </Popover>
        <IconButton edge="end" onClick={() => setAddDialog(true)} disabled={deviceReadonly}>
          <Tooltip
            open={!deviceReadonly && devicesLoaded && Object.keys(devices).length === 0}
            title={t('deviceRegisterFirst')}
            arrow
          >
            <AddIcon />
          </Tooltip>
        </IconButton>
      </Toolbar>
      {addDialog && <DevicePage isDialog onClose={() => setAddDialog(false)} />}
    </>
  );
};

export default MainToolbar;
