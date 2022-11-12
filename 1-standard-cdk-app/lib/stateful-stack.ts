import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

/**
 * This stack contains all resources for the app that hold state.
 * Separated to reduce impact if the stateless resources need dropping and recreating.
 */
export class StatefulStack extends cdk.Stack {

  public readonly generatedMp3Bucket : s3.Bucket;

  public readonly auditTable : dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // All given phrases will be generated and the MP3 output stored here.
    this.generatedMp3Bucket = new s3.Bucket(this, 'GeneratedMp3Bucket');

    // All requests will be logged into a DynamoDb Table
    this.auditTable = new dynamodb.Table(this, 'AuditTable', {
      partitionKey: { name: 'day', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'taskId', type: dynamodb.AttributeType.STRING },
    });
  }
}
