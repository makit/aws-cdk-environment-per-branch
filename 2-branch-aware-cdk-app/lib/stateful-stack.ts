import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface StatefulStackParams extends cdk.StackProps {
  destroyOnRemove: boolean;
}

/**
 * This stack contains all resources for the app that hold state.
 * Separated to reduce impact if the stateless resources need dropping and recreating.
 */
export class StatefulStack extends cdk.Stack {

  public readonly generatedMp3Bucket : s3.Bucket;

  public readonly auditTable : dynamodb.Table;

  constructor(scope: Construct, id: string, props: StatefulStackParams) {
    super(scope, id, props);

    // We now will destroy the bucket and DB, plus all contents if the stack is deleted depending on the
    // input - meaning we can fully destroy branch environments.
    const removalPolicy = props.destroyOnRemove 
      ? cdk.RemovalPolicy.DESTROY 
      : cdk.RemovalPolicy.RETAIN;

    // All given phrases will be generated and the MP3 output stored here.
    this.generatedMp3Bucket = new s3.Bucket(this, "GeneratedMp3Bucket", {
      removalPolicy,

      // This needs enabling too, which will create a Lambda to wipe the bucket before deletion
      autoDeleteObjects: props.destroyOnRemove, 
    });

    // All requests will be logged into a DynamoDb Table
    this.auditTable = new dynamodb.Table(this, 'AuditTable', {
      partitionKey: { name: 'day', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'taskId', type: dynamodb.AttributeType.STRING },
      removalPolicy,
    });
  }
}
