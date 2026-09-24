import Lifecycle from './Lifecycle.js';

// Accumulate active editing time; autosaves never reset this clock.
class SessionCheckpoints {
    constructor({getNote, save, checkpoint, now = () => Date.now(), interval = 900_000,
        idleAfter = 60_000, events = document}) {
        Object.assign(this, {getNote, save, checkpoint, now, interval, idleAfter, events});
        this.lifecycle = new Lifecycle();
        this.reset();
    }

    reset() {
        this.note = this.getNote();
        this.activeMs = 0;
        this.lastTick = this.now();
        this.lastActivity = -Infinity;
        this.changed = false;
        this.activity = 0;
    }

    mount() {
        if (this.mounted) return;
        this.mounted = true;
        this.lifecycle.on(this.events, 'noteOpened', () => this.reset());
        this.lifecycle.on(this.events, 'stateDirty', () => {
            this.tick();
            this.lastActivity = this.now();
            this.changed = true;
            this.activity++;
        });
        this.lifecycle.on(this.events, 'editingActivity', () => {
            this.tick();
            this.lastActivity = this.now();
        });
        this.lifecycle.interval(() => this.tick(), 10_000);
    }

    tick() {
        const now = this.now();
        const activeUntil = Math.min(now, this.lastActivity + this.idleAfter);
        this.activeMs += Math.max(0, activeUntil - this.lastTick);
        this.lastTick = now;
        if (!this.pending && this.changed && this.activeMs >= this.interval) this.flush();
    }

    async flush() {
        const note = this.note;
        const activity = this.activity;
        const activeMs = this.activeMs;
        this.pending = true;
        try {
            const saved = await this.save();
            if (this.lifecycle.disposed || this.note !== note || this.getNote() !== note) return;
            if (!saved.id) return;
            await this.checkpoint(saved);
            if (this.note === note) {
                this.activeMs = Math.max(0, this.activeMs - activeMs);
                this.changed = this.activity !== activity;
            }
        } catch (error) {
            console.error('Session checkpoint failed', error);
        } finally {
            this.pending = false;
        }
    }

    dispose() { this.lifecycle.dispose(); }
}

export default SessionCheckpoints;
