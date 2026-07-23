/**
 * Vitest test bootstrap. Sets up zone.js (via Analog), enables zone-based change
 * detection and initializes the Angular `TestBed` environment with the browser
 * testing platform.
 */
import '@analogjs/vitest-angular/setup-zone';

import { NgModule, provideZoneChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

@NgModule({ providers: [provideZoneChangeDetection()] })
class ZoneChangeDetectionModule {}

getTestBed().initTestEnvironment(
  [BrowserTestingModule, ZoneChangeDetectionModule],
  platformBrowserTesting(),
);
