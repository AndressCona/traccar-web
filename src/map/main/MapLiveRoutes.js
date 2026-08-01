import { useId, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import { map } from '../core/MapView';
import { useAttributePreference } from '../../common/util/preferences';
import { toMapCoordinates } from '../core/mapUtil';
import { useTranslation } from '../../common/components/LocalizationProvider';

const getDistance = (lon1, lat1, lon2, lat2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MapLiveRoutes = ({ deviceIds }) => {
  const id = useId();

  const theme = useTheme();
  const t = useTranslation();

  const type = useAttributePreference('mapLiveRoutes', 'none');

  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const history = useSelector((state) => state.session.history);

  const mapLineWidth = useAttributePreference('mapLineWidth', 2);
  const mapLineOpacity = useAttributePreference('mapLineOpacity', 1);

  useEffect(() => {
    if (type !== 'none') {
      map.addSource(id, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'MultiLineString',
            coordinates: [],
          },
        },
      });
      map.addLayer({
        source: id,
        id,
        type: 'line',
        metadata: { 'traccar:title': t('mapLiveRoutes') },
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity'],
        },
      });

      return () => {
        if (map.getLayer(id)) {
          map.removeLayer(id);
        }
        if (map.getSource(id)) {
          map.removeSource(id);
        }
      };
    }
    return () => { };
  }, [type, id, t]);

  useEffect(() => {
    if (type !== 'none') {
      const visibleIds = deviceIds
        .filter((id) => (type === 'selected' ? id === selectedDeviceId : true))
        .filter((id) => history.hasOwnProperty(id))
        .filter((id) => devices[id]);

      map.getSource(id)?.setData({
        type: 'FeatureCollection',
        features: visibleIds.map((deviceId) => {
          const coords = history[deviceId];
          const lines = [];
          let currentLine = [];
          for (let i = 0; i < coords.length; i++) {
            if (i === 0) {
              currentLine.push(toMapCoordinates(coords[i][0], coords[i][1]));
            } else {
              const prev = coords[i - 1];
              const curr = coords[i];
              if (getDistance(prev[0], prev[1], curr[0], curr[1]) > 1.5) {
                if (currentLine.length > 1) lines.push(currentLine);
                currentLine = [toMapCoordinates(curr[0], curr[1])];
              } else {
                currentLine.push(toMapCoordinates(curr[0], curr[1]));
              }
            }
          }
          if (currentLine.length > 1) lines.push(currentLine);

          return {
            type: 'Feature',
            geometry: {
              type: 'MultiLineString',
              coordinates: lines,
            },
            properties: {
              color: devices[deviceId]?.attributes?.['web.reportColor'] || '#F56F27',
              width: mapLineWidth,
              opacity: mapLineOpacity,
            },
          };
        }),
      });
    }
  }, [
    theme,
    type,
    devices,
    selectedDeviceId,
    history,
    deviceIds,
    id,
    mapLineOpacity,
    mapLineWidth,
  ]);

  return null;
};

export default MapLiveRoutes;
