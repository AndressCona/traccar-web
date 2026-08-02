import { useId, useCallback, useEffect } from 'react';
import { map } from './core/MapView';
import getSpeedColor from '../common/util/colors';
import { findFonts, toMapCoordinates } from './core/mapUtil';
import MapSpeedLegend from './control/MapSpeedLegend';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371e3; // Radio de la Tierra en metros
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MapRoutePoints = ({ positions, onClick, showSpeedControl }) => {
  const id = useId();

  const onMouseEnter = () => (map.getCanvas().style.cursor = 'pointer');
  const onMouseLeave = () => (map.getCanvas().style.cursor = '');

  const onMarkerClick = useCallback(
    (event) => {
      event.preventDefault();
      const feature = event.features[0];
      if (onClick) {
        onClick(feature.properties.id, feature.properties.index);
      }
    },
    [onClick],
  );

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    map.addLayer({
      id,
      type: 'symbol',
      source: id,
      paint: {
        'text-color': ['get', 'color'],
      },
      layout: {
        'text-font': findFonts(map),
        'text-size': 12,
        'text-field': '▲',
        'text-allow-overlap': true,
        'text-rotate': ['get', 'rotation'],
      },
    });

    map.on('mouseenter', id, onMouseEnter);
    map.on('mouseleave', id, onMouseLeave);
    map.on('click', id, onMarkerClick);

    return () => {
      map.off('mouseenter', id, onMouseEnter);
      map.off('mouseleave', id, onMouseLeave);
      map.off('click', id, onMarkerClick);

      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    };
  }, [onMarkerClick, id]);

  useEffect(() => {
    const maxSpeed = positions.reduce((a, p) => Math.max(a, p.speed), -Infinity);
    const minSpeed = positions.reduce((a, p) => Math.min(a, p.speed), Infinity);

    let lastAdded = null;
    const filteredFeatures = [];

    positions.forEach((position, index) => {
      let add = false;
      if (!lastAdded) {
        add = true;
      } else {
        const dist = calculateDistance(lastAdded.latitude, lastAdded.longitude, position.latitude, position.longitude);
        if (dist > 15) { // Si se movió más de 15 metros
          add = true;
        }
      }

      if (add) {
        lastAdded = position;
        filteredFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: toMapCoordinates(position.longitude, position.latitude),
          },
          properties: {
            index, // Mantenemos el índice original
            id: position.id,
            rotation: position.course,
            color: getSpeedColor(position.speed, minSpeed, maxSpeed),
          },
        });
      }
    });

    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: filteredFeatures,
    });
  }, [positions, id]);

  return showSpeedControl ? <MapSpeedLegend positions={positions} /> : null;
};

export default MapRoutePoints;
