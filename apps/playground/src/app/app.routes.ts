import type { Routes } from '@angular/router';

import { PlaygroundPage } from './playground-page';

export const routes: Routes = [
  // A real route so @dgkit/route-state has an ActivatedRoute to read/write.
  { path: '', component: PlaygroundPage },
];
