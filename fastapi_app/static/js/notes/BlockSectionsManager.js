import ModalsController from './ModalsController.js';

class BlockSectionsManager {
    static init() {
        console.log('BlockSectionsManager Initialized');
    }

    static handleAddSection(app, index) {
        ModalsController.showSectionTitleModal(app, '', (title) => {
            if (title && title.trim().length > 0) {
                app.constructor.addNewBlock('center', index, 'section', title.trim());
            }
        });
    }
}

export default BlockSectionsManager;
