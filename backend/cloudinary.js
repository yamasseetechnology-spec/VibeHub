// =============================================
// VIBEHUB BACKEND - CLOUDINARY
// =============================================
// Handles media uploads for timeline posts
// =============================================

const CLOUDINARY_CLOUD_NAME = CLOUDINARY_CLOUD_NAME || 'dg35zlppj';
const CLOUDINARY_UPLOAD_PRESET = 'vibehub_posts';

async function uploadToCloudinary(file, resourceType = 'image') {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    
    fetch(url, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      resolve({
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        width: data.width,
        height: data.height,
        duration: data.duration
      });
    })
    .catch(error => {
      reject(error);
    });
  });
}

async function uploadImage(file) {
  try {
    const result = await uploadToCloudinary(file, 'image');
    return { url: result.url, error: null };
  } catch (error) {
    return { url: null, error: error.message };
  }
}

async function uploadVideo(file) {
  try {
    const result = await uploadToCloudinary(file, 'video');
    return { url: result.url, error: null };
  } catch (error) {
    return { url: null, error: error.message };
  }
}

async function uploadAudio(file) {
  try {
    const result = await uploadToCloudinary(file, 'video'); // Cloudinary treats audio as video
    return { url: result.url, error: null };
  } catch (error) {
    return { url: null, error: error.message };
  }
}

// Upload from URL
async function uploadFromUrl(imageUrl, resourceType = 'image') {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', imageUrl);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    
    fetch(url, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      resolve({
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format
      });
    })
    .catch(error => {
      reject(error);
    });
  });
}

// Get thumbnail from video
function getVideoThumbnail(videoUrl) {
  // Cloudinary can generate thumbnails
  const publicId = extractPublicId(videoUrl);
  if (!publicId) return null;
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/w_400,h_225,c_fill,so_0/${publicId}.jpg`;
}

// Extract public ID from Cloudinary URL
function extractPublicId(cloudinaryUrl) {
  if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) {
    return null;
  }
  
  const parts = cloudinaryUrl.split('/upload/');
  if (parts.length < 2) return null;
  
  let publicId = parts[1].split('.')[0];
  // Remove any transformations
  publicId = publicId.replace(/^[^/]+\//, '');
  
  return publicId;
}

// Delete media (requires server-side call in production)
async function deleteMedia(publicId) {
  // In production, this would call your backend
  // For now, just log
  console.log('Delete media:', publicId);
  return { success: true };
}

// =============================================
// LINK PREVIEW
// =============================================

async function fetchLinkPreview(url) {
  try {
    // In production, use a serverless function to fetch
    // For now, return basic preview
    return {
      url: url,
      title: '',
      description: '',
      image: ''
    };
  } catch (error) {
    return { url, title: '', description: '', image: '' };
  }
}

// =============================================
// EXPORTS
// =============================================

window.vhCloudinary = {
  uploadImage,
  uploadVideo,
  uploadAudio,
  uploadFromUrl,
  getVideoThumbnail,
  deleteMedia,
  fetchLinkPreview
};
