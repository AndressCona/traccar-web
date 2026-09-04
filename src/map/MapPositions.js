import { useId, useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { map } from './core/MapView';
import { formatTime, getStatusColor } from '../common/util/formatter';
import { mapIconKey } from './core/preloadImages';
import { useAttributePreference } from '../common/util/preferences';
import { useCatchCallback } from '../reactHelper';
import { findFonts, fromMapCoordinates, toMapCoordinates } from './core/mapUtil';

const MapPositions = ({
  positions,
  onMapClick,
  onMarkerClick,
  showStatus,
  selectedPosition,
  titleField,
  disabled,
}) => {
  const id = useId();
  const clusters = `${id}-clusters`;
  const selected = `${id}-selected`;

  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 1);

  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const mapCluster = useAttributePreference('mapCluster', true);

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const animationRef = useRef();
  const previousSelectedPositionRef = useRef();
  const targetPositionRef = useRef();

  const createFeature = useCallback(
    (devices, position) => {
      const device = devices[position.deviceId];
      return {
        id: position.id,
        deviceId: position.deviceId,
        name: device.name.startsWith('*') ? device.name.slice(1).trim() : device.name,
        fixTime: formatTime(position.fixTime, 'seconds'),
        category: mapIconKey(device.category),
        color: showStatus ? position.attributes?.color || getStatusColor(device.status) : 'neutral',
        rotation: position.course,
        icon: (position.attributes?.hasOwnProperty('alarm') || device.status === 'alarm')
          ? 'vehicle-alarm' 
          : (device.status === 'offline' || device.status === 'unknown' || (position.attributes?.hasOwnProperty('ignition') && position.attributes.ignition === false) ? 'vehicle-off' : 'vehicle'),
      };
    },
    [showStatus],
  );

  const onMouseEnter = () => (map.getCanvas().style.cursor = 'pointer');
  const onMouseLeave = () => (map.getCanvas().style.cursor = '');

  const onMapClickCallback = useCallback(
    (event) => {
      if (!event.defaultPrevented && onMapClick) {
        const [longitude, latitude] = fromMapCoordinates(event.lngLat.lng, event.lngLat.lat);
        onMapClick(latitude, longitude);
      }
    },
    [onMapClick],
  );

  const onMarkerClickCallback = useCallback(
    (event) => {
      if (disabledRef.current) return;
      event.preventDefault();
      const feature = event.features[0];
      if (onMarkerClick) {
        onMarkerClick(feature.properties.id, feature.properties.deviceId);
      }
    },
    [onMarkerClick],
  );

  const onClusterClick = useCatchCallback(
    async (event) => {
      if (disabledRef.current) return;
      event.preventDefault();
      const features = map.queryRenderedFeatures(event.point, {
        layers: [clusters],
      });
      const clusterId = features[0].properties.cluster_id;
      const zoom = await map.getSource(id).getClusterExpansionZoom(clusterId);
      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom,
      });
    },
    [clusters, id],
  );

  useEffect(() => {
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      cluster: mapCluster,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
    map.addSource(selected, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
    [id, selected].forEach((source) => {
      map.addLayer({
        id: source,
        type: 'symbol',
        source,
        filter: ['!has', 'point_count'],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': iconScale,
          'icon-allow-overlap': true,
          'icon-rotate': ['get', 'rotation'],
          'icon-rotation-alignment': 'map',
          'text-field': `{${titleField || 'name'}}`,
          'text-allow-overlap': true,
          'text-anchor': 'bottom',
          'text-offset': [0, -2 * iconScale],
          'text-font': findFonts(map),
          'text-size': 12,
          'symbol-sort-key': ['get', 'id'],
        },
        paint: {
          'text-halo-color': 'white',
          'text-halo-width': 1,
        },
      });

      map.on('mouseenter', source, onMouseEnter);
      map.on('mouseleave', source, onMouseLeave);
      map.on('click', source, onMarkerClickCallback);
    });
    map.addLayer({
      id: clusters,
      type: 'symbol',
      source: id,
      filter: ['has', 'point_count'],
      layout: {
        'icon-image': 'background',
        'icon-size': iconScale,
        'text-field': '{point_count_abbreviated}',
        'text-font': findFonts(map),
        'text-size': 14,
      },
    });

    map.on('mouseenter', clusters, onMouseEnter);
    map.on('mouseleave', clusters, onMouseLeave);
    map.on('click', clusters, onClusterClick);
    map.on('click', onMapClickCallback);

    return () => {
      map.off('mouseenter', clusters, onMouseEnter);
      map.off('mouseleave', clusters, onMouseLeave);
      map.off('click', clusters, onClusterClick);
      map.off('click', onMapClickCallback);

      if (map.getLayer(clusters)) {
        map.removeLayer(clusters);
      }

      [id, selected].forEach((source) => {
        map.off('mouseenter', source, onMouseEnter);
        map.off('mouseleave', source, onMouseLeave);
        map.off('click', source, onMarkerClickCallback);

        if (map.getLayer(source)) {
          map.removeLayer(source);
        }
        if (map.getSource(source)) {
          map.removeSource(source);
        }
      });
    };
  }, [
    mapCluster,
    clusters,
    onMarkerClickCallback,
    onClusterClick,
    onMapClickCallback,
    iconScale,
    id,
    selected,
    titleField,
  ]);

  // Unselected devices
  useEffect(() => {
    map.getSource(id)?.setData({
      type: 'FeatureCollection',
      features: positions
        .filter((it) => devices.hasOwnProperty(it.deviceId))
        .filter((it) => it.deviceId !== selectedDeviceId)
        .map((position) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: toMapCoordinates(position.longitude, position.latitude),
          },
          properties: createFeature(devices, position),
        })),
    });
  }, [devices, positions, createFeature, id, selectedDeviceId]);

  // Selected device
  useEffect(() => {
    const selectedPosition = positions.find((it) => it.deviceId === selectedDeviceId);
    const source = map.getSource(selected);
    
    if (!source || !selectedPosition || !devices.hasOwnProperty(selectedPosition.deviceId)) {
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
      previousSelectedPositionRef.current = null;
      return;
    }

    const currentCoords = toMapCoordinates(selectedPosition.longitude, selectedPosition.latitude);
    const targetCourse = selectedPosition.course || 0;
    const currentFeatureProps = createFeature(devices, selectedPosition);

    const prevPos = previousSelectedPositionRef.current;
    const lastTarget = targetPositionRef.current;

    // If target hasn't changed, just update properties and let any ongoing animation continue
    if (lastTarget && 
        lastTarget.deviceId === selectedDeviceId &&
        lastTarget.coords[0] === currentCoords[0] &&
        lastTarget.coords[1] === currentCoords[1] &&
        lastTarget.course === targetCourse) {
      lastTarget.properties = currentFeatureProps;
      // If not animating, we should update the source immediately with new properties
      if (!animationRef.current) {
        source.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: currentCoords },
              properties: { ...currentFeatureProps, rotation: targetCourse },
            },
          ],
        });
      }
      return;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    targetPositionRef.current = {
      deviceId: selectedDeviceId,
      coords: currentCoords,
      course: targetCourse,
      properties: currentFeatureProps,
    };

    if (!prevPos || prevPos.deviceId !== selectedDeviceId) {
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: currentCoords },
            properties: { ...currentFeatureProps, rotation: targetCourse },
          },
        ],
      });
      previousSelectedPositionRef.current = {
        deviceId: selectedDeviceId,
        coords: currentCoords,
        course: targetCourse,
      };
      return;
    }

    const prevCoords = prevPos.coords;
    const prevCourse = prevPos.course;

    if (prevCoords[0] === currentCoords[0] && prevCoords[1] === currentCoords[1] && prevCourse === targetCourse) {
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: currentCoords },
            properties: { ...currentFeatureProps, rotation: targetCourse },
          },
        ],
      });
      return;
    }

    let startTime;
    const duration = 2000;

    const interpolateAngle = (start, end, t) => {
      let diff = ((end - start + 180) % 360) - 180;
      diff = diff < -180 ? diff + 360 : diff;
      return start + diff * t;
    };

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const t = Math.min(progress / duration, 1);
      
      const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      
      const currentTargetProps = targetPositionRef.current;

      const interpolatedCoords = [
        prevCoords[0] + (currentTargetProps.coords[0] - prevCoords[0]) * ease,
        prevCoords[1] + (currentTargetProps.coords[1] - prevCoords[1]) * ease,
      ];
      
      const interpolatedCourse = interpolateAngle(prevCourse, currentTargetProps.course, ease);

      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: interpolatedCoords },
            properties: { ...currentTargetProps.properties, rotation: interpolatedCourse },
          },
        ],
      });

      previousSelectedPositionRef.current = {
        deviceId: selectedDeviceId,
        coords: interpolatedCoords,
        course: interpolatedCourse,
      };

      if (progress < duration) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

  }, [devices, positions, createFeature, selected, selectedDeviceId]);

  return null;
};

export default MapPositions;
