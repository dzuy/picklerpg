/** App composition root: use the generated guided pattern as the default provider. */
import {RallyEngine} from './engine/rally-engine';
import {generatedPressure} from './scenarios/generated-pressure';
import type {RallyProvider} from './engine/model';
export * from './engine/model';
export {RallyEngine, classifyStage, sampleLeg} from './engine/rally-engine';
export {RALLY} from './scenarios/pressure-middle';
export class Simulation extends RallyEngine {
 constructor(provider:RallyProvider=generatedPressure){super(provider)}
}
