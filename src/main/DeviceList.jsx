import { useEffect, useReducer, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { List } from 'react-window';
import { Typography, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import { devicesActions } from '../store';
import { useAsyncTask } from '../reactHelper';
import DeviceRow from './DeviceRow';
import fetchOrThrow from '../common/util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  list: {
    height: '100%',
    direction: theme.direction,
    backgroundColor: theme.palette.mode === 'dark' ? '#121212' : '#f4f5f8',
  },
  groupRow: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1.5),
    backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
    borderRadius: '12px',
    margin: theme.spacing(1.5, 1.5, 0.5, 1.5),
    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
    boxSizing: 'border-box',
    cursor: 'pointer',
    userSelect: 'none',
    height: '56px',
  },
  groupIcon: {
    marginRight: theme.spacing(1),
    color: '#2196f3',
  },
  groupTitle: {
    flexGrow: 1,
    fontWeight: 600,
    fontSize: '0.9rem',
    color: theme.palette.text.primary,
  },
  groupCount: {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    marginRight: theme.spacing(1),
  }
}));

const DeviceList = ({ devices, keyword }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();

  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const interval = setInterval(forceUpdate, 60000);
    return () => clearInterval(interval);
  }, []);

  useAsyncTask(
    async ({ signal }) => {
      const response = await fetchOrThrow('/api/devices', { signal });
      dispatch(devicesActions.refresh(await response.json()));
    },
    [dispatch],
  );

  const groups = useSelector(state => state.groups.items);
  const allDevices = useSelector(state => state.devices.items) || {};
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  useEffect(() => {
    if (keyword && keyword.trim().length > 0) {
      setCollapsedGroups(new Set()); // Open all groups on search
    }
  }, [keyword]);

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const flattenedData = useMemo(() => {
    const grouped = {};
    const unassigned = [];

    Object.keys(groups || {}).forEach(id => {
      grouped[id] = [];
    });

    (devices || []).forEach(device => {
      if (device.groupId && grouped[device.groupId]) {
        grouped[device.groupId].push(device);
      } else {
        unassigned.push(device);
      }
    });

    const flat = [];
    const addGroup = (groupId, name, items) => {
      if (items.length === 0) return;
      const isCollapsed = collapsedGroups.has(groupId);

      let totalCount = 0;
      if (groupId === 'unassigned') {
        totalCount = Object.values(allDevices).filter(d => !d.groupId).length;
      } else {
        totalCount = Object.values(allDevices).filter(d => d.groupId === groupId).length;
      }

      flat.push({
        type: 'group',
        id: groupId,
        name,
        count: items.length,
        totalCount: totalCount,
        isCollapsed
      });
      if (!isCollapsed) {
        items.forEach(device => {
          flat.push({ type: 'device', device });
        });
      }
    };

    Object.values(groups || {}).forEach(group => {
      addGroup(group.id, group.name, grouped[group.id]);
    });

    if (unassigned.length > 0) {
      addGroup('unassigned', 'Unassigned', unassigned);
    }

    return flat;
  }, [devices, groups, collapsedGroups]);

  const RowComponent = ({ index, style }) => {
    const item = flattenedData[index];

    if (item.type === 'group') {
      return (
        <div style={style}>
          <Box className={classes.groupRow} onClick={() => toggleGroup(item.id)}>
            <FolderIcon className={classes.groupIcon} fontSize="small" />
            <Typography className={classes.groupTitle}>{item.name}</Typography>
            <Typography className={classes.groupCount}>{item.count} / {item.totalCount}</Typography>
            {item.isCollapsed ? (
              <ChevronRightIcon fontSize="small" sx={{ color: '#9e9e9e' }} />
            ) : (
              <ExpandMoreIcon fontSize="small" sx={{ color: '#9e9e9e' }} />
            )}
          </Box>
        </div>
      );
    }

    const mockDevices = [];
    mockDevices[index] = item.device;
    return <DeviceRow devices={mockDevices} index={index} style={style} />;
  };

  return (
    <List
      className={classes.list}
      rowCount={flattenedData.length}
      rowHeight={68}
      rowComponent={RowComponent}
      rowProps={{}}
      overscanCount={5}
    />
  );
};

export default DeviceList;
