import {
  aws_dynamodb,
  aws_lambda_nodejs,
  aws_stepfunctions,
  aws_stepfunctions_tasks
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { join } from "path";
import { CfnOutput } from "./cfn-output";

export class BranchingLogicE2E extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const dataTable = new aws_dynamodb.Table(this, "DataTable", {
      partitionKey: {
        name: "PK",
        type: aws_dynamodb.AttributeType.STRING
      },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST
    });
    new CfnOutput(this, "BranchingLogicE2eDataTableName", {
      value: dataTable.tableName
    });

    const transformDataStep = new aws_stepfunctions.Pass(
      this,
      "TransformData",
      {
        parameters: {
          firstName: aws_stepfunctions.JsonPath.stringAt("$.firstName"),
          lastName: aws_stepfunctions.JsonPath.stringAt("$.lastName"),
          PK: aws_stepfunctions.JsonPath.stringAt(
            "States.Format('USER#{}', $$.Execution.Id)"
          )
        }
      }
    );

    const backgroundCheckFunction = new aws_lambda_nodejs.NodejsFunction(
      this,
      "BackgroundCheckFunction",
      {
        entry: join(__dirname, "../functions/background-check.ts"),
        handler: "handler"
      }
    );

    const invokeBackgroundCheckFunctionStep =
      new aws_stepfunctions_tasks.LambdaInvoke(this, "BackgroundCheckStep", {
        lambdaFunction: backgroundCheckFunction,
        payloadResponseOnly: true,
        resultPath: "$.backgroundCheck"
      });

    const appendBackgroundCheckErrorStep = new aws_stepfunctions.Pass(
      this,
      "AppendBackgroundCheckError",
      {
        parameters: {
          status: "ERROR"
        },
        resultPath: "$.backgroundCheck"
      }
    );

    const saveUserStep = new aws_stepfunctions_tasks.DynamoPutItem(
      this,
      "SaveTheUser",
      {
        item: {
          firstName: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt("$.firstName")
          ),
          lastName: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt("$.lastName")
          ),
          backgroundCheck:
            aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
              aws_stepfunctions.JsonPath.stringAt("$.backgroundCheck.status")
            ),
          PK: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt("$.PK")
          )
        },
        table: dataTable
      }
    );

    const stepFunctionDefinition = transformDataStep
      .next(
        invokeBackgroundCheckFunctionStep.addCatch(
          appendBackgroundCheckErrorStep.next(saveUserStep),
          {
            resultPath: aws_stepfunctions.JsonPath.DISCARD
          }
        )
      )
      .next(saveUserStep);

    const stepFunction = new aws_stepfunctions.StateMachine(
      this,
      "StepFunction",
      {
        definition: stepFunctionDefinition
      }
    );
    new CfnOutput(this, "BranchingLogicE2eStepFunctionArn", {
      value: stepFunction.stateMachineArn
    });
  }
}
