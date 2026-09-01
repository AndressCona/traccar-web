import { useId, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { map } from '../core/MapView';
import { useAttributePreference } from '../../common/util/preferences';
import { toMapCoordinates } from '../core/mapUtil';
import { useTranslation } from '../../common/components/LocalizationProvider';

const MapLiveRoutes = ({ deviceIds }) => {
  const id = useId();

  const t = useTranslation();

  const type = useAttributePreference('mapLiveRoutes', 'selected');

  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const history = useSelector((state) => state.session.history);

  const mapLineWidth = useAttributePreference('mapLineWidth', 2);
  const mapLineOpacity = useAttributePreference('mapLineOpacity', 1);

  const animationRef = useRef();
  const previousRouteTargetRef = useRef();
  const currentRouteCoordRef = useRef();

  useEffect(() => {
    if (type !== 'none') {
      map.addSource(id, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
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
    return () => {};
  }, [type, id, t]);

  useEffect(() => {
    if (type !== 'none') {
      const visibleIds = deviceIds
        .filter((id) => (type === 'selected' ? id === selectedDeviceId : true))
        .filter((id) => history.hasOwnProperty(id))
        .filter((id) => devices[id]);

      const source = map.getSource(id);
      if (!source) return;

      const baseFeatures = visibleIds.map((deviceId) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: history[deviceId].map(([longitude, latitude]) =>
            toMapCoordinates(longitude, latitude),
          ),
        },
        properties: {
          deviceId,
          color: devices[deviceId]?.attributes?.['web.reportColor'] || '#F56F27',
          width: mapLineWidth,
          opacity: mapLineOpacity,
        },
      }));

      const selectedFeature = baseFeatures.find(f => f.properties.deviceId === selectedDeviceId);

      if (selectedFeature && selectedFeature.geometry.coordinates.length >= 2) {
        const coords = selectedFeature.geometry.coordinates;
        const currentTarget = coords[coords.length - 1];
        const lastTarget = previousRouteTargetRef.current;

        if (lastTarget && lastTarget.deviceId === selectedDeviceId &&
            (lastTarget.coords[0] !== currentTarget[0] || lastTarget.coords[1] !== currentTarget[1])) {
          
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }

          let startCoord = currentRouteCoordRef.current || coords[coords.length - 2];
          let startTime;
          const duration = 2000;

          const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const t = Math.min(progress / duration, 1);
            const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

            const interpolatedCoord = [
              startCoord[0] + (currentTarget[0] - startCoord[0]) * ease,
              startCoord[1] + (currentTarget[1] - startCoord[1]) * ease,
            ];

            currentRouteCoordRef.current = interpolatedCoord;

            const updatedFeatures = baseFeatures.map(f => {
              if (f.properties.deviceId === selectedDeviceId) {
                const newCoords = [...f.geometry.coordinates];
                newCoords[newCoords.length - 1] = interpolatedCoord;
                return { ...f, geometry: { ...f.geometry, coordinates: newCoords } };
              }
              return f;
            });

            source.setData({
              type: 'FeatureCollection',
              features: updatedFeatures,
            });

            if (progress < duration) {
              animationRef.current = requestAnimationFrame(animate);
            } else {
              animationRef.current = null;
              currentRouteCoordRef.current = null;
            }
          };

          animationRef.current = requestAnimationFrame(animate);
          previousRouteTargetRef.current = { deviceId: selectedDeviceId, coords: currentTarget };
          return;

        } else if (!lastTarget || lastTarget.deviceId !== selectedDeviceId) {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
          previousRouteTargetRef.current = { deviceId: selectedDeviceId, coords: currentTarget };
          currentRouteCoordRef.current = null;
        } else if (lastTarget && lastTarget.coords[0] === currentTarget[0] && lastTarget.coords[1] === currentTarget[1]) {
          if (animationRef.current) {
            return; 
          }
        }
      } else {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        previousRouteTargetRef.current = null;
        currentRouteCoordRef.current = null;
      }

      source.setData({
        type: 'FeatureCollection',
        features: baseFeatures,
      });
    }
  }, [type, devices, selectedDeviceId, history, deviceIds, id, mapLineOpacity, mapLineWidth]);

  return null;
};

export default MapLiveRoutes;
