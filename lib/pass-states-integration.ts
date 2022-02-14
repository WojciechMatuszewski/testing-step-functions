import { aws_stepfunctions } from "aws-cdk-lib";
import { Construct } from "constructs";

export class PassStatesIntegration extends Construct {
  public transformDataStep: aws_stepfunctions.Pass;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.transformDataStep = new aws_stepfunctions.Pass(
      this,
      "TransformDataStep",
      {
        parameters: {
          payload: aws_stepfunctions.JsonPath.stringAt(
            "States.Format('{} {}', $.firstName, $.lastName)"
          )
        }
      }
    );

    // You can imagine the definition being a bit more complex.
    const stepFunctionDefinition = this.transformDataStep;

    const stepFunction = new aws_stepfunctions.StateMachine(
      this,
      "StepFunction",
      {
        definition: stepFunctionDefinition
      }
    );
  }
}
