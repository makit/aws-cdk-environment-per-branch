import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';

/**
 * This stack contains all common notification resources.
 */
export class NotificationStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Moved here from the stateless stack because this resource was chosen as something that should exist for
    // all branches. A good example of resources this is suitable for is a VPC.
    const notificationTopic = new sns.Topic(this, 'CompletedNotification');

    // Output the Topic ARN so it can be used as an import in the branch based stacks
    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: notificationTopic.topicArn,
      exportName: `NotificationTopicArn`,
    });
  }
}
