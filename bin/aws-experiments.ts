#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ECSExecViaCDKStack } from '../lib/ecs-exec-cdk-stack';

const app = new cdk.App();
new ECSExecViaCDKStack(app, 'ECSExecViaCDKStack', {});