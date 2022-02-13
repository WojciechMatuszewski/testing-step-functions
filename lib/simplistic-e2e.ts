import {
  aws_dynamodb,
  aws_stepfunctions,
  aws_stepfunctions_tasks
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { CfnOutput } from "./cfn-output";

export class SimplisticE2E extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const dataTable = new aws_dynamodb.Table(this, "DataTable", {
      partitionKey: {
        name: "PK",
        type: aws_dynamodb.AttributeType.STRING
      },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST
    });
    new CfnOutput(this, "SimplisticE2eDataTableName", {
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
          PK: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(
            aws_stepfunctions.JsonPath.stringAt("$.PK")
          )
        },
        table: dataTable
      }
    );

    const stepFunctionDefinition = transformDataStep.next(saveUserStep);

    const stepFunction = new aws_stepfunctions.StateMachine(
      this,
      "StepFunction",
      {
        definition: stepFunctionDefinition
      }
    );
    new CfnOutput(this, "SimplisticE2eStepFunctionArn", {
      value: stepFunction.stateMachineArn
    });
  }
}
