'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import {
  type ErrorEvent,
  type GeoJSONSource,
  type LngLatBoundsLike,
  MapLibreMap,
  Marker,
  setWorkerUrl,
} from 'maplibre-gl';
import { useTheme } from 'next-themes';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  bearingDeg,
  lerpAngle,
  lerpLngLat,
  nearestIndex,
} from '../lib/vehicle-motion';
import type {
  DeliveryMapProps,
  LastPosition,
  LngLat,
  MapStage,
} from '../types';
import { MAP_FRAME, MapUnavailable } from './map-placeholder';

// Turbopack only emits the worker as an asset when it sees this URL pattern.
setWorkerUrl(
  new URL(
    'maplibre-gl/dist/maplibre-gl-worker.mjs',
    import.meta.url,
  ).toString(),
);

const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

// GL layers can't read CSS variables; mirrors --primary in globals.css, remaining kept at ≥ 3:1 on the basemap.
const COLORS = {
  light: { traveled: '#2e6b5e', remaining: '#8a918c' },
  dark: { traveled: '#6fb8a6', remaining: '#9aa59f' },
} as const;

type Theme = keyof typeof STYLES;

const GLIDE_MS = 2000;
const CITY_ZOOM = 11;
const CITY_MAX_ZOOM = 12;
const STREET_MAX_ZOOM = 15;
const VEHICLE_ZOOM = 14;
const HALO_METERS = 8000;
// Web Mercator meters per pixel at zoom 0 on the equator, for 512 px tiles.
const METERS_PER_PIXEL_Z0 = 78_271.517;

const VEHICLE_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2 20 21 12 16.5 4 21Z" fill="currentColor" stroke-linejoin="round"/></svg>';

export type DeliveryCanvasProps = DeliveryMapProps & {
  stale: boolean;
  captionId: string;
};

function element(className: string, html = ''): HTMLDivElement {
  const node = document.createElement('div');
  node.className = className;
  node.setAttribute('aria-hidden', 'true');
  node.innerHTML = html;
  return node;
}

function traveledIndex({
  route,
  splitIndex,
  stage,
  position,
}: DeliveryMapProps): number {
  if (!route) return 0;
  if (position) return nearestIndex(route, [position.lng, position.lat]);
  if (stage === 'IN_TRANSIT') return 0;
  // Internal routes run to the door, so the last mile starts at the split; the public one ends there.
  if (stage === 'OUT_FOR_DELIVERY' && splitIndex !== undefined)
    return splitIndex;
  return route.length - 1;
}

function routeData(route: LngLat[], split: number) {
  const line = (part: string, coordinates: LngLat[]) => ({
    type: 'Feature' as const,
    properties: { part },
    geometry: { type: 'LineString' as const, coordinates },
  });
  return {
    type: 'FeatureCollection' as const,
    features: [
      line('remaining', route.slice(split)),
      line('traveled', route.slice(0, split + 1)),
    ].filter((feature) => feature.geometry.coordinates.length > 1),
  };
}

function haloPixelsAtZoom0([, lat]: LngLat) {
  return HALO_METERS / (METERS_PER_PIXEL_Z0 * Math.cos((lat * Math.PI) / 180));
}

