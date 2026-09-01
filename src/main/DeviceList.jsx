import { useEffect, useMemo, useReducer } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import { List } from 'react-window';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LayersIcon from '@mui/icons-material/Layers';
import { devicesActions } from '../store';
import { useAsyncTask } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import { getStatusColor } from '../common/util/formatter';
import DeviceRow from './DeviceRow';
import fetchOrThrow from '../common/util/fetchOrThrow';

const NO_GROUP = 0;
const GROUP_ROW_HEIGHT = 40;
const DEVICE_ROW_HEIGHT = 72;

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  listWrapper: {
    flex: 1,
    minHeight: 0,
  },
  tabs: {
    display: 'flex',
    gap: theme.spacing(0.5),
    padding: theme.spacing(1.5, 2, 1),
    flex: 'none',
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: theme.spacing(0.75, 0.5),
    borderRadius: theme.spacing(1.5),
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    font: 'inherit',
    color: theme.palette.text.secondary,
  },
  tabActive: {
    backgroundColor: theme.palette.action.selected,
    borderColor: theme.palette.divider,
  },
  tabCount: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  tabLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
  },
  tools: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(0, 2, 1.5),
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    fontWeight: 600,
    flex: 'none',
  },
  expandButton: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    font: 'inherit',
    color: theme.palette.text.secondary,
    padding: 0,
  },
  list: {
    height: '100%',
    direction: theme.direction,
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.palette.mode === 'dark' ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.25)'} transparent`,
    '&::-webkit-scrollbar': {
      width: 8,
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.25)',
      borderRadius: 8,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.4)',
    },
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    width: '100%',
    height: '100%',
    padding: theme.spacing(0, 2),
    border: 'none',
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.action.hover,
    cursor: 'pointer',
    font: 'inherit',
    color: 'inherit',
    textAlign: 'left',
  },
  chevron: {
    display: 'flex',
    color: theme.palette.text.secondary,
  },
  groupName: {
    flex: 1,
    fontWeight: 600,
    fontSize: '0.8125rem',
  },
  groupCount: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    fontWeight: 600,
  },
}));

