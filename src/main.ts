import { bootstrapApplication } from '@angular/platform-browser';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import { appConfig } from './app/app.config';

Amplify.configure(outputs);

// Load services only after Amplify is configured. Several of them create an
// AppSync client at module evaluation time.
import('./app/app.component').then(({ AppComponent }) =>
  bootstrapApplication(AppComponent, appConfig)
)
  .catch((err) => console.error(err));
