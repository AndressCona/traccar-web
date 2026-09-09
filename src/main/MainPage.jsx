import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Paper } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import DeviceList from './DeviceList';
import BottomMenu from '../common/components/BottomMenu';
import StatusCard from '../common/components/StatusCard';
import { devicesActions } from '../store';
import usePersistedState from '../common/util/usePersistedState';
import EventsDrawer from './EventsDrawer';
import useFilter from './useFilter';
import MainToolbar from './MainToolbar';
import { useAttributePreference } from '../common/util/preferences';
import { usePrevious } from '../reactHelper';
import { map } from '../map/core/MapView';
import * as maplibregl from 'maplibre-gl';
import { toMapCoordinates } from '../map/core/mapUtil';

const MainMap = lazy(() => import('./MainMap'));

const useStyles = makeStyles()((theme, { devicesOpen }) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('md')]: {
      position: 'fixed',
      left: 0,
      top: 0,
      height: `calc(100% - ${theme.spacing(3)})`,
      width: theme.dimensions.drawerWidthDesktop,
      margin: theme.spacing(1.5),
      zIndex: 3,
      ...(devicesOpen && {
        borderRadius: theme.spacing(2),
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,.35)',
      }),
    },
    [theme.breakpoints.down('md')]: {
      height: '100%',
      width: '100%',
    },
  },
  header: {
    pointerEvents: 'auto',
    zIndex: 6,
    [theme.breakpoints.up('md')]: devicesOpen
      ? { borderRadius: 0 }
      : {
          borderRadius: theme.spacing(2),
          overflow: 'hidden',
          boxShadow: '0 14px 34px rgba(0,0,0,.3)',
        },
  },
  footer: {
    pointerEvents: 'auto',
    zIndex: 5,
    [theme.breakpoints.up('md')]: devicesOpen
      ? { borderRadius: 0 }
      : {
          borderRadius: theme.spacing(2),
          overflow: 'hidden',
          boxShadow: '0 14px 34px rgba(0,0,0,.3)',
        },
  },
  middle: {
    flex: 1,
    display: 'grid',
    minHeight: 0,
  },
  contentMap: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
  },
  contentList: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
    zIndex: 4,
    display: 'flex',
    minHeight: 0,
    [theme.breakpoints.up('md')]: {
      borderRadius: 0,
    },
  },
}));

const MainPage = () => {
  const dispatch = useDispatch();
  const theme = useTheme();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const mapOnSelect = useAttributePreference('mapOnSelect', true);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const selectedPosition = filteredPositions.find(
    (position) => selectedDeviceId && position.deviceId === selectedDeviceId,
  );

  const [filteredDevices, setFilteredDevices] = useState([]);

  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = usePersistedState('deviceFilter', {
    statuses: [],
    groups: [],
    geofences: [],
    alarm: false,
    driving: false,
    stopped: false,
  });
  const [filterSort, setFilterSort] = usePersistedState('filterSort', '');

  const [devicesOpen, setDevicesOpen] = useState(desktop);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventsFilterId, setEventsFilterId] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const { classes } = useStyles({ devicesOpen });

  const onEventsClick = useCallback(() => {
    setEventsFilterId(null);
    setEventsOpen(true);
  }, [setEventsOpen]);

  const onDeviceEventsClick = useCallback(() => {
    setEventsFilterId(selectedDeviceId);
    setEventsOpen(true);
  }, [selectedDeviceId, setEventsOpen]);

  useEffect(() => {
    if (!desktop && mapOnSelect && selectedDeviceId) {
      setDevicesOpen(false);
    }
  }, [desktop, mapOnSelect, selectedDeviceId]);

  useFilter(
    keyword,
    filter,
    filterSort,
    true, // Always filter the map
    positions,
    setFilteredDevices,
    setFilteredPositions,
  );

  const previousFilter = usePrevious(filter);
  const fitBoundsRef = useRef(false);

  useEffect(() => {
    if (previousFilter && JSON.stringify(previousFilter) !== JSON.stringify(filter)) {
      fitBoundsRef.current = true;
    }
  }, [filter, previousFilter]);

  useEffect(() => {
    if (fitBoundsRef.current) {
      if (filteredPositions.length > 0) {
        const coordinates = filteredPositions
          .map((item) => toMapCoordinates(item.longitude, item.latitude))
          .filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude));
        
        if (map && map.getCanvas) {
          const canvas = map.getCanvas();
          if (coordinates.length > 1) {
            const bounds = coordinates.reduce(
              (bounds, item) => bounds.extend(item),
              new maplibregl.LngLatBounds(coordinates[0], coordinates[1])
            );
            const degenerate = bounds.getNorth() === bounds.getSouth() && bounds.getEast() === bounds.getWest();
            if (!degenerate && canvas && canvas.width > 0 && canvas.height > 0) {
              map.fitBounds(bounds, {
                duration: 500,
                padding: Math.min(canvas.width, canvas.height) * 0.1,
              });
            }
          } else if (coordinates.length === 1) {
            map.flyTo({
              center: coordinates[0],
              zoom: Math.max(map.getZoom(), 10),
              duration: 500,
            });
          }
        }
      }
      fitBoundsRef.current = false;
    }
  }, [filteredPositions]);

  return (
    <div className={classes.root}>
      {desktop && (
        <Suspense fallback={null}>
          <MainMap
            filteredPositions={filteredPositions}
            selectedPosition={selectedPosition}
            onEventsClick={onEventsClick}
          />
        </Suspense>
      )}
      <div className={classes.sidebar}>
        <Paper elevation={3} className={classes.header}>
          <MainToolbar
            filteredDevices={filteredDevices}
            devicesOpen={devicesOpen}
            setDevicesOpen={setDevicesOpen}
            keyword={keyword}
            setKeyword={setKeyword}
            filter={filter}
            setFilter={setFilter}
            filterSort={filterSort}
            setFilterSort={setFilterSort}
          />
        </Paper>
        <div className={classes.middle}>
          {!desktop && (
            <div className={classes.contentMap}>
              <Suspense fallback={null}>
                <MainMap
                  filteredPositions={filteredPositions}
                  selectedPosition={selectedPosition}
                  onEventsClick={onEventsClick}
                />
              </Suspense>
            </div>
          )}
          <Paper
            className={classes.contentList}
            style={devicesOpen ? {} : { visibility: 'hidden' }}
          >
            <DeviceList
              devices={filteredDevices}
              collapsedGroups={collapsedGroups}
              setCollapsedGroups={setCollapsedGroups}
              filter={filter}
              setFilter={setFilter}
              keyword={keyword}
            />
          </Paper>
        </div>
        {desktop && (
          <div className={classes.footer}>
            <BottomMenu />
          </div>
        )}
      </div>
      <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} filter={filter} setFilter={setFilter} filterDeviceId={eventsFilterId} />
      {selectedDeviceId && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={selectedPosition}
          onClose={() => dispatch(devicesActions.selectId(null))}
          onEventsClick={onDeviceEventsClick}
          devicesOpen={devicesOpen}
        />
      )}
    </div>
  );
};

export default MainPage;
