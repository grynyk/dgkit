/**
 * Jest test bootstrap. `setupZoneTestEnv` from jest-preset-angular wires up
 * zone.js and initializes the Angular `TestBed` environment.
 */
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();
