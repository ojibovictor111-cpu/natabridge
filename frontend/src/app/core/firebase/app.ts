import { initializeApp } from 'firebase/app';
import { Environment } from '../../environment/environment';

const app = initializeApp(Environment.firebase);

export { app };
