/**
 * VIBEHUB MEDIA SERVICE
 * Handles Cloudinary (Videos) + ImageKit (Photos)
 */

export class MediaService {
    constructor() {
        this.cloudinaryConfig = { cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME };
        this.cloudinaryReady = !!window.cloudinary;
        
        // ImageKit Initialization
        this.imagekitConfig = {
            publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
            urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT,
        };
        this.imagekit = null;
        this.init();
    }

    init() {
        if (!this.cloudinaryReady) {
            const checkCloudinary = setInterval(() => {
                if (window.cloudinary) {
                    this.cloudinaryReady = true;
                    clearInterval(checkCloudinary);
                }
            }, 500);
            setTimeout(() => clearInterval(checkCloudinary), 10000);
        }

        // Initialize ImageKit instance if SDK is available
        if (window.ImageKit) {
            try {
                let IK = window.ImageKit;
                if (typeof IK !== 'function' && IK.default) IK = IK.default;
                if (typeof IK !== 'function' && IK.ImageKit) IK = IK.ImageKit;
                if (typeof IK !== 'function' && window.ImageKit && typeof window.ImageKit === 'function') IK = window.ImageKit;

                if (typeof IK === 'function') {
                    this.imagekit = new IK({
                        publicKey: this.imagekitConfig.publicKey,
                        urlEndpoint: this.imagekitConfig.urlEndpoint
                    });
                    console.log('✅ ImageKit SDK initialized');
                } else {
                    console.error('❌ ImageKit found but class constructor not found. IK Type:', typeof IK, 'window.ImageKit type:', typeof window.ImageKit);
                }
            } catch (e) {
                console.error('❌ ImageKit initialization error:', e);
            }
        } else {
            console.warn('⚠️ ImageKit SDK not found in window');
        }
    }

    async uploadImage(file, folder = 'vibehub-media') {
        if (!file) return null;
        console.log('🚀 Initiating Vibe Media Upload Workflow...');
        
        if (this.imagekit) {
            try {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = async () => {
                        const base64 = reader.result.split(',')[1];
                        this.imagekit.upload({
                            file: base64,
                            fileName: file.name || `vibe_${Date.now()}.jpg`,
                            folder: folder,
                            tags: ["vibehub", "user-content"]
                        }, (err, result) => {
                            if (err) {
                                console.warn('⚠️ ImageKit upload failed, falling back to Cloudinary');
                                this.uploadToCloudinary(file, 'vibehub_images').then(resolve).catch(reject);
                            } else {
                                console.log('✅ ImageKit upload successful:', result.url);
                                resolve({
                                    url: this.getOptimizedImageUrl(result.url),
                                    thumbnailUrl: result.thumbnailUrl,
                                    fileId: result.fileId,
                                    type: 'image',
                                    provider: 'imagekit'
                                });
                            }
                        });
                    };
                    reader.onerror = (e) => reject(e);
                });
            } catch (error) {
                console.error('❌ ImageKit flow error:', error);
            }
        }

        console.log('☁️ Falling back to default Cloudinary upload...');
        const cloudResult = await this.uploadToCloudinary(file, 'vibehub_images');
        if (cloudResult) {
            cloudResult.url = this.getOptimizedImageUrl(cloudResult.url);
        }
        return cloudResult;
    }

    async uploadToCloudinary(file, preset) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', preset);
            formData.append('cloud_name', this.cloudinaryConfig.cloudName);
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error(`Cloudinary upload failed: ${response.statusText}`);
            
            const data = await response.json();
            return {
                url: data.secure_url,
                thumbnailUrl: data.secure_url.replace('/upload/', '/upload/w_400,c_fill/'),
                fileId: data.public_id,
                type: 'image'
            };
        } catch (error) {
            console.error('Cloudinary helper error:', error);
            return await this.createLocalPreview(file);
        }
    }

    async uploadVideo(file) {
        if (!file) return null;
        console.log('Uploading video to Cloudinary...');
        
        const video = document.createElement('video');
        video.preload = 'metadata';
        const durationPromise = new Promise((resolve) => {
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };
        });
        video.src = URL.createObjectURL(file);
        const duration = await durationPromise;
        
        if (duration > 30.5) {
            console.warn(`Video too long: ${duration.toFixed(1)}s. Limiting to 30s.`);
            return { error: 'duration_limit', message: 'Videos are capped at 30 seconds.' };
        }
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'vibehub_videos');
            formData.append('cloud_name', this.cloudinaryConfig.cloudName);
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/video/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Cloudinary video upload failed');
            
            const data = await response.json();
            console.log('Video uploaded to Cloudinary:', data);
            
            return {
                url: data.secure_url,
                thumbnailUrl: data.secure_url.replace('/video/', '/video/so_0,w_400,h_225,c_fill/'),
                fileId: data.public_id,
                duration: data.duration,
                type: 'video'
            };
        } catch (error) {
            console.error('Cloudinary video upload error:', error);
            return await this.createLocalPreview(file);
        }
    }

    createLocalPreview(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    url: e.target.result,
                    thumbnailUrl: e.target.result,
                    fileId: null,
                    type: file.type.includes('video') ? 'video' : 'image',
                    isLocal: true
                });
            };
            reader.readAsDataURL(file);
        });
    }

    getOptimizedImageUrl(url, width = 800) {
        if (!url) return '';
        
        if (url.includes('ik.imagekit.io')) {
            if (url.includes('?tr=')) return url;
            return `${url}?tr=w-${width},q-80,f-auto`;
        }

        if (url.includes('cloudinary.com')) {
            const ikEndpoint = this.imagekitConfig.urlEndpoint.replace(/\/$/, '');
            if (!url.includes('tr:')) {
                return `${ikEndpoint}/tr:w-${width},q-80,f-auto/${url}`;
            }
        }
        
        return url;
    }

    getVideoThumbnail(url) {
        if (!url) return '';
        if (url.includes('cloudinary.com')) {
            return url.replace('/video/', '/video/so_0,w_400,h_225,c_fill/').replace('.mp4', '.jpg');
        }
        return url;
    }
}
