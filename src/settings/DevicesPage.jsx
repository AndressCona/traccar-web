import { useCallback, useReducer, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Button,
  FormControlLabel,
  Switch,
  Menu,
  MenuItem,
  IconButton,
  Typography,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useTheme } from '@mui/material/styles';
import { useAsyncTask, useScrollToLoad, pageSize } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionFab from './components/CollectionFab';
import CollectionActions from './components/CollectionActions';
import TableShimmer from '../common/components/TableShimmer';
import SearchHeader from './components/SearchHeader';
import { formatAddress, formatStatus, formatTime } from '../common/util/formatter';
import { useDeviceReadonly, useManager } from '../common/util/permissions';
import { usePreference } from '../common/util/preferences';
import useSettingsStyles from './common/useSettingsStyles';
import DeviceUsersValue from './components/DeviceUsersValue';
import usePersistedState from '../common/util/usePersistedState';
import fetchOrThrow from '../common/util/fetchOrThrow';
import AddressValue from '../common/components/AddressValue';
import exportExcel from '../common/util/exportExcel';

const DevicesPage = () => {
  const { classes } = useSettingsStyles();
  const theme = useTheme();
  const navigate = useNavigate();
  const t = useTranslation();

  const groups = useSelector((state) => state.groups.items);

  const manager = useManager();
  const deviceReadonly = useDeviceReadonly();
  const coordinateFormat = usePreference('coordinateFormat');

  const positions = useSelector((state) => state.session.positions);

  const [reloadKey, reload] = useReducer((k) => k + 1, 0);
  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAll, setShowAll] = usePersistedState('showAllDevices', false);
  const [hasMore, setHasMore] = useState(true);

  const [filterGroup, setFilterGroup] = useState('');
  const [groupAnchorEl, setGroupAnchorEl] = useState(null);

  const handleGroupClick = (event) => {
    setGroupAnchorEl(event.currentTarget);
  };

  const handleGroupClose = () => {
    setGroupAnchorEl(null);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchGroup = !filterGroup || item.groupId === Number(filterGroup);
      return matchGroup;
    });
  }, [items, filterGroup]);

  const loadItems = useCallback(
    async (offset, signal) => {
      const query = new URLSearchParams({ all: showAll, limit: pageSize, offset });
      if (searchKeyword) {
        query.append('keyword', searchKeyword);
      }
      const response = await fetchOrThrow(`/api/devices?${query.toString()}`, { signal });
      const data = await response.json();
      setItems((previous) => (offset ? [...previous, ...data] : data));
      setHasMore(data.length >= pageSize);
    },
    [searchKeyword, showAll],
  );

  const sentinelRef = useScrollToLoad(() => loadItems(items.length));

  useAsyncTask(
    async ({ signal }) => {
      void reloadKey;
      setItems([]);
      await loadItems(0, signal);
    },
    [reloadKey, loadItems],
  );

  const handleExport = async () => {
    const data = items.map((item) => ({
      [t('sharedName')]: item.name,
      [t('deviceIdentifier')]: item.uniqueId,
      [t('groupParent')]: item.groupId ? groups[item.groupId]?.name : null,
      [t('deviceModel')]: item.model,
      [t('deviceStatus')]: formatStatus(item.status, t),
      [t('deviceLastUpdate')]: formatTime(item.lastUpdate, 'minutes'),
      [t('positionAddress')]: positions[item.id]
        ? formatAddress(positions[item.id], coordinateFormat)
        : '',
    }));
    const sheets = new Map();
    sheets.set(t('deviceTitle'), data);
    await exportExcel(t('deviceTitle'), 'devices.xlsx', sheets, theme);
  };

  const actionConnections = {
    key: 'connections',
    title: t('sharedConnections'),
    icon: <LinkIcon fontSize="small" />,
    handler: (deviceId) => navigate(`/settings/device/${deviceId}/connections`),
  };

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'deviceTitle']}>
      <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 16px 16px' }}>
        <Button onClick={handleExport} variant="contained" color="primary">
          {t('reportExport')}
        </Button>
        <Typography variant="body1" color="textSecondary" style={{ fontWeight: 'bold' }}>
          {filterGroup ? `Total: ${filteredItems.length} / ${items.length}` : `Total: ${items.length}`}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              size="small"
            />
          }
          label={t('notificationAlways')}
          labelPlacement="start"
          disabled={!manager}
        />
      </div>
      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell>{t('sharedName')}</TableCell>
            <TableCell>{t('deviceIdentifier')}</TableCell>
            <TableCell>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {t('groupParent')}
                <IconButton size="small" onClick={handleGroupClick}>
                  <ArrowDropDownIcon />
                </IconButton>
                <Menu
                  anchorEl={groupAnchorEl}
                  open={Boolean(groupAnchorEl)}
                  onClose={handleGroupClose}
                >
                  <MenuItem
                    onClick={() => {
                      setFilterGroup('');
                      handleGroupClose();
                    }}
                    selected={filterGroup === ''}
                  >
                    {t('notificationAlways')}
                  </MenuItem>
                  {Object.values(groups).map((group) => (
                    <MenuItem
                      key={group.id}
                      onClick={() => {
                        setFilterGroup(group.id);
                        handleGroupClose();
                      }}
                      selected={filterGroup === group.id}
                    >
                      {group.name}
                    </MenuItem>
                  ))}
                </Menu>
              </div>
            </TableCell>
            <TableCell>{t('deviceModel')}</TableCell>
            <TableCell>{t('positionAddress')}</TableCell>
            {manager && <TableCell>{t('settingsUsers')}</TableCell>}
            <TableCell className={classes.columnAction} />
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.uniqueId}</TableCell>
              <TableCell>{item.groupId ? groups[item.groupId]?.name : null}</TableCell>
              <TableCell>{item.model}</TableCell>
              <TableCell>
                {positions[item.id] && (
                  <AddressValue
                    latitude={positions[item.id].latitude}
                    longitude={positions[item.id].longitude}
                    originalAddress={positions[item.id]?.address}
                  />
                )}
              </TableCell>
              {manager && (
                <TableCell>
                  <DeviceUsersValue deviceId={item.id} />
                </TableCell>
              )}
              <TableCell className={classes.columnAction} padding="none">
                <CollectionActions
                  itemId={item.id}
                  editPath="/settings/device"
                  endpoint="devices"
                  onReload={reload}
                  customActions={[actionConnections]}
                  readonly={deviceReadonly}
                />
              </TableCell>
            </TableRow>
          ))}
          {hasMore && (
            <TableShimmer
              ref={items.length > 0 ? sentinelRef : null}
              columns={manager ? 6 : 5}
              endAction
            />
          )}
        </TableBody>
      </Table>
      <CollectionFab editPath="/settings/device" />
    </PageLayout>
  );
};

export default DevicesPage;