const ListRow = ({ index, style, rows, onToggleGroup }) => {
  const { classes } = useStyles();
  const row = rows[index];
  if (row.type === 'group') {
    return (
      <div style={style}>
        <button type="button" className={classes.groupHeader} onClick={() => onToggleGroup(row.id)}>
          <span className={classes.chevron}>
            {row.expanded ? (
              <ExpandMoreIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </span>
          <span className={classes.groupName}>{row.name}</span>
          <span className={classes.groupCount}>{row.count}</span>
        </button>
      </div>
    );
  }
  return <DeviceRow devices={row.devices} index={row.deviceIndex} style={style} />;
};

const DeviceList = ({
  devices,
  collapsedGroups,
  setCollapsedGroups,
  filter,
  setFilter,
  keyword,
}) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const t = useTranslation();

  const groups = useSelector((state) => state.groups.items);
  const allDevices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);

  const onToggleGroup = (groupId) =>
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

  const deviceStatusCount = (status) =>
    Object.values(allDevices).filter((d) => d.status === status).length;
  const alarmCount = Object.values(allDevices).filter((d) =>
    positions[d.id]?.attributes?.hasOwnProperty('alarm'),
  ).length;
  const drivingCount = Object.values(allDevices).filter((d) =>
    d.status === 'online' && positions[d.id]?.attributes?.ignition === true
  ).length;
  const stoppedCount = Object.values(allDevices).filter((d) =>
    d.status === 'online' && positions[d.id]?.attributes?.ignition === false
  ).length;

  const activeTab = (() => {
    if (filter.alarm) return 'alarm';
    if (filter.driving) return 'driving';
    if (filter.stopped) return 'stopped';
    if (filter.statuses.length === 1 && filter.statuses[0] === 'offline') return 'offline';
    return 'all';
  })();

  const selectTab = (tab) => {
    dispatch(devicesActions.selectId(null));
    switch (tab) {
      case 'driving':
        setFilter({ ...filter, statuses: [], alarm: false, driving: true, stopped: false });
        break;
      case 'stopped':
        setFilter({ ...filter, statuses: [], alarm: false, driving: false, stopped: true });
        break;
      case 'offline':
        setFilter({ ...filter, statuses: ['offline'], alarm: false, driving: false, stopped: false });
        break;
      case 'alarm':
        setFilter({ ...filter, statuses: [], alarm: true, driving: false, stopped: false });
        break;
      default:
        setFilter({ ...filter, statuses: [], alarm: false, driving: false, stopped: false });
        break;
    }
  };

  const visibleGroupIds = [...new Set(devices.map((device) => device.groupId || 0))];
  const allGroupsExpanded = visibleGroupIds.every((id) => !collapsedGroups[id]);
  const toggleAllGroups = () => {
    setCollapsedGroups((prev) => {
      const next = { ...prev };
      visibleGroupIds.forEach((id) => {
        if (allGroupsExpanded) {
          next[id] = true;
        } else {
          delete next[id];
        }
      });
      return next;
    });
  };

  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const interval = setInterval(forceUpdate, 60000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!keyword) {
      return;
    }
    const groupIdsInView = new Set(devices.map((device) => device.groupId || NO_GROUP));
    setCollapsedGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      groupIdsInView.forEach((id) => {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [keyword, devices, setCollapsedGroups]);

  useAsyncTask(
    async ({ signal }) => {
      const response = await fetchOrThrow('/api/devices', { signal });
      dispatch(devicesActions.refresh(await response.json()));
    },
    [dispatch],
  );

  const rows = useMemo(() => {
    const buckets = new Map();
    devices.forEach((device) => {
      const groupId = device.groupId || NO_GROUP;
      if (!buckets.has(groupId)) {
        buckets.set(groupId, []);
      }
      buckets.get(groupId).push(device);
    });

    const groupIds = [...buckets.keys()].sort((a, b) => {
      if (a === NO_GROUP) return 1;
      if (b === NO_GROUP) return -1;
      return (groups[a]?.name || '').localeCompare(groups[b]?.name || '');
    });

    return groupIds.flatMap((groupId) => {
      const groupDevices = buckets.get(groupId);
      const expanded = !collapsedGroups[groupId];
      const header = {
        type: 'group',
        id: groupId,
        name: groupId === NO_GROUP ? t('groupNoGroup') : groups[groupId]?.name || t('groupNoGroup'),
        count: groupDevices.length,
        expanded,
      };
      if (!expanded) {
        return [header];
      }
      return [
        header,
        ...groupDevices.map((device, deviceIndex) => ({
          type: 'device',
          devices: groupDevices,
          deviceIndex,
          key: device.id,
        })),
      ];
    });
  }, [devices, groups, collapsedGroups, t]);

  return (
    <div className={classes.root}>
      <div className={classes.tabs}>
        {[
          ['all', 'All', Object.keys(allDevices).length],
          ['driving', 'Driving', drivingCount],
          ['stopped', 'Stopped', stoppedCount],
          ['offline', t('deviceStatusOffline'), deviceStatusCount('offline')],
          ['alarm', t('eventAlarm'), alarmCount],
        ].map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            className={`${classes.tab} ${activeTab === key ? classes.tabActive : ''}`}
            onClick={() => selectTab(key)}
          >
            <span
              className={classes.tabCount}
              style={{
                color: (() => {
                  if (key === 'all') return undefined;
                  if (key === 'alarm') return theme.palette.error.main;
                  if (key === 'driving') return theme.palette.success.main;
                  if (key === 'stopped') return theme.palette.neutral.main;
                  return theme.palette[getStatusColor(key)]?.main;
                })(),
              }}
            >
              {count}
            </span>
            <span className={classes.tabLabel}>{label}</span>
          </button>
        ))}
      </div>
      <div className={classes.tools}>
        <span>{`${devices.length} ${t('deviceTitle').toLowerCase()}`}</span>
        <button type="button" className={classes.expandButton} onClick={toggleAllGroups}>
          <LayersIcon fontSize="inherit" />
          {allGroupsExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <div className={classes.listWrapper}>
        <List
          className={classes.list}
          rowComponent={ListRow}
          rowCount={rows.length}
          rowHeight={(index) =>
            rows[index]?.type === 'group' ? GROUP_ROW_HEIGHT : DEVICE_ROW_HEIGHT
          }
          rowProps={{ rows, onToggleGroup }}
          overscanCount={5}
        />
      </div>
    </div>
  );
};

export default DeviceList;
