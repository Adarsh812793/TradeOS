
// Maths for the profile-photo cropper. A "view" describes how the picture sits inside the square crop area:
//   zoom    1 = the picture just covers the square, 4 = four times bigger
//   offsetX / offsetY   where the picture's top-left corner is, in pixels, relative to the square (0 or negative)
// Everything here is plain arithmetic, except renderCroppedAvatar which draws on a canvas.

export const CROP_VIEW_SIZE = 260; // side of the square crop area on screen, in CSS pixels
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const OUTPUT_MAX_SIZE = 512; // the cropped photo is at most 512 x 512 pixels

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Scale at which the picture just covers the crop square (zoom 1)
function getCoverScale(natural, viewSize) {
  return Math.max(viewSize / natural.width, viewSize / natural.height);
}

// Keeps the picture covering the whole square so there is never an empty edge
export function clampOffset(offset, displayedSize, viewSize = CROP_VIEW_SIZE) {
  return clamp(offset, viewSize - displayedSize, 0);
}

// The picture's size on screen for a zoom level: { scale, width, height }
export function getDisplayedSize(zoom, natural, viewSize = CROP_VIEW_SIZE) {
  const scale = getCoverScale(natural, viewSize) * zoom;

  return { scale, width: natural.width * scale, height: natural.height * scale };
}

// Starting view: zoom 1, picture centred
export function createInitialView(natural, viewSize = CROP_VIEW_SIZE) {
  const { width, height } = getDisplayedSize(1, natural, viewSize);

  return {
    zoom: 1,
    offsetX: (viewSize - width) / 2,
    offsetY: (viewSize - height) / 2,
  };
}

// Moves the picture by (dx, dy) pixels, never letting an edge come into view
export function moveView(view, dx, dy, natural, viewSize = CROP_VIEW_SIZE) {
  const { width, height } = getDisplayedSize(view.zoom, natural, viewSize);

  return {
    ...view,
    offsetX: clampOffset(view.offsetX + dx, width, viewSize),
    offsetY: clampOffset(view.offsetY + dy, height, viewSize),
  };
}

// Changes the zoom while keeping the same point of the picture in the middle of the square
export function zoomView(view, nextZoom, natural, viewSize = CROP_VIEW_SIZE) {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

  const current = getDisplayedSize(view.zoom, natural, viewSize);
  const next = getDisplayedSize(zoom, natural, viewSize);

  // The spot of the original picture (in its own pixels) currently under the middle of the square
  const centerX = (viewSize / 2 - view.offsetX) / current.scale;
  const centerY = (viewSize / 2 - view.offsetY) / current.scale;

  return {
    zoom,
    offsetX: clampOffset(viewSize / 2 - centerX * next.scale, next.width, viewSize),
    offsetY: clampOffset(viewSize / 2 - centerY * next.scale, next.height, viewSize),
  };
}

// The part of the ORIGINAL picture that is inside the square: { x, y, size } in original pixels
export function getCropRect(view, natural, viewSize = CROP_VIEW_SIZE) {
  const { scale } = getDisplayedSize(view.zoom, natural, viewSize);
  const size = Math.min(viewSize / scale, natural.width, natural.height);

  return {
    x: clamp(-view.offsetX / scale, 0, natural.width - size),
    y: clamp(-view.offsetY / scale, 0, natural.height - size),
    size,
  };
}

// Draws the chosen part of the loaded <img> onto a canvas and returns it as a JPEG File ("avatar.jpg").
// Transparent areas become white, and the photo is never enlarged beyond its real pixels.
export function renderCroppedAvatar(image, rect) {
  const outputSize = Math.max(1, Math.min(OUTPUT_MAX_SIZE, Math.round(rect.size)));

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputSize, outputSize);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, rect.x, rect.y, rect.size, rect.size, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not prepare the cropped photo."));
          return;
        }

        resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  });
}
