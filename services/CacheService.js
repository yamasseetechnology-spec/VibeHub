/**
 * VIBEHUB CACHE SERVICE
 * Handles Redis Rate Limiting (Upstash)
 */

export class CacheService {
    constructor() {
        this.cache = new Map();
        this.redisUrl = import.meta.env.VITE_UPSTASH_REDIS_URL;
        this.redisToken = import.meta.env.VITE_UPSTASH_REDIS_TOKEN;
        this.enabled = !!(this.redisUrl && this.redisToken);
    }

    async get(key) {
        if (!this.enabled) return null;
        try {
            const response = await fetch(`${this.redisUrl}/get/${key}`, {
                headers: { 'Authorization': `Bearer ${this.redisToken}` }
            });
            const data = await response.json();
            return data.result;
        } catch (e) {
            console.warn('Redis get error:', e);
            return null;
        }
    }

    async set(key, value, ttl = 3600) {
        if (!this.enabled) return null;
        try {
            await fetch(`${this.redisUrl}/set/${key}/${value}`, {
                headers: { 'Authorization': `Bearer ${this.redisToken}` }
            });
        } catch (e) {
            console.warn('Redis set error:', e);
        }
    }

    async increment(key, ttl = 60) {
        if (!this.enabled) {
            return this.localIncrement(key, ttl);
        }
        try {
            const response = await fetch(`${this.redisUrl}/incr/${key}`, {
                headers: { 'Authorization': `Bearer ${this.redisToken}` }
            });
            const data = await response.json();
            return data.result;
        } catch (e) {
            console.warn('Redis incr error:', e);
            return this.localIncrement(key, ttl);
        }
    }

    localIncrement(key, ttl) {
        const storageKey = `rate_${key}`;
        const now = Date.now();
        const data = JSON.parse(localStorage.getItem(storageKey) || '{"count":0,"resetAt":0}');
        
        if (now > data.resetAt) {
            data.count = 1;
            data.resetAt = now + (ttl * 1000);
        } else {
            data.count++;
        }
        
        localStorage.setItem(storageKey, JSON.stringify(data));
        return data.count;
    }

    async checkRateLimit(userId, action, limits) {
        const key = `${userId}:${action}`;
        const current = await this.increment(key, 60);
        return current <= limits;
    }

    async cachePosts(key, posts, ttl = 30) {
        if (!this.enabled) return;
        try {
            await fetch(`${this.redisUrl}/setex/${key}/${ttl}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${this.redisToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(posts)
            });
        } catch (e) {
            console.warn('Cache posts error:', e);
        }
    }

    async getCachedPosts(key) {
        if (!this.enabled) return null;
        try {
            const response = await fetch(`${this.redisUrl}/get/${key}`, {
                headers: { 'Authorization': `Bearer ${this.redisToken}` }
            });
            const data = await response.json();
            return data.result;
        } catch (e) {
            return null;
        }
    }

    async clearPostsCache() {
        if (!this.enabled) return;
        try {
            const commonKeys = [
                'posts_all_all', 
                'posts_trending_all', 
                'posts_vibeline_all',
                'posts_latest_all'
            ];
            
            for (const key of commonKeys) {
                await fetch(`${this.redisUrl}/del/${key}`, {
                    headers: { 'Authorization': `Bearer ${this.redisToken}` }
                });
            }
            console.log('✨ Global post cache invalidated');
        } catch (e) {
            console.warn('Cache clear error:', e);
        }
    }
}
