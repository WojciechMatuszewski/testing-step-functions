import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class CfnOutput extends cdk.CfnOutput {
  constructor(scope: Construct, id: string, props: cdk.CfnOutputProps) {
    super(scope, id, props);

    /**
     * Ensures that the output name is not prefixed with a random identifier.
     */
    this.overrideLogicalId(id);
  }
}
