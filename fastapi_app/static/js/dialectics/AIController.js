import { AIHintAndInsertMixin } from './ai/AIHintAndInsertService.js';
import { AIBlockAnalysisMixin } from './ai/AIBlockAnalysisService.js';
import { AIMathDictationMixin } from './ai/AIMathDictationService.js';

export const AIControllerMixin = {
    ...AIHintAndInsertMixin,
    ...AIBlockAnalysisMixin,
    ...AIMathDictationMixin
};
