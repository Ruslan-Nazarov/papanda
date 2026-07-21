/**
 * DialecticsLogger.js - Централизованный сервис отладки и логирования для холста Диалектики
 */
export const DialecticsLogger = {
    isEnabled() {
        return false;
    },

    enable() {
        try {
            localStorage.setItem('DIALECTICS_DEBUG', 'true');
            window.DIALECTICS_DEBUG = true;
            console.log('%c[DialecticsLogger] Отладка включена. Все события редакторов и блоков будут логироваться.', 'color: #10b981; font-weight: bold;');
        } catch(e) {}
    },

    disable() {
        try {
            localStorage.removeItem('DIALECTICS_DEBUG');
            window.DIALECTICS_DEBUG = false;
            console.log('%c[DialecticsLogger] Отладка отключена.', 'color: #64748b; font-weight: bold;');
        } catch(e) {}
    },

    formatMessage(level, subsystem, message) {
        const timestamp = new Date().toLocaleTimeString('ru-RU', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `[${timestamp}] [${subsystem}] (${level}) ${message}`;
    },

    log(subsystem, message, data = undefined) {
        if (!this.isEnabled()) return;
        const formatted = this.formatMessage('DEBUG', subsystem, message);
        if (data !== undefined) {
            console.log(`%c${formatted}`, 'color: #3b82f6; font-weight: 500;', data);
        } else {
            console.log(`%c${formatted}`, 'color: #3b82f6; font-weight: 500;');
        }
    },

    info(subsystem, message, data = undefined) {
        if (!this.isEnabled()) return;
        const formatted = this.formatMessage('INFO', subsystem, message);
        if (data !== undefined) {
            console.info(`%c${formatted}`, 'color: #0d9488; font-weight: 600;', data);
        } else {
            console.info(`%c${formatted}`, 'color: #0d9488; font-weight: 600;');
        }
    },

    warn(subsystem, message, data = undefined) {
        const formatted = this.formatMessage('WARN', subsystem, message);
        if (data !== undefined) {
            console.warn(`%c${formatted}`, 'color: #f59e0b; font-weight: 700;', data);
        } else {
            console.warn(`%c${formatted}`, 'color: #f59e0b; font-weight: 700;');
        }
    },

    error(subsystem, message, data = undefined) {
        const formatted = this.formatMessage('ERROR', subsystem, message);
        if (data !== undefined) {
            console.error(`%c${formatted}`, 'color: #ef4444; font-weight: 800;', data);
        } else {
            console.error(`%c${formatted}`, 'color: #ef4444; font-weight: 800;');
        }
        if (window.logDebugWindow) {
            try { window.logDebugWindow(`❌ [${subsystem}] ${message}`, data !== undefined ? (typeof data === 'object' ? data : String(data)) : null); } catch(e) {}
        }
    },

    debug(subsystem, message, data = undefined) {
        if (!this.isEnabled()) return;
        const formatted = this.formatMessage('DEBUG', subsystem, message);
        if (data !== undefined) {
            console.log(`%c${formatted}`, 'color: #94a3b8;', data);
        } else {
            console.log(`%c${formatted}`, 'color: #94a3b8;');
        }
    }
};

window.DialecticsLogger = DialecticsLogger;
