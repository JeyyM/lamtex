import React from 'react';
import { getGoogleMapsApiKey, googleMapsEmbedViewUrl, canShowGoogleMapEmbed } from '@/src/lib/maps';

type Props = {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
  title?: string;
};

export function GoogleMapEmbed({ lat, lng, zoom = 15, className = '', title = 'Map preview' }: Props) {
  const apiKey = getGoogleMapsApiKey();
  const src = canShowGoogleMapEmbed(apiKey, lat, lng) ? googleMapsEmbedViewUrl(lat, lng, zoom, apiKey) : '';

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600 ${className}`}
      >
        Add <code className="mx-1 rounded bg-gray-200 px-1">VITE_GOOGLE_MAPS_API_KEY</code> and enable the
        <strong className="font-medium"> Maps Embed API </strong>
        in Google Cloud Console to show the live map.
      </div>
    );
  }

  return (
    <iframe
      title={title}
      className={`h-64 w-full rounded-lg border border-gray-200 ${className}`}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
      src={src}
    />
  );
}
