'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import {
  type GeoJSONSource,
  type LngLatBoundsLike,
  MapLibreMap,
  Marker,
  setWorkerUrl,
} from 'maplibre-gl';
import { useTheme } from 'next-themes';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useNow } from '@/hooks/use-now';
import { formatTimeAgo } from '@/lib/format-date';
import {
  bearingDeg,
  isNewer,
  lerpAngle,
  lerpLngLat,
  nearestIndex,
} from '../lib/vehicle-motion';
import type { LastPosition, LngLat } from '../types';
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

// GL layers can't read CSS variables; mirrors --primary and --muted-foreground in globals.css.
const ROUTE_COLORS = {
  light: { traveled: '#2e6b5e', remaining: '#5d6560' },
  dark: { traveled: '#6fb8a6', remaining: '#9aa59f' },
} as const;

type Theme = keyof typeof STYLES;

const GLIDE_MS = 2000;
const STALE_CAPTION_S = 10;
const STALE_MARKER_S = 30;
const CITY_ZOOM = 11;
const VEHICLE_ZOOM = 14;
const ROUTE_SOURCE = 'route';

const VEHICLE_SVG =
  '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2 20 21 12 16.5 4 21Z" fill="currentColor" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>';

export type MapStage = 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DONE';

export interface DeliveryMapProps {
  route: LngLat[] | null;
  splitIndex?: number;
  // Internal only: the public caller has no address coordinates to pass.
  destination?: LngLat;
  // Public only: the destination city, drawn as a halo, never a pin.
  area?: { center: LngLat; city: string };
  stage: MapStage;
  position: LastPosition | null;
  label: string;
  caption: string;
}

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
  // The public route already ends where the city starts, so out for delivery has traveled it all.
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

function signalAge(position: LastPosition, now: Date): number {
  const ms = now.getTime() - Date.parse(position.recordedAt);
  return Math.max(0, Math.floor(ms / 1000));
}

