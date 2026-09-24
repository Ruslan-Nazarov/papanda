// Ownership of listeners, timers and disposable widgets for one mounted surface.
class Lifecycle {
    #cleanups = [];
    disposed = false;

    own(cleanup) {
        if (this.disposed) cleanup();
        else this.#cleanups.push(cleanup);
        return cleanup;
    }

    on(target, event, listener, options) {
        if (!target) return;
        target.addEventListener(event, listener, options);
        this.own(() => target.removeEventListener(event, listener, options));
    }

    timeout(callback, delay) {
        const id = setTimeout(() => {if (!this.disposed) callback();}, delay);
        this.own(() => clearTimeout(id));
        return id;
    }

    interval(callback, delay) {
        const id = setInterval(() => {if (!this.disposed) callback();}, delay);
        this.own(() => clearInterval(id));
        return id;
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        for (const cleanup of this.#cleanups.splice(0).reverse()) {
            try {cleanup();} catch (error) {console.error('Dispose failed', error);}
        }
    }
}

export default Lifecycle;
