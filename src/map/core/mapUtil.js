import { parse, stringify } from 'wellknown';
import turfCircle from '@turf/circle';
import gcoord from 'gcoord';
import { map } from './MapView';

const coordinateSystem = (id) => {
  switch (id) {
    case 'gcj02':
      return gcoord.GCJ02;
    default:
      return gcoord.WGS84;
  }
};

export const toMapCoordinates = (longitude, latitude) =>
  map.coordinateSystem
    ? gcoord.transform([longitude, latitude], gcoord.WGS84, coordinateSystem(map.coordinateSystem))
    : [longitude, latitude];

export const fromMapCoordinates = (longitude, latitude) =>
  map.coordinateSystem
    ? gcoord.transform([longitude, latitude], coordinateSystem(map.coordinateSystem), gcoord.WGS84)
    : [longitude, latitude];

const transformGeometry = (geometry, from, to) =>
  gcoord.transform(structuredClone(geometry), from, to);

export const addOrderedControl = (control, position, order) => {
  map.addControl(control, position);
  const container = map.getContainer().querySelector(`.maplibregl-ctrl-${position}`);
  const element = container?.lastElementChild;
  if (element) {
    element.dataset.order = order;
  }
  Array.from(container?.children || [])
    .sort((a, b) => Number(a.dataset.order || 0) - Number(b.dataset.order || 0))
    .forEach((el) => container.appendChild(el));
};

export const loadImage = (url) =>
  new Promise((imageLoaded) => {
    const image = new Image();
    image.onload = () => imageLoaded(image);
    image.src = url;
  });

const canvasTintImage = (image, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width * devicePixelRatio;
  canvas.height = image.height * devicePixelRatio;
  canvas.style.width = `${image.width}px`;
  canvas.style.height = `${image.height}px`;

  const context = canvas.getContext('2d');

  context.save();
  context.fillStyle = color;
  context.globalAlpha = 1;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'destination-atop';
  context.globalAlpha = 1;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.restore();

  return canvas;
};

export const prepareRawIcon = (image) => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width * devicePixelRatio;
  canvas.height = image.height * devicePixelRatio;
  canvas.style.width = `${image.width}px`;
  canvas.style.height = `${image.height}px`;

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return context.getImageData(0, 0, canvas.width, canvas.height);
};

export const prepareGrayscaleIcon = (image) => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width * devicePixelRatio;
  canvas.height = image.height * devicePixelRatio;
  canvas.style.width = `${image.width}px`;
  canvas.style.height = `${image.height}px`;

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const v = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  context.putImageData(imageData, 0, 0);

  return imageData;
};

export const prepareReddishGrayscaleIcon = (image) => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width * devicePixelRatio;
  canvas.height = image.height * devicePixelRatio;
  canvas.style.width = `${image.width}px`;
  canvas.style.height = `${image.height}px`;

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const v = 0.299 * r + 0.587 * g + 0.114 * b;
    // Make it reddish grayscale: tint towards red
    data[i] = Math.min(255, v * 1.3);     // More red
    data[i + 1] = v * 0.7;                // Less green
    data[i + 2] = v * 0.7;                // Less blue
  }
  context.putImageData(imageData, 0, 0);

  return imageData;
};

export const prepareIcon = (background, icon, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = background.width * devicePixelRatio;
  canvas.height = background.height * devicePixelRatio;
  canvas.style.width = `${background.width}px`;
  canvas.style.height = `${background.height}px`;

  const context = canvas.getContext('2d');
  context.drawImage(background, 0, 0, canvas.width, canvas.height);

  if (icon) {
    const iconRatio = 0.5;
    const imageWidth = canvas.width * iconRatio;
    const imageHeight = canvas.height * iconRatio;
    context.drawImage(
      canvasTintImage(icon, color),
      (canvas.width - imageWidth) / 2,
      (canvas.height - imageHeight) / 2,
      imageWidth,
      imageHeight,
    );
  }

  return context.getImageData(0, 0, canvas.width, canvas.height);
};

export const reverseCoordinates = (it) => {
  if (!it) {
    return it;
  }
  if (Array.isArray(it)) {
    if (it.length === 2 && typeof it[0] === 'number' && typeof it[1] === 'number') {
      return [it[1], it[0]];
    }
    return it.map((it) => reverseCoordinates(it));
  }
  return {
    ...it,
    coordinates: reverseCoordinates(it.coordinates),
  };
};

export const geofenceToFeature = (theme, item) => {
  let geometry;
  if (item.area.indexOf('CIRCLE') > -1) {
    const coordinates = item.area
      .replace(/CIRCLE|\(|\)|,/g, ' ')
      .trim()
      .split(/ +/);
    const options = { steps: 32, units: 'meters' };
    const polygon = turfCircle(
      toMapCoordinates(Number(coordinates[1]), Number(coordinates[0])),
      Number(coordinates[2]),
      options,
    );
    geometry = polygon.geometry;
  } else {
    geometry = reverseCoordinates(parse(item.area));
    if (map.coordinateSystem) {
      geometry = transformGeometry(geometry, gcoord.WGS84, coordinateSystem(map.coordinateSystem));
    }
  }
  return {
    id: item.id,
    type: 'Feature',
    geometry,
    properties: {
      name: item.name,
      color: item.attributes.color || theme.palette.geometry.main,
      width: item.attributes.mapLineWidth || 2,
      opacity: item.attributes.mapLineOpacity || 1,
    },
  };
};

export const geometryToArea = (geometry) => {
  const normalized = map.coordinateSystem
    ? transformGeometry(geometry, coordinateSystem(map.coordinateSystem), gcoord.WGS84)
    : geometry;
  return stringify(reverseCoordinates(normalized));
};

export const findFonts = (map) => {
  const { glyphs } = map.getStyle();
  if (glyphs.startsWith('https://tiles.openfreemap.org')) {
    return ['Noto Sans Regular'];
  }
  if (glyphs.startsWith('https://api.os.uk')) {
    return ['Source Sans Pro Regular'];
  }
  return ['Open Sans Regular', 'Arial Unicode MS Regular'];
};
