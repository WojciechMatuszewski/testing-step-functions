import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CfnOutput } from "./cfn-output";
import { SimplisticE2E } from "./simplistic-e2e";

export class SFNTestingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new CfnOutput(this, "AwsRegion", {
      value: this.region
    });

    new SimplisticE2E(this, "SimplisticE2E");
  }
}
