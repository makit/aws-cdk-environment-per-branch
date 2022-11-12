#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StatefulStack } from '../lib/stateful-stack';
import { StatelessStack } from '../lib/stateless-stack';

const TRUNK_BRANCH_NAME = 'main'; // main or master

class GenerateSpeechApp extends cdk.App {
  constructor() {
    super();

    // First - Read in the branch from a context parameter
    const branch = this.node.tryGetContext('branch');
    if (!branch) {
      throw new Error('Branch is required!');
    }

    // Second - Dynamically name the stacks from the name of the branch
    const statefulStack = new StatefulStack(
      this,
      `${branch}-GenSpeechStatefulStack`,
      {
        // Third - Pass in a param to allow full removal of stateful resources if on a feature branch
        destroyOnRemove: branch.toLowerCase() !== TRUNK_BRANCH_NAME,
      }
    );

    const statelessStack = new StatelessStack(this, `${branch}-GenSpeechStatelessStack`, {
      generatedMp3Bucket: statefulStack.generatedMp3Bucket,
      auditTable: statefulStack.auditTable,
      branch, // Have to pass in branch name because it has resources that we want to name to match branch (Optional)
    });

    // Helpful - Add tags to the Stacks, so that they are added to all resources
    cdk.Tags.of(statefulStack).add('Branch', branch);
    cdk.Tags.of(statelessStack).add('Branch', branch);
  }
}

new GenerateSpeechApp().synth();
