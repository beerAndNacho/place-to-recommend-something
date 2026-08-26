"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import { CROWD_META } from "@/lib/crowd";
import type { RankedPlace } from "@/types/place";

const SEOUL_CENTER: [number, number] = [126.978, 37.5665];

const style: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function CrowdMap({
  places,
  selectedSlug,
  onSelect,
  compact = false,
}: {
  places: RankedPlace[];
  selectedSlug?: string;
  onSelect?: (slug: string) => void;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: SEOUL_CENTER,
      zoom: compact ? 12.2 : 11.25,
      minZoom: 9,
      maxZoom: 17,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    places.forEach((place) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `crowd-marker crowd-marker--${place.crowd.level}${selectedSlug === place.slug ? " crowd-marker--selected" : ""}`;
      element.setAttribute(
        "aria-label",
        `${place.name}, ${CROWD_META[place.crowd.level].label}, 추천 ${place.score}점`,
      );
      element.innerHTML = `<span class="crowd-marker__score">${place.score}</span><span class="crowd-marker__name">${place.name}</span>`;
      element.addEventListener("click", () => onSelect?.(place.slug));

      const marker = new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [onSelect, places, selectedSlug]);

  useEffect(() => {
    const map = mapRef.current;
    const selected = places.find((place) => place.slug === selectedSlug);
    if (!map || !selected) return;
    map.easeTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(map.getZoom(), compact ? 13.2 : 12.4),
      duration: 650,
    });
  }, [compact, places, selectedSlug]);

  return <div ref={containerRef} className="crowd-map" aria-label="서울 장소 혼잡도 지도" />;
}
