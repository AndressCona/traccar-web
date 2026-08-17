import * as maplibregl from 'maplibre-gl';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { usePreference } from '../../common/util/preferences';
import { map } from '../core/MapView';
import { toMapCoordinates } from '../core/mapUtil';

const MapDefaultCamera = ({ filteredPositions }) => {
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);

  const defaultLatitude = usePreference('latitude');
  const defaultLongitude = usePreference('longitude');
  const defaultZoom = usePreference('zoom', 0);

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    if (selectedDeviceId) {
      const position = positions[selectedDeviceId];
      if (position) {
        map.jumpTo({
          center: toMapCoordinates(position.longitude, position.latitude),
          zoom: Math.max(defaultZoom > 0 ? defaultZoom : map.getZoom(), 10),
        });
        setInitialized(true);
      }
    } else {
      if (defaultLatitude && defaultLongitude) {
        map.jumpTo({
          center: toMapCoordinates(defaultLongitude, defaultLatitude),
          zoom: defaultZoom,
        });
        setInitialized(true);
      } else {
        const coordinates = (filteredPositions || Object.values(positions))
          .map((item) => toMapCoordinates(item.longitude, item.latitude))
          .filter(
            ([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude),
          );
        const canvas = map.getCanvas();
        const bounds =
          coordinates.length > 1
            ? coordinates.reduce(
                (bounds, item) => bounds.extend(item),
                new maplibregl.LngLatBounds(coordinates[0], coordinates[1]),
              )
            : null;
        const degenerate =
          bounds &&
          bounds.getNorth() === bounds.getSouth() &&
          bounds.getEast() === bounds.getWest();
        if (bounds && !degenerate && canvas.width > 0 && canvas.height > 0) {
          map.fitBounds(bounds, {
            duration: 0,
            padding: Math.min(canvas.width, canvas.height) * 0.1,
          });
          setInitialized(true);
        } else if (coordinates.length) {
          const [individual] = coordinates;
          map.jumpTo({
            center: individual,
            zoom: Math.max(defaultZoom > 0 ? defaultZoom : map.getZoom(), 10),
          });
          setInitialized(true);
        }
      }
    }
  }, [
    selectedDeviceId,
    initialized,
    defaultLatitude,
    defaultLongitude,
    defaultZoom,
    positions,
    filteredPositions,
  ]);

  return null;
};

export default MapDefaultCamera;
