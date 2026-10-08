// ============================================================
// NOTIFICATIONS - Toast/popup notifications
// ============================================================

class NotificationManager {
    constructor() {
        this.container = null;
        this.queue = [];
        this.isShowing = false;
    }

    /**
     * Create notification container
     */
    createContainer() {
        if (this.container) return;
        
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(this.container);
    }

    /**
     * Show a notification
     */
    show(message, type = 'info', duration = 5000) {
        this.createContainer();

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${this.getBackground(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            font-size: 0.95rem;
            animation: slideIn 0.5s ease;
            border: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        notification.innerHTML = `
            <span style="font-size: 1.3rem;">${this.getIcon(type)}</span>
            <span style="flex:1;">${message}</span>
        `;
        this.container.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.5s ease forwards';
            setTimeout(() => notification.remove(), 500);
        }, duration);

        // Add animation styles if not exists
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    getBackground(type) {
        const types = {
            success: 'linear-gradient(135deg, #43a047, #2e7d32)',
            warning: 'linear-gradient(135deg, #ff6f00, #e65100)',
            error: 'linear-gradient(135deg, #e53935, #b71c1c)',
            info: 'linear-gradient(135deg, #1e88e5, #0d47a1)',
            streak: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            achievement: 'linear-gradient(135deg, #7c4dff, #4a148c)'
        };
        return types[type] || types.info;
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️',
            streak: '🔥',
            achievement: '🏅'
        };
        return icons[type] || '📢';
    }

    /**
     * Show streak notification
     */
    showStreak(streak, bonus, milestone) {
        let message = `🔥 ${streak}-day streak!`;
        if (bonus > 0) {
            message += ` +${bonus} bonus points!`;
        }
        if (milestone) {
            message = `🏆 ${milestone.name}! +${bonus} bonus points!`;
        }
        this.show(message, 'streak', 5000);
    }

    /**
     * Show achievement notification
     */
    showAchievement(name, icon = '🏅') {
        this.show(`${icon} Achievement Unlocked: ${name}!`, 'achievement', 6000);
    }

    /**
     * Show Student of the Week notification
     */
    showStudentOfWeek(name) {
        this.show(`🏆 ${name} is Student of the Week! +100 bonus points!`, 'success', 6000);
    }
}

// Global instance
const notifications = new NotificationManager();