export default function DeliveryMap(props: DeliveryMapProps) {
  const { route, area, stage, position, label, caption } = props;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const vehicle = useRef<Marker | null>(null);
  const shown = useRef<{ at: LngLat; rotation: number } | null>(null);
  const target = useRef<LastPosition | null>(null);
  const frame = useRef(0);
  const framed = useRef(false);
  const [failed, setFailed] = useState(false);
  const theme: Theme = useTheme().resolvedTheme === 'dark' ? 'dark' : 'light';
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const split = traveledIndex(props);

  const addRoute = useEffectEvent((map: MapLibreMap) => {
    if (!route) return;
    const colors = ROUTE_COLORS[theme];
    map.addSource(ROUTE_SOURCE, {
      type: 'geojson',
      data: routeData(route, split),
    });
    for (const part of ['remaining', 'traveled'] as const) {
      map.addLayer({
        id: `route-${part}`,
        type: 'line',
        source: ROUTE_SOURCE,
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
      });
    } catch (error) {
      // Includes GPUInitializationError: no WebGL2, or the context was refused.
      console.error(error);
      setFailed(true);
      return null;
    }
    map.touchZoomRotate.disableRotation();
    let loaded = false;
    map.once('load', () => {
      loaded = true;
    });
    map.on('error', ({ error }) => {
      console.error(error);
      if (!loaded) setFailed(true);
    });
    // Fires again after every setStyle, which drops custom sources and layers.
    map.on('style.load', () => addRoute(map));
    if (props.destination) {
      new Marker({
        element: element(
          'size-4 rounded-full border-[3px] border-card bg-foreground shadow-md',
        ),
      })
        .setLngLat(props.destination)
        .addTo(map);
    }
    if (area) {
      const halo = element(
        'flex size-36 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-foreground ring-1 ring-primary/30',
      );
      halo.textContent = area.city;
      new Marker({ element: halo }).setLngLat(area.center).addTo(map);
    }
    return map;
  });

  useEffect(() => {
    if (!container.current) return;
    const map = createMap(container.current);
    mapRef.current = map;
    return () => {
      cancelAnimationFrame(frame.current);
      map?.remove();
      mapRef.current = null;
      vehicle.current = null;
      shown.current = null;
      target.current = null;
      framed.current = false;
    };
  }, []);

  const applied = useRef<string>(STYLES[theme]);
  useEffect(() => {
    const url = STYLES[theme];
    if (!mapRef.current || applied.current === url) return;
    applied.current = url;
    mapRef.current.setStyle(url);
  }, [theme]);

  useEffect(() => {
    if (!route) return;
    const source = mapRef.current?.getSource<GeoJSONSource>(ROUTE_SOURCE);
    source?.setData(routeData(route, split));
  }, [route, split]);

  const fitCamera = useEffectEvent((current: MapStage) => {
    const map = mapRef.current;
    if (!map) return;
    // The first frame jumps; only later stage changes glide.
    const animate = framed.current && !reducedMotion;
    framed.current = true;
    if (area && current === 'OUT_FOR_DELIVERY') {
      map.easeTo({ center: area.center, zoom: CITY_ZOOM, animate });
      return;
    }
    const points = framePoints({ ...props, stage: current });
    if (points.length > 0) {
      map.fitBounds(boundsOf(points), { padding: 40, maxZoom: 15, animate });
    } else if (position) {
      const center: LngLat = [position.lng, position.lat];
      map.easeTo({ center, zoom: VEHICLE_ZOOM, animate });
    }
  });

  // Framed on mount and on stage changes only: following every ping would fight the user's pan.
  useEffect(() => {
    fitCamera(stage);
  }, [stage]);

  const moveVehicle = useEffectEvent((next: LastPosition | null) => {
    const map = mapRef.current;
    if (!map) return;
    if (!next) {
      cancelAnimationFrame(frame.current);
      vehicle.current?.remove();
      vehicle.current = null;
      shown.current = null;
      target.current = null;
      return;
    }
    if (!isNewer(next, target.current)) return;
    target.current = next;

    const to: LngLat = [next.lng, next.lat];
    const from = shown.current;
    const moved = from && (from.at[0] !== to[0] || from.at[1] !== to[1]);
    const heading =
      next.heading ??
      (from && moved ? bearingDeg(from.at, to) : (from?.rotation ?? 0));

    if (!vehicle.current) {
      vehicle.current = new Marker({
        element: element(
          'text-primary transition-[filter,opacity] data-[stale=true]:opacity-50 data-[stale=true]:grayscale',
          VEHICLE_SVG,
        ),
        rotationAlignment: 'map',
      })
        .setLngLat(to)
        .setRotation(heading)
        .addTo(map);
    }
    const marker = vehicle.current;
    const place = (at: LngLat, rotation: number) => {
      marker.setLngLat(at).setRotation(rotation);
      shown.current = { at, rotation };
    };

    cancelAnimationFrame(frame.current);
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

  const now = useNow(5000);
  const age = position ? signalAge(position, now) : 0;
  const stale = age > STALE_MARKER_S;
  useEffect(() => {
    vehicle.current?.getElement().setAttribute('data-stale', String(stale));
  }, [stale]);

  // The public link never shows the vehicle out for delivery, so it isn't waiting for one.
  const expectsVehicle =
    stage === 'IN_TRANSIT' || (stage === 'OUT_FOR_DELIVERY' && !area);
  let signal: string | null = null;
  if (position && age > STALE_CAPTION_S) {
    signal = `Last signal ${age < 60 ? `${age}s ago` : formatTimeAgo(position.recordedAt, now)}`;
  } else if (!position && expectsVehicle) {
    signal = "Waiting for the vehicle's signal";
  }

  return (
    <section aria-label={label}>
      <figure className="flex flex-col gap-2.5">
        {failed ? (
          <MapUnavailable />
        ) : (
          <div ref={container} className={`${MAP_FRAME} bg-muted`} />
        )}
        <figcaption className="text-[13px] text-muted-foreground">
          {caption}
          {signal && ` · ${signal}`}
        </figcaption>
      </figure>
    </section>
  );
}
