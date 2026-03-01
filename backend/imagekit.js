// =============================================
// VIBEHUB BACKEND - IMAGEKIT
// =============================================
// Handles profile media uploads (avatar, banner)
// =============================================

const IMAGEKIT_URL_ENDPOINT = IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/ake25lwhq';
const IMAGEKIT_PUBLIC_KEY = IMAGEKIT_PUBLIC_KEY || 'public_MImYpMzXVx4PGa/mecXw6V3tw90=';

// Generate signature for secure uploads (requires server-side)
async function getImageKitSignature() {
  // In production, call your backend to generate signature
  // For demo, we'll use the public API with the public key
  return {
    token: '',
    signature: '',
    expire: '',
    publicKey: IMAGEKIT_PUBLIC_KEY
  };
}

// Upload to ImageKit using their upload API
async function uploadToImageKit(file, fileName, options = {}) {
  return new Promise((resolve, reject) => {
    // For browser-based upload, we need to use their SDK or signed uploads
    // Here we'll use a simple approach with FormData
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
    
    // Add tags
    if (options.tags) {
      formData.append('tags', options.tags.join(','));
    }
    
    // Use the upload API endpoint
    fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData
      // Note: This requires authentication in production
    })
    .then(response => response.json())
    .then(data => {
      resolve({
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        fileId: data.fileId,
        name: data.name
      });
    })
    .catch(error => {
      // Fallback: Use base64 for demo
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result,
          thumbnailUrl: reader.result,
          fileId: '',
          name: fileName,
          isBase64: true
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  });
}

// Upload avatar image
async function uploadAvatar(file, userId) {
  const fileName = `avatar_${userId}_${Date.now()}.jpg`;
  
  try {
    const result = await uploadToImageKit(file, fileName, {
      tags: ['avatar', 'profile', userId]
    });
    return { url: result.url, error: null };
  } catch (error) {
    return { url: null, error: error.message };
  }
}

// Upload banner image
async function uploadBanner(file, userId) {
  const fileName = `banner_${userId}_${Date.now()}.jpg`;
  
  try {
    const result = await uploadToImageKit(file, fileName, {
      tags: ['banner', 'profile', userId]
    });
    return { url: result.url, error: null };
  } catch (error) {
    return { url: null, error: error.message };
  }
}

// Simple base64 upload (works without API keys)
async function uploadImageBase64(base64Data, fileName) {
  // For demo purposes - store as data URL
  return {
    url: base64Data,
    error: null
  };
}

// Get profile image URL with transformations
function getProfileImageUrl(url, width = 200, height = 200) {
  if (!url) return getDefaultAvatar();
  
  // If using ImageKit
  if (url.includes('imagekit.io')) {
    return `${url}?tr=w-${width},h-${height},c_fill`;
  }
  
  // If base64, return as-is
  if (url.startsWith('data:')) {
    return url;
  }
  
  return url;
}

// Get banner URL with transformations
function getBannerUrl(url, width = 1200, height = 400) {
  if (!url) return '';
  
  // If using ImageKit
  if (url.includes('imagekit.io')) {
    return `${url}?tr=w-${width},h-${height},c_fill`;
  }
  
  return url;
}

// Generate default avatar
function getDefaultAvatar() {
  return ''; // Will use CSS gradient in UI
}

// =============================================
// EXPORTS
// =============================================

window.vhImageKit = {
  uploadAvatar,
  uploadBanner,
  uploadImageBase64,
  getProfileImageUrl,
  getBannerUrl,
  getDefaultAvatar,
  uploadToImageKit
};
