/** Teardrop body path in 24×24 coordinates (Material-style). */
const BLUE_PIN_SVG_PATH =
  'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z';

/**
 * Customer location marker: blue pin with white rim + center dot.
 * Call only after the Maps JavaScript API has loaded (`loadGoogleMapsJs()`), since it uses `google.maps.Size` / `Point`.
 */
export function blueCustomerPinIcon(): google.maps.Icon {
  const pad = 2;
  const vbMin = -pad;
  const vbSize = 24 + pad * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbMin} ${vbMin} ${vbSize} ${vbSize}" width="${vbSize}" height="${vbSize}">
  <path d="${BLUE_PIN_SVG_PATH}"
    fill="#2563eb" stroke="#ffffff" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="12" cy="9.25" r="3.15" fill="#ffffff"/>
</svg>`;
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  const px = 52;
  const scale = px / vbSize;
  const tipX = (12 - vbMin) * scale;
  const tipY = (22 - vbMin) * scale;
  /** Center of the white inner circle (SVG cx/cy), for label placement in scaled pixels. */
  const labelX = (12 - vbMin) * scale;
  const labelY = (9.25 - vbMin) * scale;
  return {
    url,
    scaledSize: new google.maps.Size(px, px),
    anchor: new google.maps.Point(Math.round(tipX), Math.round(tipY)),
    labelOrigin: new google.maps.Point(Math.round(labelX), Math.round(labelY)),
  };
}
