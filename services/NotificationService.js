/**
 * VIBEHUB NOTIFICATION SERVICE
 * Handles Firebase Push Notifications
 */

export class NotificationService {
    constructor() {
        this.token = null;
        this.enabled = !!(window.firebaseApp);
        this.messaging = null;
    }

    async initMessaging() {
        if (!this.enabled || this.messaging) return;
        
        try {
            if (window.messaging) {
                this.messaging = window.messaging;
            } else if (window.firebaseApp) {
                const { getMessaging } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');
                this.messaging = getMessaging(window.firebaseApp);
            }
        } catch (error) {
            console.warn('Firebase messaging init failed:', error);
        }
    }

    async requestPermission() {
        await this.initMessaging();
        
        if (!this.enabled) {
            console.log('Firebase not available, using browser notifications');
            return await this.requestBrowserPermission();
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted' && this.messaging) {
                const { getToken } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');
                this.token = await getToken(this.messaging, {
                    vapidKey: 'BHS3p1acoPbQ_Rt6x-Rjbrv4jiJgFiYhrXLU46xxJ080kjKWzwzTDE0IP_92QEJ2ySB3A2kg5t9tjJdaqjBgIig'
                });
                console.log('Firebase notification token:', this.token);
                return this.token;
            }
        } catch (error) {
            console.error('Firebase notification error:', error);
            return await this.requestBrowserPermission();
        }
    }

    async requestBrowserPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    async sendLocalNotification(title, body, icon) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: icon || 'https://i.ibb.co/Fqnj3JKp/1000001392.png',
                badge: 'https://i.ibb.co/Fqnj3JKp/1000001392.png'
            });
        }
    }

    async notifyLike(postAuthor, likerName) {
        await this.sendLocalNotification(
            'New Like! 💜',
            `${likerName} liked your vibe!`,
            'https://i.ibb.co/Fqnj3JKp/1000001392.png'
        );
    }

    async notifyComment(postAuthor, commenterName, comment) {
        await this.sendLocalNotification(
            'New Comment! 💬',
            `${commenterName}: ${comment.substring(0, 50)}...`,
            'https://i.ibb.co/Fqnj3JKp/1000001392.png'
        );
    }

    async notifyFollow(followerName, userName) {
        await this.sendLocalNotification(
            'New Follower! ✨',
            `${followerName} is now following you!`,
            'https://i.ibb.co/Fqnj3JKp/1000001392.png'
        );
    }
}
