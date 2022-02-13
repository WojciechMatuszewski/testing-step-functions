import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SFNTestingStack } from "../lib/sfn-testing-stack";
import { IAspect } from "aws-cdk-lib";
import { IConstruct } from "constructs";

const app = new cdk.App();

const stack = new SFNTestingStack(app, "SFNTestingStack", {
  synthesizer: new cdk.DefaultStackSynthesizer({
    qualifier: "sfntesting"
  })
});

class DestroyAll implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof cdk.CfnResource) {
      node.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
  }
}

cdk.Aspects.of(stack).add(new DestroyAll());
