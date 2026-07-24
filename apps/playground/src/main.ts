import {
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';

import { App } from './app/app';
import { routes } from './app/app.routes';

bootstrapApplication(App, {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Proof that the packages are zoneless-correct: no zone.js here.
    provideZonelessChangeDetection(),
    // Hash routing keeps @dgkit/route-state working on a static file host.
    provideRouter(routes, withHashLocation()),
  ],
}).catch((error: unknown) => {
  console.error(error);
});