function boundsOf(points: LngLat[]): LngLatBoundsLike {
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function framePoints({
  route,
  splitIndex = 0,
  destination,
  area,
  stage,
}: DeliveryMapProps): LngLat[] {
  if (!route) return [];
  if (area) return [...route, area.center];
  const end = destination ? [destination] : [];
  if (stage === 'IN_TRANSIT') return route.slice(0, splitIndex + 1);
  if (stage === 'OUT_FOR_DELIVERY') return [...route.slice(splitIndex), ...end];
  return [...route, ...end];
}

export default function DeliveryMap(props: DeliveryCanvasProps) {
  const { route, area, stage, position, label, stale, captionId } = props;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const vehicle = useRef<Marker | null>(null);
  const shown = useRef<{ at: LngLat; rotation: number } | null>(null);
  const frame = useRef(0);
  const framed = useRef(false);
  const userMoved = useRef(false);
  const [failed, setFailed] = useState(false);
  const theme: Theme = useTheme().resolvedTheme === 'dark' ? 'dark' : 'light';
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const split = traveledIndex(props);

  // Fires on the first style and after every setStyle, which drops custom sources and layers.
  const addLayers = useEffectEvent((map: MapLibreMap) => {
    const colors = COLORS[theme];
    if (area) {
      const radius = haloPixelsAtZoom0(area.center);
      map.addSource('area', {
        type: 'geojson',
        data: { type: 'Point', coordinates: area.center },
      });
      map.addLayer({
        id: 'area-halo',
        type: 'circle',
        source: 'area',
        paint: {
          // circle-radius is in pixels; doubling it per zoom level keeps a fixed ground size.
          'circle-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            0,
            radius,
            22,
            radius * 2 ** 22,
          ],
          'circle-color': colors.traveled,
          'circle-opacity': 0.15,
          'circle-stroke-color': colors.traveled,
          'circle-stroke-opacity': 0.4,
          'circle-stroke-width': 1,
        },
      });
    }
    if (!route) return;
    map.addSource('route', { type: 'geojson', data: routeData(route, split) });
    for (const part of ['remaining', 'traveled'] as const) {
      map.addLayer({
        id: `route-${part}`,
        type: 'line',
        source: 'route',
        filter: ['==', ['get', 'part'], part],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': colors[part],
          'line-width': part === 'traveled' ? 5 : 4,
          ...(part === 'remaining' && { 'line-dasharray': [1.5, 1.5] }),
        },
      });
    }
  });

  const createMap = useEffectEvent((node: HTMLDivElement) => {
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: node,
        style: STYLES[theme],
        attributionControl: { compact: true },
        cooperativeGestures: true,
        dragRotate: false,
        touchPitch: false,
        locale: { 'Map.Title': label },
      });
    } catch (error) {
      // Includes GPUInitializationError: no WebGL2, or the context was refused.
      console.error(error);
      setFailed(true);
      return null;
    }
    if (props.destination) {
      new Marker({
        element: element(
          'size-4 rounded-full border-[3px] border-card bg-foreground shadow-md',
        ),
      })
        .setLngLat(props.destination)
        .addTo(map);
    }
    return map;
  });

  const onResize = useEffectEvent(() => {
    if (!userMoved.current) fitCamera(stage, false);
  });

  useEffect(() => {
    const node = container.current;
    const map = node && createMap(node);
    if (!node || !map) return;
    mapRef.current = map;
    let disposed = false;
    let loaded = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame.current);
      map.remove();
      mapRef.current = null;
      vehicle.current = null;
      shown.current = null;
      framed.current = false;
      userMoved.current = false;
    };

    map.touchZoomRotate.disableRotation();
    map.getCanvas().setAttribute('aria-describedby', captionId);
    map.once('load', () => {
      loaded = true;
      // Compact attribution starts open; the toggle keeps the OSM credit one tap away.
      node
        .querySelector('.maplibregl-compact-show')
        ?.classList.remove('maplibregl-compact-show');
    });
    map.on('error', (event: ErrorEvent) => {
      console.error(event.error);
      // A missing tile leaves the rest of the map usable; only the style or GL failing is fatal.
      if (disposed || loaded || 'tile' in event || 'sourceId' in event) return;
      dispose();
      setFailed(true);
    });
    map.on('style.load', () => addLayers(map));
    map.on('movestart', (event) => {
      if (event.originalEvent) userMoved.current = true;
    });
    map.on('resize', onResize);
    return dispose;
  }, [captionId]);

  const applied = useRef<string>(STYLES[theme]);
  useEffect(() => {
    const url = STYLES[theme];
    if (!mapRef.current || applied.current === url) return;
    applied.current = url;
    mapRef.current.setStyle(url);
  }, [theme]);

  useEffect(() => {
    if (!route) return;
    const source = mapRef.current?.getSource<GeoJSONSource>('route');
    source?.setData(routeData(route, split));
  }, [route, split]);

  const fitCamera = useEffectEvent((current: MapStage, glide: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    const animate = glide && !reducedMotion;
    if (area && current === 'OUT_FOR_DELIVERY') {
      map.easeTo({ center: area.center, zoom: CITY_ZOOM, animate });
      return;
    }
    const points = framePoints({ ...props, stage: current });
    if (points.length > 0) {
      const maxZoom = area ? CITY_MAX_ZOOM : STREET_MAX_ZOOM;
      map.fitBounds(boundsOf(points), { padding: 40, maxZoom, animate });
    } else if (position) {
      const center: LngLat = [position.lng, position.lat];
      map.easeTo({ center, zoom: VEHICLE_ZOOM, animate });
    }
  });

  // Framed on mount, on stage changes and on resize until the user pans: following every ping would fight them.
  useEffect(() => {
    fitCamera(stage, framed.current);
    framed.current = true;
    userMoved.current = false;
  }, [stage]);

  const moveVehicle = useEffectEvent((next: LastPosition | null) => {
    const map = mapRef.current;
    if (!map) return;
    cancelAnimationFrame(frame.current);
    if (!next) {
      vehicle.current?.remove();
      vehicle.current = null;
      shown.current = null;
      return;
    }

    const to: LngLat = [next.lng, next.lat];
    const from = shown.current;
    const moved = from && (from.at[0] !== to[0] || from.at[1] !== to[1]);
    const heading =
      next.heading ??
      (from && moved ? bearingDeg(from.at, to) : (from?.rotation ?? 0));

    if (!vehicle.current) {
      vehicle.current = new Marker({
        element: element(
          'flex size-8 items-center justify-center rounded-full bg-card text-primary shadow-md ring-1 ring-border transition-colors data-[stale=true]:text-muted-foreground',
          VEHICLE_SVG,
        ),
        rotationAlignment: 'map',
      })
        .setLngLat(to)
        .setRotation(heading)
        .addTo(map);
      vehicle.current.getElement().dataset.stale = String(stale);
    }
    const marker = vehicle.current;
    const place = (at: LngLat, rotation: number) => {
      marker.setLngLat(at).setRotation(rotation);
      shown.current = { at, rotation };
    };

    if (!from || reducedMotion) {
      place(to, heading);
      return;
    }
    // shortcut: straight lerp between pings cuts route vertices, upgrade to walking the route polyline if QA shows corner cutting at street zoom
    const startedAt = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - startedAt) / GLIDE_MS);
      place(lerpLngLat(from.at, to, t), lerpAngle(from.rotation, heading, t));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  });

  useEffect(() => {
    moveVehicle(position);
  }, [position]);

  useEffect(() => {
    vehicle.current?.getElement().setAttribute('data-stale', String(stale));
  }, [stale]);

  return failed ? (
    <MapUnavailable />
  ) : (
    <div ref={container} className={`${MAP_FRAME} bg-muted`} />
  );
}
