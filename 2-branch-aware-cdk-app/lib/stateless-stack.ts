import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sns from 'aws-cdk-lib/aws-sns';

export interface StatelessStackProps extends cdk.StackProps {
  generatedMp3Bucket : s3.Bucket;
  auditTable : dynamodb.Table;
  branch: string;
}

/**
 * This stack contains all resources for the app that do not hold state.
 * Separated from stateful to reduce impact if the resources need dropping and recreating.
 */
export class StatelessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StatelessStackProps) {
    super(scope, id, props);

    // The step function will hit Polly for each phrase and log each generation into DynamoDB
    const synthesiserStateMachine = this.createSynthesiserStepFunction(props);

    props.generatedMp3Bucket.grantPut(synthesiserStateMachine);

    // Create an API that is backed by the Step Function as a way to execute it directly
    // Pass in the branch name to the ID so the generated name has it in - this is optional but helpful
    new apigateway.StepFunctionsRestApi(this, `SynthRestApi-${props.branch}`, {
      deploy: true,
      stateMachine: synthesiserStateMachine,
    });
  }

  private createSynthesiserStepFunction(props: StatelessStackProps) {

    // Run Polly for every phrase, up to 5 max concurrency
    const phraseIterator = new stepfunctions.Map(this, 'Phrase Iterator', {
      maxConcurrency: 5,
      itemsPath: '$.body.phrases',
    });

    // Hit Polly direct to generate a MP3 into S3
    const synthesise = new tasks.CallAwsService(this, 'Start Speech Synthesis Task', {
      service: 'polly',
      action: 'startSpeechSynthesisTask',
      parameters: {
        "OutputFormat": "mp3",
        "OutputS3BucketName": props.generatedMp3Bucket.bucketName,
        "Text.$": "$",
        "VoiceId": 'Joey'
      },
      iamResources: ['*'],
    });

    // Insert an Audit log, pull the day from the execution time using Intrinsic Functions
    const insertToDynamo = new tasks.DynamoPutItem(this, 'Insert To Audit', {
      item: {
        day: tasks.DynamoAttributeValue.fromString(stepfunctions.JsonPath.arrayGetItem(stepfunctions.JsonPath.stringSplit(stepfunctions.JsonPath.stringAt('$$.Execution.StartTime'), 'T'), 0)),
        taskId: tasks.DynamoAttributeValue.fromString(stepfunctions.JsonPath.stringAt('$.SynthesisTask.TaskId')),
        outputUri: tasks.DynamoAttributeValue.fromString(stepfunctions.JsonPath.stringAt('$.SynthesisTask.OutputUri')),
      },
      table: props.auditTable,
    });

    // Import the topic from the single common stack on this account
    const notificationTopic = sns.Topic.fromTopicArn(this, 'CompletedNotification', cdk.Fn.importValue('NotificationTopicArn'));

    const sendNotification = new tasks.SnsPublish(this, 'Send Notification', {
      topic: notificationTopic,
      message: stepfunctions.TaskInput.fromJsonPathAt('$'),
    });

    const stateMachineDefinition = phraseIterator.iterator(synthesise.next(insertToDynamo)).next(sendNotification);

    return new stepfunctions.StateMachine(this, `PhraseSynthesiser`, {
      // Set the name to match the branch - this is optional but helpful
      stateMachineName: `PhraseSynthesiser-${props.branch}`,
      definition: stateMachineDefinition,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
    });
  }
}
