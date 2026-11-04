
// The photo is cropped and shrunk in the browser before it is sent, so the file a person picks can be
// much bigger than what the server accepts. The server limit (2 MB) applies to the cropped result.
export const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB, the photo chosen from the computer
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB, the cropped photo sent to the server (same as the server)
export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Value for the file input's `accept` attribute
export const AVATAR_ACCEPT = ALLOWED_AVATAR_TYPES.join(",");

// Quick check of the photo chosen from the computer, before the crop dialog opens.
// Returns an error message, or "" when the file is fine.
export function validateAvatarFile(file) {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return "Please choose a JPG, PNG or WebP image.";
  }

  if (file.size === 0) {
    return "That file is empty. Please choose another image.";
  }

  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    // Round up so a file just over the limit never reads "10.0 MB"
    const sizeInMb = (Math.ceil((file.size / (1024 * 1024)) * 10) / 10).toFixed(1);
    return `That image is ${sizeInMb} MB. The maximum size is 10 MB.`;
  }

  return "";
}

// Check of the cropped photo just before it is uploaded (the server checks again, including the real content)
export function validateCroppedAvatar(file) {
  if (file.size > MAX_UPLOAD_BYTES) {
    return "The cropped photo is still too large. Please choose a smaller image.";
  }

  return "";
}
