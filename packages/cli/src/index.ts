#!/usr/bin/env node

import { runMain } from 'citty';
import { main } from './commands.js';

void runMain(main);
