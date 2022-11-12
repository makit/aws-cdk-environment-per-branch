#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StatefulStack } from '../lib/stateful-stack';
import { StatelessStack } from '../lib/stateless-stack';

class GenerateSpeechApp extends cdk.App {
  constructor() {
    super();

    const statefulStack = new StatefulStack(this, 'GenSpeechStatefulStack');

    new StatelessStack(this, "GenSpeechStatelessStack", {
      generatedMp3Bucket: statefulStack.generatedMp3Bucket,
      auditTable: statefulStack.auditTable,
    });
  }
}

new GenerateSpeechApp().synth();
